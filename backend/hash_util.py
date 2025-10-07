from passlib.context import CryptContext

# main.pyで使っている設定と全く同じものを用意
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ハッシュ化したいパスワード
password_to_hash = "pw"

# パスワードをハッシュ化（指紋を作成）
hashed_password = pwd_context.hash(password_to_hash)

print("パスワード:", password_to_hash)
print("生成されたハッシュ値:", hashed_password)