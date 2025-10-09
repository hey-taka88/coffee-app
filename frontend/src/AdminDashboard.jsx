import { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // ★ 1. toast をインポート
import { getAllOrders, getAllInventory, updateOrderStatus } from './api'; // API関数をインポート
import ProductEditModal from './ProductEditModal.jsx'; // ProductEditModalをインポート

// --- メインのAdminDashboardコンポーネント ---
export default function AdminDashboard({ token }) {
  const [orders, setOrders] = useState({ delivery_orders: [], bean_orders: [] });
  // ★ 1. products を roastedBeans に名前変更し、deliveryBeans を追加
  const [roastedBeans, setRoastedBeans] = useState([]);
  const [deliveryBeans, setDeliveryBeans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);



  useEffect(() => {
    fetchData();
  }, [token]);
  
  const handleSaveSuccess = () => {
    setEditingProduct(null);
    fetchData();
  };

  // --- ★★★ 抜けていたhandleStatusChange関数をここに追加 ★★★ ---
  const handleStatusChange = async (orderId, newStatus, orderType) => {
    try {
      await updateOrderStatus(orderId, newStatus, orderType);
      fetchData(); // 成功したらデータを再取得して画面を更新
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    }
  };


  if (isLoading) return <p>データを読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;

  // --- ★★★ すべての要素を一つのdivで囲むように修正 ★★★ ---
  return (
    <div className="page-container">
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveSuccess}
          token={token}
        />
      )}

      <h1>管理者ダッシュボード</h1>
      
      <section className="dashboard-section">
        <h2>デリバリー注文一覧</h2>
        <table>
          <thead>
            <tr>
              <th>注文ID</th><th>顧客名</th><th>希望時間</th><th>内容</th><th>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {orders.delivery_orders.map(order => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.customer_name}</td>
                <td>{order.time}</td>
                <td>{order.beans} ({order.size})</td>
                <td>
                  <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value, 'delivery')}>
                    <option value="pending">pending</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="dashboard-section">
        <h2>焙煎豆 注文一覧</h2>
        <table>
          <thead>
            <tr>
              <th>注文ID</th><th>顧客名</th><th>合計金額</th><th>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {orders.bean_orders.map(order => (
              <tr key={order.order_id}>
                <td>{order.order_id}</td>
                <td>{order.customer_name}</td>
                <td>{order.total_price}円</td>
                <td>
                  <select value={order.status} onChange={(e) => handleStatusChange(order.order_id, e.target.value, 'bean')}>
                    <option value="paid">paid</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section className="dashboard-section">
        <h2>商品在庫管理</h2>
        
        {/* --- 焙煎豆ストアの在庫テーブル --- */}
        <h3>焙煎豆ストア</h3>
        <table>
          <thead>
            <tr>
              <th>商品名</th><th>価格</th><th>在庫数</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {roastedBeans.map(product => ( // ← roastedBeans を使用
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.price}円</td>
                <td>{product.stock}個</td>
                <td>
                  <button onClick={() => setEditingProduct(product)}>編集</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* --- デリバリー注文用の豆在庫テーブル (新規追加) --- */}
        <h3 style={{ marginTop: '2rem' }}>デリバリー注文用</h3>
        <table>
          <thead>
            <tr>
              <th>豆の種類</th><th>在庫数</th>
            </tr>
          </thead>
          <tbody>
            {deliveryBeans.map(bean => ( // ← deliveryBeans を使用
              <tr key={bean.name}>
                <td>{bean.name}</td>
                <td>{bean.stock}個</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}