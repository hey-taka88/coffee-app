import { useState, useEffect } from 'react';
import { useCart } from './CartContext.jsx';

// 商品カードのコンポーネント
function ProductCard({ product }) {
  const { addToCart } = useCart(); // 共有の掲示板からaddToCart機能を取得

  return (
    <div className="product-card">
      {/* ... img, h3, p タグは変更なし ... */}
      <div className="product-footer">
        <span>{product.price}円</span>
        <button onClick={() => addToCart(product)}>カートに入れる</button> {/* onClickイベントを追加 */}
      </div>
    </div>
  );
}


// 商品一覧ページのメインコンポーネント
export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products`);
        if (!response.ok) {
          throw new Error('商品の取得に失敗しました');
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (isLoading) return <p>商品情報を読み込んでいます...</p>;
  if (error) return <p>エラー: {error}</p>;

  return (
    <div className="product-page">
      <h2>焙煎豆ストア</h2>
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}