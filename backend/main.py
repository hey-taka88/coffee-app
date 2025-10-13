import os # ★ これを追加
# --- (ファイルの先頭に追加) ---
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import sessionmaker, relationship, Session, joinedload  # ★ ここに joinedload を追加
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager
import datetime as dt
# --- (ここまで) ---
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# --- セキュリティ設定 ---
# SECRET_KEY = "your-secret-key-is-not-secret-at-all" # ← この行をコメントアウトか削除
SECRET_KEY = os.getenv("SECRET_KEY", "a-secure-default-key-for-local-dev") # ★ この行に変更
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
app = FastAPI()

# --- ★★★ データベース設定 (ここから追加) ★★★ ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./coffee.db"
# ↑「coffee.db」という名前のファイルにデータベースを作る、という設定です

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
# --- ★★★ (ここまで追加) ★★★ ---

# --- CORSミドルウェア ---
origins = ["*"]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- モデル定義 ---
class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class User(BaseModel):
    id: int
    email: str
    name: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

class OrderCreate(BaseModel):
    time: str
    size: str
    beans: str
    notes: Optional[str] = ""

class Product(BaseModel):
    id: str
    name: str
    description: str
    price: int
    stock: int
    image_url: str

class CartItem(BaseModel):
    id: str
    quantity: int

class BeanOrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: str = "（テスト用の住所）"
# --- ★★★ SQLAlchemyのデータベースモデル定義 (ここから追加) ★★★ ---
# (Pydanticのモデルと似ていますが、これはDBのテーブル定義です)

class UserModel(Base):
    __tablename__ = "users" # テーブル名を「users」にする
    
    id = Column(Integer, primary_key=True, index=True) # ユーザーID
    name = Column(String, index=True)
    department = Column(String)
    email = Column(String, unique=True, index=True) # メールアドレス (重複不可)
    preferred_beans = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="customer") # 'admin' or 'customer'

class DeliveryBeanStock(BaseModel):
    name: str
    stock: int

class ProductModel(Base):
    __tablename__ = "products" # テーブル名を「products」にする
    
    id = Column(String, primary_key=True, index=True) # 商品ID (bean-001 など)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Integer)
    stock = Column(Integer)
    image_url = Column(String)

# ... (ProductModel の定義のすぐ下に追加) ...

class BeanOrderModel(Base):
    __tablename__ = "bean_orders"
    
    order_id = Column(String, primary_key=True, index=True) # "bo-001" など
    user_id = Column(Integer, ForeignKey("users.id")) # どのユーザーが注文したか
    date = Column(String) # YYYY-MM-DD
    total_price = Column(Integer)
    shipping_address = Column(String)
    status = Column(String, default="paid")
    
    # この注文がどのユーザーに紐付いているか (SQLAlchemyのための設定)
    customer = relationship("UserModel")
    # この注文にどの商品が紐付いているか (下のItemModelと連携)
    items = relationship("BeanOrderItemModel", back_populates="order")

class BeanOrderItemModel(Base):
    __tablename__ = "bean_order_items"
    
    item_id = Column(Integer, primary_key=True, autoincrement=True) # 注文商品ごとのユニークID
    bean_order_id = Column(String, ForeignKey("bean_orders.order_id")) # どの注文か
    product_id = Column(String, ForeignKey("products.id")) # どの商品か
    quantity = Column(Integer)
    
    # この商品がどの注文に紐付いているか (上のBeanOrderModelと連携)
    order = relationship("BeanOrderModel", back_populates="items")
    # この商品がどの商品マスターに紐付いているか
    product = relationship("ProductModel")
# ... (BeanOrderItemModel の定義のすぐ下に追加) ...

class BeanInventoryModel(Base):
    __tablename__ = "bean_inventory" # デリバリー用の豆在庫
    
    name = Column(String, primary_key=True, index=True) # "エチオピア・シダモ" など
    stock = Column(Integer, default=0)

class OrderModel(Base):
    __tablename__ = "orders" # デリバリー注文
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String)
    time = Column(String)
    size = Column(String)
    beans = Column(String, ForeignKey("bean_inventory.name")) # ★ 在庫テーブルに紐付け
    status = Column(String, default="pending")
    notes = Column(String, nullable=True)
    
    customer = relationship("UserModel")
    bean_type = relationship("BeanInventoryModel") # ★ 紐付けを定義

# --- ★★★ (ここまで追加) ★★★ ---


# --- 認証ヘルパー関数 ---
def get_user(db: Session, email: str):
    """
    データベースからメールアドレスでユーザーを検索する（SQLAlchemy版）
    """
    return db.query(UserModel).filter(UserModel.email == email).first()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
