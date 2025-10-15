import { useState, useEffect } from 'react';
import { getAllUsers, getProducts, createSubscription } from './api'; // createSubscriptionをインポート
import { toast } from 'react-toastify';

export default function SubscriptionModal({ onClose, onSave }) {
  // Form state
  const [userId, setUserId] = useState('');
  const [planName, setPlanName] = useState('');
  const [interval, setInterval] = useState('monthly');
  const [nextDeliveryDate, setNextDeliveryDate] = useState('');
  const [status, setStatus] = useState('active');
  const [items, setItems] = useState([]); // [{ product_id: string, quantity: int, product_name: string }]
  const [isSaving, setIsSaving] = useState(false);

  // Data for dropdowns
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for adding a new item
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [usersData, productsData] = await Promise.all([
          getAllUsers(),
          getProducts(),
        ]);
        setUsers(usersData);
        setProducts(productsData);
        if (productsData.length > 0) {
          setSelectedProduct(productsData[0].id);
        }
      } catch (error) {
        toast.error(`データ読み込みエラー: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    if (!selectedProduct || items.find(i => i.product_id === selectedProduct)) {
      toast.warn('商品が選択されていないか、既に追加済みです。');
      return;
    }
    const product = products.find(p => p.id === selectedProduct);
    setItems([...items, { 
      product_id: product.id, 
      quantity: parseInt(selectedQuantity, 10),
      product_name: product.name 
    }]);
  };

  const handleRemoveItem = (productId) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (items.length === 0) {
      toast.warn('商品が一つも追加されていません。');
      return;
    }
    setIsSaving(true);
    try {
      const contractData = {
        user_id: parseInt(userId, 10),
        plan_name: planName,
        interval,
        next_delivery_date: nextDeliveryDate,
        status,
        items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      };
      await createSubscription(contractData);
      toast.success('新規契約が正常に作成されました。');
      onSave(); // 親コンポーネントに通知してモーダルを閉じ、リストを更新
    } catch (error) {
      toast.error(`保存エラー: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>新規サブスクリプション契約</h2>
        {isLoading ? <p>Loading...</p> : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>顧客</label>
              <select value={userId} onChange={e => setUserId(e.target.value)} required>
                <option value="" disabled>顧客を選択...</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>契約プラン名</label>
              <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>配送間隔</label>
              <select value={interval} onChange={e => setInterval(e.target.value)}>
                <option value="monthly">毎月</option>
                <option value="bi-weekly">2週間ごと</option>
              </select>
            </div>

            <div className="form-group">
              <label>次回配送予定日</label>
              <input type="date" value={nextDeliveryDate} onChange={e => setNextDeliveryDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>契約状況</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">アクティブ</option>
                <option value="paused">一時停止中</option>
                <option value="cancelled">解約済</option>
              </select>
            </div>

            {/* --- Items Section --- */}
            <div className="form-group">
              <label>商品内容</label>
              <div className="item-selector">
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(e.target.value)} min="1" style={{ width: '60px' }}/>
                <button type="button" onClick={handleAddItem}>追加</button>
              </div>
              <ul className="item-list">
                {items.map(item => (
                  <li key={item.product_id}>
                    {item.product_name} (x{item.quantity})
                    <button type="button" onClick={() => handleRemoveItem(item.product_id)}>&times;</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal-actions">
              <button type="submit" className="save-btn" disabled={isSaving}>
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button type="button" onClick={onClose} disabled={isSaving}>閉じる</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
