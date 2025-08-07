import React from 'react';
import { FaTrash, FaCheck, FaUndo } from 'react-icons/fa';
import { CATEGORY_TRANSLATIONS, CATEGORY_ICONS } from '../constants/categoryIcons';

function ShoppingItem({ 
  item, 
  onDelete, 
  onTogglePurchased, 
  onSelectItem, 
  isSelected 
}) {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const handleTogglePurchased = (e) => {
    e.stopPropagation();
    onTogglePurchased(item.id);
  };

  const handleItemClick = () => {
    onSelectItem(item.id);
  };

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
      <div className="checkbox-container" onClick={handleCheckboxClick}>
        <input 
          type="checkbox" 
          className="item-checkbox" 
          checked={isSelected}
          readOnly
        />
      </div>

      <div className="item-info">
        <span className="item-name">{item.name}</span>
        <span className="item-details">
          <span className="item-category">
            {React.createElement(CATEGORY_ICONS[item.category], { className: 'category-icon' })}
            {CATEGORY_TRANSLATIONS[item.category] || item.category}
          </span>
          {item.quantity} {item.unit}
        </span>
      </div>

      <div className="item-actions">
        <button 
          className={`action-btn ${item.purchased ? 'unpurchase' : 'check'}`} 
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