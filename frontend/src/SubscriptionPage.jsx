import { useState, useEffect } from 'react';
import { getAllSubscriptions } from './api';

// ステータス表示用のバッジコンポーネント
const StatusBadge = ({ status }) => {
  const statusMap = {
    'active': 'green',
    'paused': 'yellow',
    'cancelled': 'gray',
    'payment_failed': 'red',
  };
  const statusTextMap = {
    'active': 'アクティブ',
    'paused': '一時停止中',
    'cancelled': '解約済',
    'payment_failed': '決済失敗中',
  }
  const color = statusMap[status] || 'gray';
  const text = statusTextMap[status] || status;
  return <span className={`badge badge-${color}`}>{text}</span>;
};

export default function SubscriptionPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const data = await getAllSubscriptions();
        setSubscriptions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  if (isLoading) return <p>データを読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;

  return (
    <div className="page-container">
      <h1>サブスクリプション契約管理</h1>
      <section className="dashboard-section">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>契約ID</th>
                <th>顧客名</th>
                <th>契約プラン</th>
                <th>商品内容</th>
                <th>配送間隔</th>
                <th>次回配送予定日</th>
                <th>契約状況</th>
                <th>継続回数</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(contract => (
                <tr key={contract.id}>
                  <td>{contract.id}</td>
                  <td>{contract.customer_name}</td>
                  <td>{contract.plan_name}</td>
                  <td>
                    <ul>
                      {contract.items.map(item => (
                        <li key={item.product_id}>
                          {item.product_name} (x{item.quantity})
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{contract.interval}</td>
                  <td>{contract.next_delivery_date}</td>
                  <td><StatusBadge status={contract.status} /></td>
                  <td>{contract.renewal_count}回</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
