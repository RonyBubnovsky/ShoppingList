import React, { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import { FaPlus } from 'react-icons/fa';

// Common unit types for shopping items with Hebrew translations
const UNIT_TYPES = [
  'ק"ג',
  'גרם',
  'יחידות',
  'אריזות',
  'בקבוקים',
  'קופסאות',
  'קרטונים',
  'פחיות',
  'שקיות',
  'ליטר',
];

// Hebrew category translations
const CATEGORY_TRANSLATIONS = {
  'Dairy': 'מוצרי חלב',
  'Meat': 'בשר',
  'Fish': 'דגים',
  'Produce': 'ירקות ופירות',
  'Bakery': 'מאפים',
  'Frozen': 'קפואים',
  'Beverages': 'משקאות',
  'Snacks': 'חטיפים',
  'Sweets': 'ממתקים',
  'Canned Goods': 'שימורים',
  'Household': 'מוצרי בית',
  'Personal Care': 'טיפוח אישי',
  'Grains': 'דגנים',
};

function AddItemForm({ onItemAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'יחידות',
    category: '',
  });
  
  const [categories, setCategories] = useState([]);
  const [translatedCategories, setTranslatedCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize categories when component mounts
  useEffect(() => {
    // No need to fetch - using local constant
    setCategories(CATEGORIES);
    
    // Create translated categories array
    const translated = CATEGORIES.map(cat => ({
      original: cat,
      translated: CATEGORY_TRANSLATIONS[cat] || cat
    }));
    setTranslatedCategories(translated);
    
    // Set default category
    if (CATEGORIES.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: CATEGORIES[0] }));
    }
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('יש להזין שם פריט');
      }

      if (formData.quantity < 1) {
        throw new Error('הכמות חייבת להיות לפחות 1');
      }

      // Add the new item
      const newItem = await itemsApi.addItem(formData);
      
      // Reset form
      setFormData({
        name: '',
        quantity: 1,
        unit: 'יחידות',
        category: formData.category, // Keep the last selected category
      });
      
      // Notify parent component
      if (onItemAdded) {
        onItemAdded(newItem);
      }
      
    } catch (err) {
      setError(err.message || 'הוספת הפריט נכשלה. נא לנסות שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shopping-form">
      <h2 className="form-title">הוספת פריט חדש</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name" className="form-label">שם הפריט</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="form-input"
            placeholder="הזן שם פריט"
            required
            dir="rtl"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity" className="form-label">כמות</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              className="form-input"
              min="1"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="unit" className="form-label">יחידה</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="form-select"
              required
              dir="rtl"
            >
              {UNIT_TYPES.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="category" className="form-label">קטגוריה</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="form-select"
              required
              dir="rtl"
            >
              {categories.map((category, index) => (
                <option key={category} value={category}>
                  {CATEGORY_TRANSLATIONS[category] || category}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isLoading}
        >
          <FaPlus /> הוסף לרשימה
        </button>
      </form>
    </div>
  );
}

export default AddItemForm;