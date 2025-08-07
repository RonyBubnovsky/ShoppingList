import React, { useState } from 'react';
import { itemsApi } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import { FaPlus, FaCartPlus } from 'react-icons/fa';

function AddItemForm({ onItemAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'יחידה',
    category: 'Dairy',
    purchased: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await itemsApi.addItem(formData);
      setFormData({
        name: '',
        quantity: 1,
        unit: 'יחידה',
        category: 'Dairy',
        purchased: false
      });
      onItemAdded();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  return (
    <div className="add-item-form">
      <div className="form-title">
        <FaCartPlus /> הוסף פריט חדש
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group-name">
            <label htmlFor="name" className="form-label">שם הפריט</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="form-input"
              dir="rtl"
            />
          </div>
          
          <div className="form-group-quantity">
            <label htmlFor="quantity" className="form-label">כמות</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              required
              className="form-input"
              dir="rtl"
            />
          </div>
          
          <div className="form-group-unit">
            <label htmlFor="unit" className="form-label">יחידה</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="form-select"
              dir="rtl"
            >
              <option value="יחידה">יחידה</option>
              <option value="ק״ג">ק״ג</option>
              <option value="גרם">גרם</option>
              <option value="ליטר">ליטר</option>
              <option value="מ״ל">מ״ל</option>
              <option value="חבילה">חבילה</option>
            </select>
          </div>
          
          <div className="form-group-category">
            <label htmlFor="category" className="form-label">קטגוריה</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-select"
              dir="rtl"
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category === 'Dairy' ? 'מוצרי חלב' :
                   category === 'Meat' ? 'בשר' :
                   category === 'Fish' ? 'דגים' :
                   category === 'Produce' ? 'ירקות ופירות' :
                   category === 'Bakery' ? 'מאפים' :
                   category === 'Frozen' ? 'קפואים' :
                   category === 'Beverages' ? 'משקאות' :
                   category === 'Snacks' ? 'חטיפים' :
                   category === 'Sweets' ? 'ממתקים' :
                   category === 'Canned Goods' ? 'שימורים' :
                   category === 'Household' ? 'מוצרי בית' :
                   category === 'Personal Care' ? 'טיפוח אישי' :
                   category === 'Grains' ? 'דגנים' :
                   category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group-submit">
            <button type="submit" className="submit-btn">
              <FaPlus /> הוסף לרשימה
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AddItemForm;