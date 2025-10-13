import { useState } from 'react';
import { Link } from 'react-router-dom'; // Linkをインポート
import { login } from './api';

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('taro.yamada@example.com');
  const [password, setPassword] = useState('pw');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
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
      <p className="register-link">
        アカウントをお持ちでないですか？ <Link to="/register">新規登録</Link>
      </p>
    </div>
  );
}
