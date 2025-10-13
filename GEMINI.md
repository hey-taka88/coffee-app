# プロジェクト固有の指示書 (GEMINI.md)

このファイルは、Geminiとの対話を通じて構築された、このプロジェクトに関するセットアップ、開発、デプロイのための指示書です。

## 1. プロジェクト概要

このプロジェクトは、コーヒーのデリバリーと焙煎豆の販売を行うためのWebアプリケーションです。

- **フロントエンド:** React (Vite)
- **バックエンド:** FastAPI (Python)
- **データベース:** SQLite
- **ホスティング:** Render.com

---

## 2. ローカルでの開発

開発を開始する際は、フロントエンドとバックエンド、両方の開発サーバーを起動する必要があります。

### フロントエンド (React)

1. **ディレクトリに移動:**
   ```bash
   cd frontend
   ```

2. **依存関係のインストール (初回のみ):
   ```bash
   npm install
   ```

3. **開発サーバーの起動:**
   ```bash
   npm run dev
   ```
   サーバーは `http://localhost:5173` で起動します。

### バックエンド (FastAPI)

1. **ディレクトリに移動:**
   ```bash
   cd backend
   ```

2. **依存関係のインストール (初回のみ):
   ```bash
   pip3 install -r requirements.txt
   ```

3. **開発サーバーの起動:**
   ```bash
   python3 -m uvicorn main:app --reload
   ```
   サーバーは `http://localhost:8000` で起動します。

---

## 3. デプロイ (Render.com)

このプロジェクトは、GitHubリポジトリの`main`ブランチにプッシュされると、自動的にRender.comにデプロイされます。

### バックエンドサービス

- **サービス名:** `coffee-app-backend`
- **URL:** `https://coffee-app-backend-v96o.onrender.com`
- **設定:**
  - **Root Directory:** `backend`
  - **Build Command:** `pip install -r requirements.txt`
  - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
- **環境変数:**
  - `SECRET_KEY`: JWTの署名に使用する秘密鍵が設定されています。

### フロントエンドサービス

- **サービス名:** `coffee-app-frontend`
- **URL:** `https://coffee-app-frontend-y905.onrender.com`
- **設定:**
  - **Root Directory:** `frontend`
  - **Build Command:** `npm install && npm run build`
  - **Publish Directory:** `dist`
- **環境変数:**
  - `VITE_API_BASE_URL`: バックエンドサービスのURLが設定されています。

---

## 4. データベースについて

- **種類:** SQLite (`coffee.db`)
- **デプロイ先の仕様:** Renderの無料プランではファイルシステムが永続化されないため、サーバーが再起動するたびにデータベースは**空の状態にリセットされます**。
- **初期データ:** この問題を回避するため、バックエンドのサーバー起動時に、テストユーザー (`taro.yamada@example.com` / `pw`) が存在しない場合、自動的にデータベースに登録する処理が `main.py` の `on_startup` 関数に実装されています。

---

## 5. 今後の開発のヒント

- **APIの追加・修正:** バックエンドのAPIロジックは `backend/main.py` にあります。
- **フロントエンドの修正:** フロントエンドのコンポーネントは `frontend/src/` ディレクトリに分割されています。
- **API呼び出しの共通化:** フロントエンドからバックエンドへのAPI呼び出しは、`frontend/src/api.js` にまとめられています。

このファイルが、今後の開発の助けになれば幸いです。
