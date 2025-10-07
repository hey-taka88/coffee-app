import { useState, useEffect } from 'react';
import ProfilePage from './ProfilePage.jsx'; // プロフィールページを追加

// このコンポーネントはApp.jsxからtokenを受け取る必要があります
export default function OrderHistoryPage({ token }) {
  const [orders, setOrders] = useState({ delivery_orders: [], bean_orders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/me`, {
              headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('注文履歴の取得に失敗しました');
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderHistory();
  }, [token]); // tokenが変わることはないですが、依存配列に含めておくのが作法です

  if (isLoading) return <p>注文履歴を読み込んでいます...</p>;
  if (error) return <p>エラー: {error}</p>;

  // 両方の注文履歴が空の場合の表示
  if (orders.delivery_orders.length === 0 && orders.bean_orders.length === 0) {
    return <h2>まだ注文はありません。</h2>;
  }


  return (
    <div className="page-container">
      <h1>あなたの注文履歴</h1>

      {/* デリバリー注文履歴 */}
      {orders.delivery_orders.length > 0 && (
        <section className="dashboard-section">
          <h2>デリバリー注文</h2>
          <table>
            <thead>
              <tr>
                <th>注文日</th>
                <th>希望時間</th>
                <th>内容</th>
                <th>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {orders.delivery_orders.map(order => (
                <tr key={order.id}>
                  <td>{order.date}</td>
                  <td>{order.time}</td>
                  <td>{order.beans} ({order.size})</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 焙煎豆注文履歴 */}
      {orders.bean_orders.length > 0 && (
        <section className="dashboard-section">
          <h2>焙煎豆ストアでの注文</h2>
          <table>
            <thead>
              <tr>
                <th>注文ID</th>
                <th>注文日</th>
                <th>合計金額</th>
                <th>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {orders.bean_orders.map(order => (
                <tr key={order.order_id}>
                  <td>{order.order_id}</td>
                  <td>{order.date}</td>
                  <td>{order.total_price}円</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}