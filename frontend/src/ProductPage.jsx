import { useState, useEffect } from 'react';
import { getProducts } from './api'; // getProductsをインポート
import ProductCard from './ProductCard.jsx'; // ProductCardをインポート

// 商品一覧ページのメインコンポーネント
export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
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