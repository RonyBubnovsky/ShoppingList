import React, { useState, useEffect } from 'react';
import ShoppingItem from './ShoppingItem';
import { itemsApi, savedListsApi } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import { 
  FaTrash, 
  FaCheck, 
  FaUndo,
  FaShoppingBasket,
  FaFilter
} from 'react-icons/fa';
import { CATEGORY_TRANSLATIONS } from '../constants/categoryIcons';
import '../styles/ListSelector.css';
import '../styles/ShoppingList.css';

function ShoppingList({ hideOnPurchase = false, showDeleteButton = true, showMarkUnpurchased = true }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSavedLists, setIsLoadingSavedLists] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    categoryFilter: ''
  });

  // Load saved lists when component mounts
  useEffect(() => {
    loadSavedLists();
  }, []);

  // Load saved lists from API
  const loadSavedLists = async () => {
    try {
      setIsLoadingSavedLists(true);
      const lists = await savedListsApi.getAllSavedLists();
      setSavedLists(lists);
    } catch (err) {
      console.error('Failed to load saved lists:', err);
      setError('טעינת רשימות שמורות נכשלה');
    } finally {
      setIsLoadingSavedLists(false);
    }
  };

  // Load items for selected list
  const loadListItems = async (listId) => {
    if (!listId) {
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      const result = await savedListsApi.applySavedList(listId);
      if (result && result.items) {
        const list = savedLists.find(l => l._id === listId);
        setSelectedList(list);
        
        // If hideOnPurchase is true (shopping page), filter out purchased items
        let itemsToShow = result.items;
        if (hideOnPurchase) {
          itemsToShow = result.items.filter(item => !item.purchased);
        }
        
        setItems(itemsToShow);
      }
    } catch (err) {
      console.error('Failed to load list items:', err);
      setError('טעינת פריטי הרשימה נכשלה');
    } finally {
      setIsLoading(false);
    }
  };
  

  
  // Apply filters to items and update filtered items
  useEffect(() => {
    if (!items.length) return;
    
    const { categoryFilter } = filters;
    let result = [...items];
    
    // Always filter out purchased items in the shopping page
    if (hideOnPurchase) {
      result = result.filter(item => !item.purchased);
    }
    
    // Filter by category
    if (categoryFilter) {
      result = result.filter(item => item.category === categoryFilter);
    }
    
    setFilteredItems(result);
  }, [items, filters, hideOnPurchase]);
  
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
      
      // If item was marked as purchased and we're in shopping page, remove it from view
      if (hideOnPurchase && updatedItem.purchased) {
        setItems(items.filter(item => item._id !== id));
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      } else {
        // Regular update for non-purchased items or in main page
        setItems(items.map(item => 
          item._id === id ? updatedItem : item
        ));
      }
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
      
      // If items are being marked as purchased and we're in shopping page, remove them
      if (hideOnPurchase && purchased) {
        setItems(items.filter(item => !selectedItems.includes(item._id)));
      } else {
        // Regular update for non-purchased items or in main page
        setItems(items.map(item => (
          selectedItems.includes(item._id) ? { ...item, purchased } : item
        )));
      }
      
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
    
    // Refresh saved lists to update item counts
    loadSavedLists();
  };

  // Share shopping list via WhatsApp
  const handleShareWhatsApp = () => {
    // Filter items to show only unpurchased ones (items to buy)
    const itemsToBuy = filteredItems.filter(item => !item.purchased);
    
    let message = "רשימת קניות:\n\n";
    
    if (itemsToBuy.length > 0) {
      itemsToBuy.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit}\n`;
      });
    } else {
      message += "כל הפריטים כבר נקנו!";
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp Web/App URL
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
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
          {showMarkUnpurchased && (
            <button 
              className="btn bulk-btn mark-unpurchased" 
              onClick={() => handleMarkSelectedPurchased(false)}
            >
              <FaUndo /> סמן כלא נקנה
            </button>
          )}
          {showDeleteButton && (
            <button 
              className="btn bulk-btn delete-selected" 
              onClick={handleDeleteSelected}
            >
              <FaTrash /> מחק נבחרים
            </button>
          )}
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
          {filters.categoryFilter && (
            <button className="btn btn-sm" onClick={resetFilters}>
              נקה סינון
            </button>
          )}
        </div>
        
        <div className="filter-controls">
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
    <div className="shopping-list shopping-list-container" dir="rtl">
      <div className="shopping-list-header" style={{ direction: 'rtl', textAlign: 'right' }}>
        <h2 className="shopping-list-title" style={{ textAlign: 'right', direction: 'rtl', width: '100%' }}>רשימת קניות</h2>
        {selectedList && (
          <div className="header-actions">
            {items.length > 0 && (
              <button className="btn btn-primary" onClick={handleSelectAll}>
                {selectedItems.length === items.length && items.length > 0
                  ? 'בטל בחירה'
                  : 'בחר הכל'
                }
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {!selectedList ? (
        <div className="list-selector">
          <div className="selector-header">
            <FaShoppingBasket size={40} />
            <h3>בחר רשימת קניות</h3>
            <p>בחר רשימה קיימת כדי להתחיל בקניות</p>
          </div>
          
          {isLoadingSavedLists ? (
            <div className="loading">טוען רשימות...</div>
          ) : savedLists.length === 0 ? (
            <div className="no-lists">
              <p>אין רשימות שמורות. צור רשימה חדשה בדף הראשי.</p>
            </div>
          ) : (
            <div className="lists-grid">
              {savedLists.map((list) => (
                <div 
                  key={list._id} 
                  className="list-card"
                  onClick={() => loadListItems(list._id)}
                >
                  <div className="list-card-header">
                    <FaShoppingBasket />
                    <h4>{list.name}</h4>
                  </div>
                  <div className="list-card-info">
                    <p>{list.itemsCount || list.items?.length || 0} פריטים</p>
                    <small>{new Date(list.createdAt).toLocaleDateString('he-IL')}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="selected-list-info">
            <h3>רשימה: {selectedList.name}</h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setSelectedList(null);
                setItems([]);
              }}
            >
              בחר רשימה אחרת
            </button>
          </div>

          {!isLoading && items.length > 0 && renderFilters()}

          {renderBulkActions()}

          {isLoading ? (
            <div className="loading">טוען פריטים...</div>
          ) : items.length === 0 ? (
            <div className="empty-list">
              <FaShoppingBasket size={40} />
              <p>הרשימה ריקה או שכל הפריטים נקנו.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-list">
              <FaFilter size={40} />
              <p>לא נמצאו פריטים התואמים לסינון שלך.</p>
              <button className="btn btn-primary" onClick={resetFilters}>
                נקה סינון
              </button>
            </div>
          ) : (
            <ul className="item-list">
              {filteredItems.map((item) => (
                <ShoppingItem
                  key={item._id}
                  item={item}
                  onDelete={handleDeleteItem}
                  onTogglePurchased={handleTogglePurchased}
                  isSelected={selectedItems.includes(item._id)}
                  onSelectItem={() => handleSelectItem(item._id)}
                  showDeleteButton={showDeleteButton}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default ShoppingList;