import React, { useState, useEffect } from 'react';
import ShoppingItem from './ShoppingItem';
import { itemsApi } from '../services/api';
import { 
  FaTrash, 
  FaCheck, 
  FaUndo,
  FaShoppingBasket,
  FaListAlt,
  FaCheckCircle
} from 'react-icons/fa';

function ShoppingList() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    purchased: 0,
    unpurchased: 0
  });

  // Fetch all items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  // Calculate stats whenever items change
  useEffect(() => {
    const purchased = items.filter(item => item.purchased).length;
    const total = items.length;
    
    setStats({
      total,
      purchased,
      unpurchased: total - purchased
    });
  }, [items]);

  // Function to fetch items from API
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const data = await itemsApi.getAllItems();
      setItems(data);
      
      // Try to get stats from the server (more efficient for large lists)
      try {
        const statsData = await itemsApi.getItemStats();
        setStats(statsData);
      } catch (statsErr) {
        // If server stats fail, calculate locally
        console.warn('Could not fetch stats from server, calculating locally:', statsErr);
        const purchased = data.filter(item => item.purchased).length;
        setStats({
          total: data.length,
          purchased,
          unpurchased: data.length - purchased
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError('טעינת הפריטים נכשלה. נא לנסות שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a single item
  const handleDeleteItem = async (id) => {
    try {
      await itemsApi.deleteItem(id);
      setItems(items.filter(item => item.id !== id));
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('מחיקת הפריט נכשלה. נא לנסות שוב.');
    }
  };

  // Toggle purchased status of an item
  const handleTogglePurchased = async (id, purchased) => {
    try {
      const updatedItem = await itemsApi.toggleItemPurchased(id, purchased);
      setItems(items.map(item => (
        item.id === id ? updatedItem : item
      )));
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('עדכון סטטוס הפריט נכשל. נא לנסות שוב.');
    }
  };

  // Handle item selection for bulk actions
  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select all items
  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      await itemsApi.deleteMultipleItems(selectedItems);
      setItems(items.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
    } catch (err) {
      console.error('Failed to delete items:', err);
      setError('מחיקת הפריטים שנבחרו נכשלה. נא לנסות שוב.');
    }
  };

  // Mark selected items as purchased/unpurchased
  const handleMarkSelectedPurchased = async (purchased) => {
    if (selectedItems.length === 0) return;
    
    try {
      await itemsApi.updateMultipleItems(selectedItems, purchased);
      setItems(items.map(item => (
        selectedItems.includes(item.id) ? { ...item, purchased } : item
      )));
    } catch (err) {
      console.error('Failed to update items:', err);
      setError('עדכון הפריטים שנבחרו נכשל. נא לנסות שוב.');
    }
  };

  // Handle when a new item is added from the form
  const handleItemAdded = (newItem) => {
    setItems([newItem, ...items]);
  };

  // Render bulk actions section if items are selected
  const renderBulkActions = () => {
    if (selectedItems.length === 0) return null;

    return (
      <div className="bulk-actions" dir="rtl">
        <div className="selection-info">
          {selectedItems.length === 1 
            ? 'פריט אחד נבחר' 
            : `${selectedItems.length} פריטים נבחרו`
          }
        </div>
        <div className="bulk-actions-buttons">
          <button 
            className="btn btn-success" 
            onClick={() => handleMarkSelectedPurchased(true)}
          >
            <FaCheck /> סמן כנקנה
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleMarkSelectedPurchased(false)}
          >
            <FaUndo /> סמן כלא נקנה
          </button>
          <button 
            className="btn btn-danger" 
            onClick={handleDeleteSelected}
          >
            <FaTrash /> מחק נבחרים
          </button>
        </div>
      </div>
    );
  };

  // Render shopping statistics
  const renderShoppingStats = () => {
    return (
      <div className="shopping-stats">
        <div className="stat-item">
          <FaListAlt className="stat-icon" />
          <div className="stat-content">
            <span className="stat-label">סה"כ פריטים:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-item">
          <FaCheckCircle className="stat-icon purchased" />
          <div className="stat-content">
            <span className="stat-label">נקנו:</span>
            <span className="stat-value">{stats.purchased}</span>
          </div>
        </div>
        <div className="stat-item">
          <FaShoppingBasket className="stat-icon unpurchased" />
          <div className="stat-content">
            <span className="stat-label">נותרו לקנות:</span>
            <span className="stat-value">{stats.unpurchased}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="shopping-list" dir="rtl">
      <div className="shopping-list-header">
        <h2 className="shopping-list-title">פריטים ברשימה</h2>
        <button className="btn btn-primary" onClick={handleSelectAll}>
          {selectedItems.length === items.length && items.length > 0
            ? 'בטל בחירה'
            : 'בחר הכל'
          }
        </button>
      </div>

      {!isLoading && items.length > 0 && renderShoppingStats()}

      {error && <div className="error-message">{error}</div>}

      {renderBulkActions()}

      {isLoading ? (
        <div className="loading">טוען פריטים...</div>
      ) : items.length === 0 ? (
        <div className="empty-list">
          <FaShoppingBasket size={40} />
          <p>רשימת הקניות שלך ריקה. הוסף פריטים כדי להתחיל!</p>
        </div>
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <ShoppingItem
              key={item.id}
              item={item}
              onDelete={handleDeleteItem}
              onTogglePurchased={handleTogglePurchased}
              isSelected={selectedItems.includes(item.id)}
              onSelectItem={handleSelectItem}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default ShoppingList;