# --- ★★★ データベースセッションの依存関係 (ここから追加) ★★★ ---
def get_db():
    """APIリクエストの間だけデータベースセッションを確立する"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    """アプリ起動時にデータベースとテーブルを作成し、テストユーザーを登録する"""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # テストユーザーが存在するか確認
        test_user = db.query(UserModel).filter(UserModel.email == "taro.yamada@example.com").first()
        if not test_user:
            # 存在しない場合、作成する
            hashed_password = pwd_context.hash("pw")
            new_user = UserModel(
                email="taro.yamada@example.com",
                name="山田 太郎",
                hashed_password=hashed_password,
                role="customer" # or "admin"
            )
            db.add(new_user)
            db.commit()
            print("--- Test user created ---")
    finally:
        db.close()
# --- ★★★ (ここまで追加) ★★★ ---

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # db = load_data() <- 古いコードを削除
    user = get_user(db, email=email) # ★ 新しいget_user関数を呼ぶ
    
    if user is None: raise credentials_exception
    
    # Pydanticモデル(User)とSQLAlchemyモデル(UserModel)は別物なので、
    # ここでPydanticモデル(User)に詰め替えてから返す
    return User(id=user.id, email=user.email, name=user.name, role=user.role)


async def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )
    return current_user
# --- ★★★ ここに、抜けていた /users/me エンドポイントを追加 ★★★ ---
@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    ログイン中のユーザー情報を取得する
    """
    return current_user

@app.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """新規ユーザー登録"""
    db_user = get_user(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に使用されています")
    
    hashed_password = pwd_context.hash(user.password)
    db_user = UserModel(email=user.email, name=user.name, hashed_password=hashed_password)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

# --- ★★★ ここまで追加 ★★★ ---
# --- APIエンドポイント ---
@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)  # ★ DBセッションを依存関係として追加
):
    try:
        user = get_user(db, form_data.username)
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"--- LOGIN ERROR ---")
        print(f"Error in login_for_access_token: {e}")
        import traceback
        traceback.print_exc()
        print(f"--- END LOGIN ERROR ---")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred.",
        )

