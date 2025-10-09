import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCurrentUser, getSettings, createOrder } from './api'; // API関数をインポート

export default function OrderForm({ token }) {
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
        const [userData, settingsData] = await Promise.all([
          getCurrentUser(),
          getSettings(),
        ]);
        
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
      const result = await createOrder(orderData);
      toast.success(`注文を受け付けました！ (注文ID: ${result.order.id})`);
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
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
