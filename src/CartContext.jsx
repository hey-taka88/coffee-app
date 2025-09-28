import { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        // 同じ商品が既にあれば数量を1増やす
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // なければ新しい商品として追加
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };
  /** カートを空にする関数 */
  const clearCart = () => {
    setCartItems([]); // カートの配列を空にするだけ！
  };

  const value = {
    cartItems,
    addToCart,
    clearCart, // ★★★ ここに clearCart を追加します！ ★★★

  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}