@app.get("/orders/me")
async def read_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ログイン中のユーザーの注文履歴を取得する（完全DB版）"""
    user_id = current_user.id

    # --- デリバリー注文をDBから取得 ---
    user_delivery_orders = db.query(OrderModel).filter(OrderModel.user_id == user_id).all()

    # --- 焙煎豆注文をDBから取得 ---
    user_bean_orders = db.query(BeanOrderModel).filter(BeanOrderModel.user_id == user_id).all()

    return {
        "delivery_orders": user_delivery_orders,
        "bean_orders": user_bean_orders
    }

@app.get("/settings")
def get_settings(db: Session = Depends(get_db)): # ★ DBセッションを追加
    """設定情報を返す（DB + ハードコード版）"""
    
    # 1. デリバリー用の豆在庫をDBから取得
    inventory_items = db.query(BeanInventoryModel).filter(BeanInventoryModel.stock > 0).all()
    # 在庫がある豆の名前のリストを作成
    bean_inventory = {item.name: item.stock for item in inventory_items}
    
    # 2. その他の固定設定（YAMLから移行）
    settings_data = {
        "coffee_shop": {
            "name": "出張コーヒー屋",
            "address": "オフィスビル 3F",
            "contact": "080-1234-5678"
        },
        "operational_hours": {
            "start": "09:00",
            "end": "18:00"
        },
        "bean_inventory": bean_inventory # ★ DBから取得した在庫情報
    }
    
    return settings_data

@app.post("/orders", status_code=201)
async def create_order(
    order: OrderCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    """デリバリー注文を作成する（SQLAlchemy + トランザクション版）"""
    
    try:
        # 1. 在庫テーブルから注文された豆を探す（ロックをかける）
        bean_stock = db.query(BeanInventoryModel).filter(BeanInventoryModel.name == order.beans).with_for_update().first()
        
        # 2. 在庫確認
        if not bean_stock or bean_stock.stock <= 0:
            raise HTTPException(status_code=400, detail=f"{order.beans}の在庫がありません。")
            
        # 3. 在庫を1つ減らす
        bean_stock.stock -= 1
        
        # 4. 注文IDを生成 (DBの総件数から次のIDを決定)
        order_count = db.query(OrderModel).count()
        new_id = (order_count + 1001) # 1001からスタート
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 5. OrderModelオブジェクトを作成
        new_order = OrderModel(
            id=new_id,
            user_id=current_user.id,
            date=today,
            time=order.time,
            size=order.size,
            beans=order.beans,
            status="pending",
            notes=order.notes
        )
        db.add(new_order)
        
        # 6. 変更（在庫減算 + 注文追加）をコミット
        db.commit()
        
        # 7. フロントエンドに返す（Pydanticモデルではなく辞書として返す）
        new_order_data = {
            "id": new_order.id, "user_id": new_order.user_id, "date": new_order.date,
            "time": new_order.time, "size": new_order.size, "beans": new_order.beans,
            "status": new_order.status, "notes": new_order.notes
        }
        
        return {"message": "注文を受け付けました！", "order": new_order_data}

    except Exception as e:
        # 8. エラーが起きたらロールバック
        print(f"😱 デリバリー注文処理中にエラーが発生: {e}")
        db.rollback()
        
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(status_code=500, detail=f"サーバー内部でエラーが発生しました。")

@app.get("/products", response_model=List[Product])
def get_products(db: Session = Depends(get_db)): # ★ DBセッションを追加
    # return load_data().get("products", []) <- 古いコードを削除
    return db.query(ProductModel).all()

@app.post("/bean_orders", status_code=201)
async def create_bean_order(
    order_data: BeanOrderCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    """焙煎豆の注文を作成する (SQLAlchemy + トランザクション版)"""
    
    # 1. トランザクション内で在庫の確認と価格の計算
    try:
        total_price = 0
        
        # 注文IDを先に生成 (YAMLのロジックを踏襲)
        order_count = db.query(BeanOrderModel).count()
        order_id = f"bo-{order_count + 1:03d}"

        # 2. 注文する商品の在庫を確認し、価格を計算
        for item in order_data.items:
            # データベースから商品を取得し、ロックをかける（在庫の同時更新を防ぐ）
            # .with_for_update()は、複数の人が同時に在庫を引くのを防ぐ高度なテクニックです
            product = db.query(ProductModel).filter(ProductModel.id == item.id).with_for_update().first()
            
            if not product or product.stock < item.quantity:
                raise HTTPException(status_code=400, detail=f"商品「{product.name if product else ''}」の在庫が不足しています。")
            
            total_price += product.price * item.quantity
            product.stock -= item.quantity # 在庫をメモリ上で減らす
        
        # 3. BeanOrderModel (注文台帳) を作成
        new_order = BeanOrderModel(
            order_id=order_id,
            user_id=current_user.id,
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            total_price=total_price,
            shipping_address=order_data.shipping_address,
            status="paid"
        )
        db.add(new_order)
        
        # 4. BeanOrderItemModel (注文明細) を作成
        for item in order_data.items:
            new_item = BeanOrderItemModel(
                bean_order_id=order_id,
                product_id=item.id,
                quantity=item.quantity
            )
            db.add(new_item)

        # 5. すべての変更をコミット（保存）
        # (注文、注文アイテム、商品在庫の変更が「すべて同時に」保存されます)
        db.commit()
        
        # 6. 新しく作成された注文情報をフロントエンドに返す
        created_order_dict = {
            "order_id": new_order.order_id,
            "user_id": new_order.user_id,
            "date": new_order.date,
            "items": [item.dict() for item in order_data.items], # 入力データをそのまま返す
            "total_price": new_order.total_price,
            "shipping_address": new_order.shipping_address,
            "status": new_order.status
        }
        
        return {"message": "豆の注文を受け付けました！", "order": created_order_dict}

    except Exception as e:
        # 7. エラーが発生したら、すべての変更を元に戻す（ロールバック）
        print(f"😱 注文処理中にエラーが発生: {e}")
        db.rollback() 
        # 在庫の変更 (product.stock -= ...) もすべて元に戻ります
        
        # HTTPExceptionの場合は、それをそのままフロントに返す
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(status_code=500, detail=f"サーバー内部でエラーが発生しました。")

# --- ★★★ 管理者用の新しいAPI（全在庫取得） ★★★ ---
@app.get("/admin/all_inventory")
async def get_all_inventory(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """焙煎豆とデリバリー豆のすべての在庫を返す"""

    # 焙煎豆ストアの商品在庫
    roasted_beans = db.query(ProductModel).all()

    # デリバリー用の豆在庫
    delivery_beans = db.query(BeanInventoryModel).all()

    return {"roasted_beans": roasted_beans, "delivery_beans": delivery_beans}

# --- ★★★ 管理者専用の新しいAPI ★★★ ---
@app.get("/admin/all_orders")
async def get_all_orders_for_admin(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """すべての注文を返す（完全DB版）"""
    
    # --- デリバリー注文をDBから取得（顧客名もJOIN） ---
    delivery_orders_response = []
    delivery_orders_db = db.query(OrderModel).options(joinedload(OrderModel.customer)).all()
    for order in delivery_orders_db:
        order_dict = {
            "id": order.id, "user_id": order.user_id, "date": order.date,
            "time": order.time, "size": order.size, "beans": order.beans,
            "status": order.status, "notes": order.notes,
            "customer_name": order.customer.name if order.customer else "不明なユーザー"
        }
        delivery_orders_response.append(order_dict)

    # --- 焙煎豆注文をDBから取得（顧客名もJOIN） ---
    bean_orders_response = []
    bean_orders_db = db.query(BeanOrderModel).options(joinedload(BeanOrderModel.customer)).all()
    for order in bean_orders_db:
        order_dict = {
            "order_id": order.order_id, "user_id": order.user_id, "date": order.date,
            "total_price": order.total_price, "shipping_address": order.shipping_address,
            "status": order.status,
            "customer_name": order.customer.name if order.customer else "不明なユーザー"
        }
        bean_orders_response.append(order_dict)

    return {"delivery_orders": delivery_orders_response, "bean_orders": bean_orders_response}

class StatusUpdate(BaseModel):
    status: str

@app.patch("/admin/orders/{order_id}/status")
async def update_delivery_order_status(
    order_id: int,
    status_update: StatusUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    """デリバリー注文のステータスを更新する（SQLAlchemy版）"""
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
            
    if not order:
        raise HTTPException(status_code=404, detail="Delivery order not found")
        
    order.status = status_update.status
    db.commit()

    return {"message": "Delivery order status updated successfully"}

@app.patch("/admin/bean_orders/{order_id}/status")
async def update_bean_order_status(
    order_id: str,
    status_update: StatusUpdate,
    admin_user: User = Depends(get_current_admin_user)
):
    """焙煎豆の注文ステータスを更新する"""
    data = load_data()
    
    order_found = False
    for order in data.get("bean_orders", []):
        if order["order_id"] == order_id:
            order["status"] = status_update.status
            order_found = True
            break
            
    if not order_found:
        raise HTTPException(status_code=404, detail="Bean order not found")
        
    save_data(data)
    return {"message": "Bean order status updated successfully"}
    # --- ★★★ 管理者用の新しいAPI（商品情報更新） ★★★ ---

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    stock: Optional[int] = None

@app.patch("/admin/products/{product_id}")
async def update_product_info(
    product_id: str,
    product_update: ProductUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    """商品情報を更新する（SQLAlchemy版）"""
    # data = load_data() <- 古いコードを削除
    
    # 1. データベースから対象の商品を探す
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
            
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # 2. 更新データがあるフィールドだけを更新する
    update_data = product_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value) # product.name = value や product.price = value と同じ
            
    # 3. 変更をコミット（保存）
    db.commit()
    # 4. 更新後のデータをリフレッシュして返す
    db.refresh(product)
    
    # save_data(data) <- 古いコードを削除
    return {"message": "Product information updated successfully", "product": product}

    # --- ★★★ 顧客向けの新しいAPI（自分の注文履歴） ★★★ ---
@app.get("/orders/me")
async def read_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    """ログイン中のユーザーの注文履歴を取得する（ハイブリッド版）"""
    db_yaml = load_data() # ★ デリバリー注文のためにYAMLはまだ残す
    user_id = current_user.id

    # --- デリバリー注文はまだYAMLから取得 ---
    user_delivery_orders = [
        order for order in db_yaml.get("orders", []) if order["user_id"] == user_id
    ]

    # --- ★ 焙煎豆注文をDBから取得（SQLAlchemy版） ---
    # .all() で取得したSQLAlchemyモデルのリストは、FastAPIが自動でJSONに変換してくれます
    user_bean_orders = db.query(BeanOrderModel).filter(BeanOrderModel.user_id == user_id).all()

    return {
        "delivery_orders": user_delivery_orders,
        "bean_orders": user_bean_orders
    }
    # --- モデル定義のエリアに、更新用のモデルを追加 ---
# (ファイルの上部、他のclass BaseModelの定義が並んでいるところに追加してください)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    # emailはログインIDなので変更不可とし、モデルに含めない
    preferred_beans: Optional[str] = None


# --- エンドポイントのエリアに、以下の関数を追加 ---
# (例: @app.get("/orders/me") の下など)

@app.patch("/users/me", response_model=User)
async def update_user_me(
    user_update: UserUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db) # ★ DBセッションを追加
):
    """ログイン中のユーザーの情報を更新する（SQLAlchemy版）"""
    # data = load_data() <- 古いコードを削除
    
    # 1. データベースから現在のユーザーを探す (IDで探すのが確実)
    user = db.query(UserModel).filter(UserModel.id == current_user.id).first()
            
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. 更新データがあるフィールドだけを更新する
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
        
    # 3. 変更をコミット（保存）
    db.commit()
    # 4. 更新後のデータをリフレッシュ
    db.refresh(user)
    
# ... (update_user_me 関数の最後) ...
    # 5. Pydanticモデル(User)に詰め替えて返す
    return User(id=user.id, email=user.email, name=user.name, role=user.role)