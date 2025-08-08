import React, { useState } from 'react';
import { FaTrash, FaCheck, FaUndo, FaSpinner } from 'react-icons/fa';
import { CATEGORY_TRANSLATIONS, CATEGORY_ICONS } from '../constants/categoryIcons';

function ShoppingItem({ 
  item, 
  onDelete, 
  onTogglePurchased, 
  onSelectItem, 
  isSelected,
  showPurchaseButton = true,
  showDeleteButton = true
}) {
  const [isLoading, setIsLoading] = useState({
    toggle: false,
    delete: false
  });
  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      setIsLoading(prev => ({ ...prev, delete: true }));
      await onDelete(item._id);
    } finally {
      setIsLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleTogglePurchased = async (e) => {
    e.stopPropagation();
    try {
      setIsLoading(prev => ({ ...prev, toggle: true }));
      await onTogglePurchased(item._id);
    } finally {
      setIsLoading(prev => ({ ...prev, toggle: false }));
    }
  };

  const handleItemClick = () => {
    onSelectItem(item._id);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelectItem(item._id);
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
        {showPurchaseButton && (
          <button 
            className={`action-btn ${item.purchased ? 'unpurchase' : 'check'} ${isLoading.toggle ? 'loading' : ''}`} 
            onClick={handleTogglePurchased}
            disabled={isLoading.toggle}
            aria-label={item.purchased ? "סמן כלא נקנה" : "סמן כנקנה"}
          >
            {isLoading.toggle ? 
              <FaSpinner className="spinner" /> : 
              (item.purchased ? <FaUndo /> : <FaCheck />)
            }
          </button>
        )}
        {showDeleteButton && (
          <button 
            className={`action-btn delete ${isLoading.delete ? 'loading' : ''}`}
            onClick={handleDelete}
            disabled={isLoading.delete}
            aria-label="מחק פריט"
          >
            {isLoading.delete ? 
              <FaSpinner className="spinner" /> : 
              <FaTrash />
            }
          </button>
        )}
      </div>
    </li>
  );
}

export default ShoppingItem;