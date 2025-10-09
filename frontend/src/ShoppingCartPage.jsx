import { useCart } from './CartContext.jsx';
import { toast } from 'react-toastify';
import { createBeanOrder } from './api';

export default function ShoppingCartPage({ token }) {
  const { cartItems, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = useCart();
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.warn("カートは空です。");
      return;
    }

    const orderData = {
      items: cartItems.map(item => ({ id: item.id, quantity: item.quantity }))
    };

    try {
      const result = await createBeanOrder(orderData);
      toast.success(`注文が完了しました！ (注文ID: ${result.order.order_id})`);
      clearCart();
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
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
              <div className="cart-item-actions">
                <button onClick={() => decreaseQuantity(item.id)}>-</button>
                <button onClick={() => increaseQuantity(item.id)}>+</button>
                <button onClick={() => removeFromCart(item.id)}>削除</button>
              </div>
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