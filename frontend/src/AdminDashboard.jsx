import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // useNavigateをインポート
import { toast } from 'react-toastify';
import { getAllOrders, getAllInventory, updateOrderStatus } from './api';
import ProductEditModal from './ProductEditModal.jsx';

// --- Helper Components for Badges ---
const StatusBadge = ({ status }) => {
  const statusMap = {
    '新規受付': 'yellow',
    '発送準備中': 'blue',
    '完了': 'green',
    'キャンセル': 'gray',
  };
  const color = statusMap[status] || 'gray';
  return <span className={`badge badge-${color}`}>{status}</span>;
};

const PaymentBadge = ({ status }) => {
  const statusMap = {
    '決済済': 'green',
    '未決済': 'gray',
    '失敗': 'red',
  };
  const color = statusMap[status] || 'gray';
  return <span className={`badge badge-${color}`}>{status}</span>;
};

const TypeTag = ({ type }) => {
  const color = type === '都度' ? 'purple' : 'gray';
  return <span className={`badge badge-${color}`}>{type}</span>;
};

// --- Main AdminDashboard Component ---
export default function AdminDashboard({ token }) {
  const [orders, setOrders] = useState({ delivery_orders: [], bean_orders: [] });
  const [roastedBeans, setRoastedBeans] = useState([]);
  const [deliveryBeans, setDeliveryBeans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const navigate = useNavigate(); // useNavigateフックを使用

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, inventoryData] = await Promise.all([getAllOrders(), getAllInventory()]);
      setOrders(ordersData);
      setRoastedBeans(inventoryData.roasted_beans);
      setDeliveryBeans(inventoryData.delivery_beans);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSaveSuccess = () => {
    setEditingProduct(null);
    fetchData();
  };

  const handleStatusChange = async (orderId, newStatus, orderType) => {
    try {
      await updateOrderStatus(orderId, newStatus, orderType);
      toast.success('ステータスを更新しました。');
      fetchData();
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    }
  };

  const handleRowClick = (order) => {
    // 焙煎豆の注文の場合のみ詳細ページに遷移
    if (order.orderTypeForApi === 'bean') {
      navigate(`/admin/orders/${order.id}`);
    }
  };

  const allOrders = useMemo(() => {
    const combined = [
      ...orders.delivery_orders.map(o => ({
        id: o.id,
        type: '都度',
        customerName: o.customer_name,
        orderDate: o.date + ' ' + o.time,
        totalAmount: o.total_price || 'N/A', // デリバリー注文に合計金額がないため
        paymentStatus: '未決済',
        orderStatus: o.status === 'pending' ? '新規受付' : o.status === 'delivered' ? '完了' : 'キャンセル',
        rawStatus: o.status,
        orderTypeForApi: 'delivery',
        statusOptions: ['pending', 'delivered', 'cancelled'],
      })),
      ...orders.bean_orders.map(o => ({
        id: o.order_id,
        type: '都度',
        customerName: o.customer_name,
        orderDate: o.date,
        totalAmount: `${o.total_price}円`,
        paymentStatus: o.status === 'paid' ? '決済済' : '未決済',
        orderStatus: o.status === 'paid' ? '新規受付' : o.status === 'shipped' ? '発送準備中' : '完了',
        rawStatus: o.status,
        orderTypeForApi: 'bean',
        statusOptions: ['paid', 'shipped', 'delivered'],
      })),
    ];
    // 日付で降順にソート
    return combined.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  }, [orders]);

  if (isLoading) return <p>データを読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;

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
        <h2>各種管理ページ</h2>
        <nav>
          <Link to="/admin/subscriptions" className="admin-nav-link">サブスクリプション契約管理</Link>
        </nav>
      </section>

      <section className="dashboard-section">
        <h2>すべての注文</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>注文ID</th>
                <th>種別</th>
                <th>顧客名</th>
                <th>注文日時</th>
                <th>合計金額</th>
                <th>決済状況</th>
                <th>注文ステータス</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map(order => (
                <tr 
                  key={`${order.orderTypeForApi}-${order.id}`}
                  onClick={() => handleRowClick(order)}
                  style={{ cursor: order.orderTypeForApi === 'bean' ? 'pointer' : 'default' }}
                >
                  <td>{order.id}</td>
                  <td><TypeTag type={order.type} /></td>
                  <td>{order.customerName}</td>
                  <td>{order.orderDate}</td>
                  <td>{order.totalAmount}</td>
                  <td><PaymentBadge status={order.paymentStatus} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <StatusBadge status={order.orderStatus} />
                      <select 
                        value={order.rawStatus}
                        onClick={(e) => e.stopPropagation()} // 親のonClickイベントの発火を阻止
                        onChange={(e) => handleStatusChange(order.id, e.target.value, order.orderTypeForApi)}
                      >
                        {order.statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>商品在庫管理</h2>
        <h3>焙煎豆ストア</h3>
        <table>
          <thead>
            <tr>
              <th>商品名</th><th>価格</th><th>在庫数</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {roastedBeans.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.price}円</td>
                <td>{product.stock}個</td>
                <td><button onClick={() => setEditingProduct(product)}>編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ marginTop: '2rem' }}>デリバリー注文用</h3>
        <table>
          <thead>
            <tr>
              <th>豆の種類</th><th>在庫数</th>
            </tr>
          </thead>
          <tbody>
            {deliveryBeans.map(bean => (
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