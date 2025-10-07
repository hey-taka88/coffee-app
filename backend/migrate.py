# migrate.py

# 1. main.py から必要なもの（すべてのモデル！）をインポートします
from main import (
    SessionLocal, 
    UserModel, 
    ProductModel, 
    BeanOrderModel,       
    BeanOrderItemModel,   
    BeanInventoryModel,   # ★ 追加
    OrderModel,           # ★ 追加
    load_data
)

def migrate_data():
    """
    coffee_app.yaml からデータを読み込み、
    coffee.db データベースに移行するスクリプト。
    """
    
    # 2. YAMLファイルから全データを読み込みます
    print("YAMLデータを読み込み中...")
    try:
        data = load_data()
        users_data = data.get("users", [])
        products_data = data.get("products", [])
        bean_orders_data = data.get("bean_orders", [])
        # ★ 追加
        inventory_data = data.get("settings", {}).get("bean_inventory", {})
        orders_data = data.get("orders", [])
    except Exception as e:
        print(f"😱 YAMLデータの読み込みに失敗しました: {e}")
        return

    # 3. データベースセッションを開始します
    db = SessionLocal()
    print("データベースセッションを開始しました。")

    try:
        # 4. ユーザーデータを移行します (変更なし)
        print(f"-> {len(users_data)} 件のユーザーデータを移行します...")
        migrated_count = 0
        for user in users_data:
            existing = db.query(UserModel).filter(UserModel.email == user["email"]).first()
            if not existing:
                db.add(UserModel(**user)) # **user で辞書をそのまま渡す
                migrated_count += 1
        print(f"   ... {migrated_count} 件の新規ユーザーを追加しました。")

        # 5. 商品データを移行します (変更なし)
        print(f"-> {len(products_data)} 件の商品データを移行します...")
        migrated_count = 0
        for product in products_data:
            existing = db.query(ProductModel).filter(ProductModel.id == product["id"]).first()
            if not existing:
                db.add(ProductModel(**product))
                migrated_count += 1
        print(f"   ... {migrated_count} 件の新規商品を追加しました。")

        # 6. 焙煎豆の注文データを移行します (変更なし)
        print(f"-> {len(bean_orders_data)} 件の焙煎豆の注文データを移行します...")
        migrated_count = 0
        for order_yaml in bean_orders_data:
            existing = db.query(BeanOrderModel).filter(BeanOrderModel.order_id == order_yaml["order_id"]).first()
            if not existing:
                items_data = order_yaml.pop("items", []) # itemsを辞書から取り出す
                db.add(BeanOrderModel(**order_yaml)) # 注文本体を追加
                for item_yaml in items_data:
                    prod_id = item_yaml.get("product_id", item_yaml.get("id"))
                    if prod_id:
                        db.add(BeanOrderItemModel(
                            bean_order_id=order_yaml["order_id"],
                            product_id=prod_id,
                            quantity=item_yaml["quantity"]
                        ))
                migrated_count += 1
        print(f"   ... {migrated_count} 件の新規焙煎豆注文を追加しました。")
        
        # --- ★★★ ここから追加 ★★★ ---
        # 7. デリバリー用在庫データを移行します
        print(f"-> {len(inventory_data)} 件のデリバリー用在庫を移行します...")
        migrated_count = 0
        for name, stock in inventory_data.items():
            existing = db.query(BeanInventoryModel).filter(BeanInventoryModel.name == name).first()
            if not existing:
                db.add(BeanInventoryModel(name=name, stock=stock))
                migrated_count += 1
        print(f"   ... {migrated_count} 件の新規在庫豆を追加しました。")
        
        # --- ★★★ ここに db.flush() を追加 ★★★ ---
        db.flush() # ★ 在庫の追加をDBに一旦反映させる
        # --- ★★★ ここまで ★★★ ---
        
        
        # 8. デリバリー注文データを移行します
        print(f"-> {len(orders_data)} 件のデリバリー注文を移行します...")
        migrated_count = 0
        for order in orders_data:
            existing = db.query(OrderModel).filter(OrderModel.id == order["id"]).first()
            if not existing:
                # 在庫テーブルにその豆が存在するか確認
                bean_exists = db.query(BeanInventoryModel).filter(BeanInventoryModel.name == order["beans"]).first()
                if bean_exists:
                    db.add(OrderModel(**order))
                    migrated_count += 1
                else:
                    print(f"   ... 警告: 注文ID {order['id']} の豆 '{order['beans']}' が在庫にないため、スキップします。")
        print(f"   ... {migrated_count} 件の新規デリバリー注文を追加しました。")
        # --- ★★★ ここまで追加 ★★★ ---

        # 9. 変更をデータベースに保存（コミット）します
        db.commit()
        print("🎉 データ移行が正常に完了しました！ (コミット完了)")

    except Exception as e:
        # 10. エラーが起きたらロールバック（変更の取り消し）します
        print(f"😱 エラーが発生したため、変更をロールバックします: {e}")
        db.rollback()
    
    finally:
        # 11. 最後にセッションを閉じます
        db.close()
        print("データベースセッションを閉じました。")

# このスクリプトが直接実行された時だけ、migrate_data()関数を実行する
if __name__ == "__main__":
    migrate_data()