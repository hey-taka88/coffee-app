import { useCart } from './CartContext.jsx';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  return (
    <div className="product-card">
      <img src={product.image_url} alt={product.name} className="product-image" />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="product-footer">
        <span>{product.price}円</span>
        <button onClick={() => addToCart(product)}>カートに入れる</button>
      </div>
    </div>
  );
}
