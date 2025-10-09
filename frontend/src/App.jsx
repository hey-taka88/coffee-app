import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify'; // ★ 1. toast をインポートに追加
import 'react-toastify/dist/ReactToastify.css';
import ProductPage from './ProductPage.jsx';
import ShoppingCartPage from './ShoppingCartPage.jsx';
import AdminDashboard from './AdminDashboard.jsx'; // 作成したAdminDashboardをインポート
import { useCart, CartProvider } from './CartContext.jsx'; // main.jsxから移動
import './App.css';
import OrderHistoryPage from './OrderHistoryPage.jsx';
import ProfilePage from './ProfilePage.jsx'; // プロフィールページを追加
import AdminProtectedRoute from './AdminProtectedRoute.jsx'; // ★★★ 1. "門番"をインポート ★★★
import LoginForm from './LoginForm.jsx'; // LoginFormをインポート
import OrderForm from './OrderForm.jsx'; // OrderFormをインポート


function Navigation({ token, onLogout, currentUser }) {
  const { cartItems } = useCart();
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!token) return null;

  return (
    <nav className="navbar">
      <Link to="/delivery">☕️ デリバリー注文</Link>
      <Link to="/store">🫘 焙煎豆ストア</Link>
      <Link to="/my-orders">🗒 注文履歴</Link>
      {/* ★★★ プロフィールへのリンクを追加 ★★★ */}
      <Link to="/profile">👪 プロフィール</Link> 
      <Link to="/cart">🛒 カート ({totalItems})</Link>
      {currentUser?.role === 'admin' && (
        <Link to="/admin" className="admin-link">👑 管理画面</Link>
      )}
      <button onClick={onLogout} className="logout-button">ログアウト</button>
    </nav>
  );
}

import { getCurrentUser } from './api'; // getCurrentUserをインポート

// --- メインのAppコンポーネント（変更あり） ---
function App() {
  const [token, setToken] = useState(localStorage.getItem('coffee_token'));
  const [currentUser, setCurrentUser] = useState(null); // ログインユーザー情報を保持

  // トークンがある場合、ユーザー情報を取得する
  useEffect(() => {
    if (token) {
      const fetchUser = async () => {
        try {
          const userData = await getCurrentUser();
          setCurrentUser(userData);
        } catch (error) {
          // トークンが無効ならログアウトさせる
          localStorage.removeItem('coffee_token');
          setToken(null);
        }
      };
      fetchUser();
    }
  }, [token]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('coffee_token', newToken);
    setToken(newToken);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('coffee_token');
    setToken(null);
    setCurrentUser(null);
  };

  if (!token) {
    return <div className="App"><LoginForm onLoginSuccess={handleLoginSuccess} /></div>;
  }

  return (
    <BrowserRouter>
            <div className="App">
        <ToastContainer // ★★★ 1. ここにToastContainerを追加 ★★★
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        <Navigation token={token} onLogout={handleLogout} currentUser={currentUser} />
        <Routes>
          <Route path="/delivery" element={<OrderForm token={token} />} />
          <Route path="/store" element={<ProductPage />} />
          <Route path="/my-orders" element={<OrderHistoryPage token={token} />} />
          <Route path="/profile" element={<ProfilePage token={token} />} />
          <Route path="/cart" element={<ShoppingCartPage token={token} />} />

          {/* ★★★ 2. /admin ルートを "門番" で囲む ★★★ */}
          <Route 
            path="/admin" 
            element={
              <AdminProtectedRoute currentUser={currentUser}>
                <AdminDashboard token={token} />
              </AdminProtectedRoute>
            } 
          />
          {/* ★★★ ここまで ★★★ */}
          
          <Route path="/" element={<ProductPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}


// CartProviderをmain.jsxではなく、ここでエクスポートする形にすると管理しやすい
export default function AppWrapper() {
  return (
    <CartProvider>
      <App />
    </CartProvider>
  )
}