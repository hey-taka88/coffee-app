import { useState } from 'react';
import { toast } from 'react-toastify';
import { updateProductInfo } from './api';

export default function ProductEditModal({ product, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...product });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProductInfo(product.id, {
        ...formData,
        price: parseInt(formData.price),
        stock: parseInt(formData.stock),
      });
      onSave();
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>商品情報編集</h2>
        <div className="form-group">
          <label>商品名:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>説明:</label>
          <textarea name="description" value={formData.description} onChange={handleChange}></textarea>
        </div>
        <div className="form-group">
          <label>価格 (円):</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>在庫数:</label>
          <input type="number" name="stock" value={formData.stock} onChange={handleChange} />
        </div>
        <div className="modal-actions">
          <button onClick={handleSave}>保存</button>
          <button onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
