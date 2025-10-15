import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBeanOrderDetail } from './api';
import './OrderDetailPage.css'; // 専用のCSSをインポート

// --- Helper Components ---
const StatusBadge = ({ status }) => {
  const statusMap = {
    'paid': { text: '新規受付', color: 'yellow' },
    'shipped': { text: '発送準備中', color: 'blue' },
    'delivered': { text: '完了', color: 'green' },
    'cancelled': { text: 'キャンセル', color: 'gray' },
  };
  const { text, color } = statusMap[status] || { text: status, color: 'gray' };
  return <span className={`badge badge-${color}`}>{text}</span>;
};

const InfoCard = ({ title, children }) => (
  <div className="info-card">
    <h3>{title}</h3>
    {children}
  </div>
);

// --- Main Component ---
export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const data = await getBeanOrderDetail(orderId);
        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (isLoading) return <p>注文データを読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;
  if (!order) return <p>注文が見つかりません。</p>;

  return (
    <div className="page-container order-detail-page">
      <div className="page-header">
        <h1>注文詳細: {order.order_id}</h1>
        <Link to="/admin">← 注文一覧に戻る</Link>
      </div>

      <div className="detail-grid">
        {/* --- Left Column --- */}
        <div className="detail-col-main">
          <InfoCard title="商品詳細">
            <table className="items-table">
              <thead>
                <tr>
                  <th>商品名</th>
                  <th>オプション</th>
                  <th>単価</th>
                  <th>数量</th>
                  <th>小計</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.product_id}>
                    <td>
                      <strong>{item.product_name}</strong>
                      <div className="item-meta">SKU: {item.product_id}</div>
                    </td>
                    <td>
                      <div>挽き目: {item.grind_option}</div>
                      <div className="item-meta">焙煎日: {item.roasting_date || 'N/A'}</div>
                      <div className="item-meta">ロット番号: {item.lot_number || 'N/A'}</div>
                    </td>
                    <td>{item.unit_price}円</td>
                    <td>x {item.quantity}</td>
                    <td>{item.unit_price * item.quantity}円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </InfoCard>

          <InfoCard title="アクション履歴">
            <ul className="timeline">
              {order.history.map(h => (
                <li key={h.id}>
                  <div className="timeline-actor">{h.actor_name}</div>
                  <div className="timeline-action">{h.action}</div>
                  <div className="timeline-timestamp">{new Date(h.timestamp).toLocaleString('ja-JP')}</div>
                </li>
              ))}
            </ul>
          </InfoCard>
        </div>

        {/* --- Right Column --- */}
        <div className="detail-col-side">
          <InfoCard title="注文概要">
            <p><strong>注文日時:</strong> {new Date(order.date).toLocaleDateString('ja-JP')}</p>
            <p><strong>ステータス:</strong> <StatusBadge status={order.status} /></p>
            <p><strong>合計金額:</strong> {order.total_price}円</p>
            <p><strong>決済方法:</strong> {order.payment_method}</p>
            <p><strong>クーポン:</strong> {order.coupon_code || 'なし'}</p>
          </InfoCard>

          <InfoCard title="顧客情報">
            <p><strong>氏名:</strong> {order.customer.name}</p>
            <p><strong>Email:</strong> {order.customer.email}</p>
            {/* <Link to={`/admin/customers/${order.customer.id}`}>全注文履歴を見る</Link> */}
          </InfoCard>

          <InfoCard title="配送情報">
            <p><strong>配送方法:</strong> {order.shipping_method}</p>
            <p><strong>配送先住所:</strong> {order.shipping_address}</p>
            <p><strong>配送業者:</strong> {order.shipping_carrier || '未定'}</p>
            <p><strong>追跡番号:</strong> {order.tracking_number || '未発行'}</p>
          </InfoCard>

          <InfoCard title="業務用メモ">
            <p>{order.internal_notes || 'メモはありません'}</p>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
