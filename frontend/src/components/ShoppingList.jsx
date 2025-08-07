import React, { useState, useEffect } from 'react';
import ShoppingItem from './ShoppingItem';
import { itemsApi } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import { 
  FaTrash, 
  FaCheck, 
  FaUndo,
  FaShoppingBasket,
  FaListAlt,
  FaCheckCircle,
  FaFilter,
  FaSearch
} from 'react-icons/fa';
import { CATEGORY_TRANSLATIONS } from '../constants/categoryIcons';

function ShoppingList() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    purchased: 0,
    unpurchased: 0
  });
  const [filters, setFilters] = useState({
    nameFilter: '',
    categoryFilter: ''
  });

  // Fetch all items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);
  
  // Apply filters to items and update filtered items
  useEffect(() => {
    if (!items.length) return;
    
    const { nameFilter, categoryFilter } = filters;
    let result = [...items];
    
    // Filter by name (case insensitive)
    if (nameFilter) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    
    // Filter by category
    if (categoryFilter) {
      result = result.filter(item => item.category === categoryFilter);
    }
    
    setFilteredItems(result);
  }, [items, filters]);

  // Calculate stats whenever filtered items change
  useEffect(() => {
    const purchased = filteredItems.filter(item => item.purchased).length;
    const total = filteredItems.length;
    
    setStats({
      total,
      purchased,
      unpurchased: total - purchased
    });
  }, [filteredItems]);

  // Function to fetch items from API
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const data = await itemsApi.getAllItems();
      setItems(data);
      setFilteredItems(data);
      
      // Calculate stats (either from server or locally)
      const statsData = await itemsApi.getItemStats();
      if (statsData) {
        // Use server-provided stats
        setStats(statsData);
      } else {
        // Calculate locally
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
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({
      nameFilter: '',
      categoryFilter: ''
    });
  };

  // Delete a single item
  const handleDeleteItem = async (id) => {
    try {
      await itemsApi.deleteItem(id);
      setItems(items.filter(item => item._id !== id));
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('מחיקת הפריט נכשלה. נא לנסות שוב.');
    }
  };

  // Toggle purchased status of an item
  const handleTogglePurchased = async (id) => {
    try {
      const updatedItem = await itemsApi.toggleItemPurchased(id);
      setItems(items.map(item => (
        item._id === id ? updatedItem : item
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
      setSelectedItems(items.map(item => item._id));
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      await itemsApi.deleteMultipleItems(selectedItems);
      setItems(items.filter(item => !selectedItems.includes(item._id)));
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
        selectedItems.includes(item._id) ? { ...item, purchased } : item
      )));
      // Clear selection after marking items
      setSelectedItems([]);
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
            className="btn bulk-btn mark-purchased" 
            onClick={() => handleMarkSelectedPurchased(true)}
          >
            <FaCheck /> סמן כנקנה
          </button>
          <button 
            className="btn bulk-btn mark-unpurchased" 
            onClick={() => handleMarkSelectedPurchased(false)}
          >
            <FaUndo /> סמן כלא נקנה
          </button>
          <button 
            className="btn bulk-btn delete-selected" 
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

  // Render filters section
  const renderFilters = () => {
    return (
      <div className="filter-section">
        <div className="filter-title">
          <FaFilter /> סינון פריטים
          {(filters.nameFilter || filters.categoryFilter) && (
            <button className="btn btn-sm" onClick={resetFilters}>
              נקה סינון
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="nameFilter" className="filter-label">
              <FaSearch /> חיפוש לפי שם
            </label>
            <input
              type="text"
              id="nameFilter"
              name="nameFilter"
              value={filters.nameFilter}
              onChange={handleFilterChange}
              className="form-input filter-input"
              placeholder="הקלד שם פריט..."
              dir="rtl"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="categoryFilter" className="filter-label">
              <FaFilter /> סינון לפי קטגוריה
            </label>
            <select
              id="categoryFilter"
              name="categoryFilter"
              value={filters.categoryFilter}
              onChange={handleFilterChange}
              className="form-select filter-input"
              dir="rtl"
            >
              <option value="">כל הקטגוריות</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {CATEGORY_TRANSLATIONS[category] || category}
                </option>
              ))}
            </select>
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

      {!isLoading && items.length > 0 && renderFilters()}

      {renderBulkActions()}

      {isLoading ? (
        <div className="loading">טוען פריטים...</div>
      ) : items.length === 0 ? (
        <div className="empty-list">
          <FaShoppingBasket size={40} />
          <p>רשימת הקניות שלך ריקה. הוסף פריטים כדי להתחיל!</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-list">
          <FaSearch size={40} />
          <p>לא נמצאו פריטים התואמים לחיפוש שלך.</p>
          <button className="btn btn-primary" onClick={resetFilters}>
            נקה סינון
          </button>
        </div>
      ) : (
        <ul className="item-list">
          {filteredItems.map((item) => (
            <ShoppingItem
              key={item.id}
              item={item}
              onDelete={handleDeleteItem}
              onTogglePurchased={handleTogglePurchased}
              isSelected={selectedItems.includes(item._id)}
              onSelectItem={() => handleSelectItem(item._id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default ShoppingList;