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


// --- ログインフォーム（変更なし） ---
function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('taro.yamada@example.com');
  const [password, setPassword] = useState('pw');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    try {
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/token`, {        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('ログインに失敗しました。メールアドレスかパスワードを確認してください。');
      }
      const data = await response.json();
      onLoginSuccess(data.access_token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h1>ログイン</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>メールアドレス:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>パスワード:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">ログイン</button>
      </form>
    </div>
  );
}

// --- ★★★ 注文フォーム（本格実装版）★★★ ---
function OrderForm({ token }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [beans, setBeans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedBean, setSelectedBean] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [selectedSize, setSelectedSize] = useState('M');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authHeader = { 'Authorization': `Bearer ${token}` };
        
const [userResponse, settingsResponse] = await Promise.all([
  fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, { headers: authHeader }),
  fetch(`${import.meta.env.VITE_API_BASE_URL}/settings`)
]);

        if (!userResponse.ok || !settingsResponse.ok) throw new Error('データの取得に失敗');

        const userData = await userResponse.json();
        const settingsData = await settingsResponse.json();
        
        setCurrentUser(userData);
        const beanOptions = Object.keys(settingsData.bean_inventory);
        setBeans(beanOptions);
        if (beanOptions.length > 0) setSelectedBean(beanOptions[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const orderData = { time: selectedTime, size: selectedSize, beans: selectedBean, notes: notes };
    try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders`, {
          method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '注文に失敗しました');
      }
      const result = await response.json();
      // alert(`注文を受け付けました！...`); // ← 古い alert
      toast.success(`注文を受け付けました！ (注文ID: ${result.order.id})`); // ★ 2. toast.success に変更
    } catch (err) {
      // alert(`エラー: ${err.message}`); // ← 古い alert
      toast.error(`エラー: ${err.message}`); // ★ 3. toast.error に変更    }
     }
    };

  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;

  return (
    <>
      <h1>出張コーヒー屋 注文フォーム</h1>
      <p>ようこそ、{currentUser?.name}さん！</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>コーヒー豆の種類:</label>
          <select value={selectedBean} onChange={(e) => setSelectedBean(e.target.value)}>
            {beans.map(bean => <option key={bean} value={bean}>{bean}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>希望時間:</label>
          <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label>サイズ:</label>
          <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
            <option value="S">S</option><option value="M">M</option><option value="L">L</option>
          </select>
        </div>
        <div className="form-group">
          <label>その他（メモ）:</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="submit">この内容で注文する</button>
      </form>
    </>
  );
}

// --- メインのAppコンポーネント（変更あり） ---
function App() {
  const [token, setToken] = useState(localStorage.getItem('coffee_token'));
  const [currentUser, setCurrentUser] = useState(null); // ログインユーザー情報を保持

  // トークンがある場合、ユーザー情報を取得する
  useEffect(() => {
    if (token) {
      const fetchUser = async () => {
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        } else {
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