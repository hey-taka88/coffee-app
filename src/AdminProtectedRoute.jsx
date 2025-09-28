import { Navigate } from 'react-router-dom';

/**
 * 管理者専用のルートを守るコンポーネント
 * @param {object} props
 * @param {object} props.currentUser - ログイン中のユーザー情報
 * @param {React.ReactNode} props.children - 表示したいコンポーネント（例: <AdminDashboard />）
 */
export default function AdminProtectedRoute({ currentUser, children }) {
  
  // 1. ユーザー情報がまだ読み込まれていない場合
  if (!currentUser) {
    // ユーザー情報を読み込むまで、何も表示しない（またはローディング画面を出す）
    return <p>ユーザー情報を確認中...</p>; 
  }

  // 2. ユーザーが管理者ではない場合
  if (currentUser.role !== 'admin') {
    // ホームページ（ストア）にリダイレクト（強制移動）させる
    // `replace` を指定すると、ブラウザの「戻る」ボタンで戻れなくなり、より安全です
    return <Navigate to="/store" replace />;
  }

  // 3. ユーザーが管理者の場合
  // 子コンポーネント（<AdminDashboard />）をそのまま表示する
  return children;
}