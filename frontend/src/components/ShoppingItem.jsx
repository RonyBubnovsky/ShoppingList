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
        {item.imageUrl ? (
          <div className="item-image-container">
            <div className="loading-spinner"></div>
            <img 
              src={item.imageUrl} 
              alt={item.name} 
              className="item-image"
              onLoad={(e) => {
                // Hide loading spinner when image loads
                e.target.previousElementSibling.style.display = 'none';
                e.target.style.opacity = '1';
              }}
              onError={(e) => {
                // Hide loading spinner and failed image
                e.target.previousElementSibling.style.display = 'none';
                e.target.style.display = 'none';
                // Show category icon as fallback
                e.target.nextElementSibling.style.display = 'flex';
              }} 
              style={{ opacity: '0' }}
            />
            <div className="item-category-fallback" style={{ display: 'none' }}>
              {React.createElement(CATEGORY_ICONS[item.category], { className: 'category-icon-fallback' })}
            </div>
          </div>
        ) : (
          <div className="item-category">
            {React.createElement(CATEGORY_ICONS[item.category], { className: 'category-icon' })}
          </div>
        )}
        <div className="item-text-details">
          <span className="item-name">{item.name}</span>
          <span className="item-details">
            <span className="item-category-text">
              {CATEGORY_TRANSLATIONS[item.category] || item.category}
            </span>
            {item.quantity} {item.unit}
          </span>
        </div>
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