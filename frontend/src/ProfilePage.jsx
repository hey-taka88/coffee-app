import { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // ★ 1. toast をインポート
import { getCurrentUser, updateUserMe } from './api'; // API関数をインポート

// このコンポーネントはApp.jsxからtokenを受け取ります
export default function ProfilePage({ token }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '', // メールアドレスは表示専用
    preferred_beans: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. マウント時に現在のユーザー情報を取得してフォームにセットする
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await getCurrentUser();
        // フォームに現在のデータをセット
        setFormData({
          name: userData.name,
          email: userData.email, // emailもセット (表示用)
          preferred_beans: userData.preferred_beans || '' // 未設定の場合を考慮
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, [token]);

  // フォームの入力値をstateに反映するハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 2. フォーム送信時にPATCHリクエストを送信する
  const handleSubmit = async (e) => {
    e.preventDefault(); // ページの再読み込みを防ぐ
    setError(null);

    // emailは更新対象から除外する
    const updateData = {
      name: formData.name,
      preferred_beans: formData.preferred_beans
    };

    try {
      await updateUserMe(updateData);
      toast.success('プロフィール情報を更新しました！'); // ★ 2. toast.success に置き換え

    } catch (err) {
      setError(err.message);
      toast.error(`エラー: ${err.message}`); // ★ 3. エラーは toast.error で表示
    }
  };;


  if (isLoading) return <p>ユーザー情報を読み込み中...</p>;

  return (
    <div className="page-container">
      <h1>プロフィール編集</h1>
      <form onSubmit={handleSubmit} className="profile-form">
        {error && <p className="error">{error}</p>}
        
        <div className="form-group">
          <label>メールアドレス (変更不可)</label>
          <input 
            type="email" 
            name="email"
            value={formData.email} 
            disabled // 変更不可にする
          />
        </div>

        <div className="form-group">
          <label>お名前:</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label>お好みの豆:</label>
          <input 
            type="text" 
            name="preferred_beans"
            value={formData.preferred_beans} 
            onChange={handleChange} 
          />
        </div>

        <button type="submit">更新する</button>
      </form>
    </div>
  );
}