import { useCart } from './CartContext.jsx';
import { toast } from 'react-toastify'; // ★ 1. toast をインポート

// このコンポーネントはApp.jsxからtokenを受け取る必要があります
export default function ShoppingCartPage({ token }) { 
  // ★★★ ここで clearCart を受け取ります！ ★★★
  const { cartItems, clearCart } = useCart();
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      // alert("カートは空です。"); // ← 古い alert
      toast.warn("カートは空です。"); // ★ 2. 警告は toast.warn で

      return;
    }

    const orderData = {
      items: cartItems.map(item => ({ id: item.id, quantity: item.quantity }))
    };

    try {
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bean_orders`, {
            method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 通行証を提示！
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '注文処理に失敗しました');
      }
      
      const result = await response.json();
      // alert(`注文が完了しました！...`); // ← 古い alert
      toast.success(`注文が完了しました！ (注文ID: ${result.order.order_id})`); // ★ 3. 成功は toast.success で

      
      // これで clearCart が正しく呼び出されます
      clearCart(); 

    } catch (err) {
      toast.error(`エラー: ${err.message}`); // ★ 4. エラーは toast.error で
    }
  };

  if (cartItems.length === 0) {
    return <h2>ショッピングカートは空です。</h2>;
  }

  return (
    <div className="page-container">
      <h2>ショッピングカート</h2>
      <ul className="cart-items-list">
        {cartItems.map(item => (
          <li key={item.id} className="cart-item">
            <img src={item.image_url} alt={item.name} className="cart-item-image" />
            <div className="cart-item-details">
              <h4>{item.name}</h4>
              <p>{item.price}円 x {item.quantity}個</p>
            </div>
          </li>
        ))}
      </ul>
      <h3>合計金額: {totalPrice}円</h3>
      <button className="checkout-button" onClick={handleCheckout}>
        レジに進む
      </button>
    </div>
  );
}