import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerUser } from './api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await registerUser({ name, email, password });
      toast.success('ユーザー登録が成功しました！ログインしてください。');
      navigate('/'); // ログインページにリダイレクト
    } catch (err) {
      setError(err.message);
      toast.error(`登録エラー: ${err.message}`);
    }
  };

  return (
    <div className="login-container"> {/* ログインフォームと同じスタイルを再利用 */} 
      <h1>新規ユーザー登録</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>お名前:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>メールアドレス:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>パスワード:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">登録する</button>
      </form>
    </div>
  );
}
