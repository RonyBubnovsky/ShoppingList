import React from 'react';
import { FaTrash, FaCheck, FaUndo } from 'react-icons/fa';

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

function ShoppingItem({ 
  item, 
  onDelete, 
  onTogglePurchased, 
  isSelected,
  onSelectItem 
}) {
  // Handle delete button click
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item.id);
  };
  
  // Handle toggle purchased status
  const handleTogglePurchased = (e) => {
    e.stopPropagation();
    onTogglePurchased(item.id, !item.purchased);
  };

  // Handle item selection for bulk actions
  const handleItemClick = (e) => {
    if (onSelectItem) {
      onSelectItem(item.id);
    }
  };

  // Fix for checkbox click issue - prevent propagation
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelectItem(item.id);
  };

  return (
    <li 
      className={`item-card ${item.purchased ? 'item-purchased' : ''}`}
      onClick={handleItemClick}
      dir="rtl"
    >
      <input 
        type="checkbox" 
        className="item-checkbox" 
        checked={isSelected}
        onChange={handleCheckboxClick}
        onClick={handleCheckboxClick}
      />

      <div className="item-info">
        <span className="item-name">{item.name}</span>
        <span className="item-details">
          <span className="item-category">
            {CATEGORY_TRANSLATIONS[item.category] || item.category}
          </span>
          {item.quantity} {item.unit}
        </span>
      </div>

      <div className="item-actions">
        <button 
          className={`action-btn ${item.purchased ? '' : 'check'}`} 
          onClick={handleTogglePurchased}
          aria-label={item.purchased ? "סמן כלא נקנה" : "סמן כנקנה"}
        >
          {item.purchased ? <FaUndo /> : <FaCheck />}
        </button>
        <button 
          className="action-btn delete" 
          onClick={handleDelete}
          aria-label="מחק פריט"
        >
          <FaTrash />
        </button>
      </div>
    </li>
  );
}

export default ShoppingItem;