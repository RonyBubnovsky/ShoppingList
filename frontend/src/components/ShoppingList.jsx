import React, { useState, useEffect } from 'react';
import ShoppingItem from './ShoppingItem';
import { itemsApi, savedListsApi } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import { showNotification, NOTIFICATION_TYPES } from './Notification';
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
  const [allListItems, setAllListItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSavedLists, setIsLoadingSavedLists] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    categoryFilter: ''
  });
  const [unassignedItemsCount, setUnassignedItemsCount] = useState(0);

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
      // Also fetch count of items with no list context (total, including purchased)
      const unassigned = await itemsApi.getAllItems(null);
      setUnassignedItemsCount(unassigned.length);
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
        setAllListItems(result.items);
        
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
  
  // Load items that are not assigned to any saved list (listContext=null)
  const loadUnassignedItems = async () => {
    try {
      setIsLoading(true);
      const result = await itemsApi.getAllItems(null);
      // Mark selected list as a pseudo list representing unassigned items
      setSelectedList({ _id: 'unassigned', name: 'פריטים ללא רשימה', isUnassigned: true });
      setAllListItems(result);
      let itemsToShow = result;
      if (hideOnPurchase) {
        itemsToShow = result.filter(item => !item.purchased);
      }
      setItems(itemsToShow);
    } catch (err) {
      console.error('Failed to load unassigned items:', err);
      setError('טעינת פריטים ללא רשימה נכשלה');
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
        showNotification(`הפריט "${updatedItem.name}" סומן כנקנה`, NOTIFICATION_TYPES.SUCCESS);
      } else {
        // Regular update for non-purchased items or in main page
        setItems(items.map(item => 
          item._id === id ? updatedItem : item
        ));
        const msg = updatedItem.purchased
          ? `הפריט "${updatedItem.name}" סומן כנקנה`
          : `הפריט "${updatedItem.name}" סומן כלא נקנה`;
        showNotification(msg, NOTIFICATION_TYPES.SUCCESS);
      }
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('עדכון סטטוס הפריט נכשל. נא לנסות שוב.');
      showNotification('עדכון סטטוס הפריט נכשל', NOTIFICATION_TYPES.ERROR);
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
      const deletedCount = selectedItems.length;
      await itemsApi.deleteMultipleItems(selectedItems);
      setItems(items.filter(item => !selectedItems.includes(item._id)));
      setSelectedItems([]);
      showNotification(
        `${deletedCount === 1 ? 'פריט אחד נמחק' : `${deletedCount} פריטים נמחקו`} בהצלחה`,
        NOTIFICATION_TYPES.SUCCESS
      );
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
      
      const message = purchased 
        ? `${selectedItems.length} פריטים סומנו כנקנו`
        : `${selectedItems.length} פריטים סומנו כלא נקנו`;
      showNotification(message, NOTIFICATION_TYPES.SUCCESS);

      // Clear selection after marking items
      setSelectedItems([]);
    } catch (err) {
      console.error('Failed to update items:', err);
      setError('עדכון הפריטים שנבחרו נכשל. נא לנסות שוב.');
      showNotification('עדכון הפריטים שנבחרו נכשל', NOTIFICATION_TYPES.ERROR);
    }
  };

  // Reset all items in the selected list to unpurchased
  const handleResetAllToUnpurchased = async () => {
    try {
      const ids = (allListItems || []).map(item => item._id);
      if (!ids.length) return;
      await itemsApi.updateMultipleItems(ids, false);
      const resetItems = allListItems.map(item => ({ ...item, purchased: false }));
      setAllListItems(resetItems);
      setItems(resetItems);
      setSelectedItems([]);
      showNotification('כל הפריטים אופסו כלא נקנו', NOTIFICATION_TYPES.SUCCESS);
    } catch (err) {
      console.error('Failed to reset items:', err);
      setError('איפוס הפריטים נכשל. נא לנסות שוב.');
      showNotification('איפוס הפריטים נכשל', NOTIFICATION_TYPES.ERROR);
    }
  };

  // Handle when a new item is added from the form
  const handleItemAdded = (newItem) => {
    setItems((previousItems) => {
      const exists = previousItems.some((item) => item._id === newItem._id);
      if (exists) {
        return previousItems.map((item) => (item._id === newItem._id ? newItem : item));
      }
      return [newItem, ...previousItems];
    });
    
    // Refresh saved lists to update item counts
    loadSavedLists();
  };

  // Share shopping list via WhatsApp
  const handleShareWhatsApp = () => {
    // Always include all items (purchased and not). Prefer full list if available
    const listForShare = (allListItems && allListItems.length > 0) ? allListItems : items;
    let message = "רשימת קניות:\n\n";
    if (listForShare.length > 0) {
      listForShare.forEach((item, index) => {
        const statusLabel = item.purchased ? 'נקנה' : 'לא נקנה';
        message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} (${statusLabel})\n`;
      });
    } else {
      message += "רשימת הקניות ריקה!";
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
          ) : (savedLists.length === 0 && unassignedItemsCount === 0) ? (
            <div className="no-lists">
              <p>אין רשימות שמורות. צור רשימה חדשה בדף הראשי.</p>
            </div>
          ) : (
            <div className="lists-grid">
              {unassignedItemsCount > 0 && (
                <div 
                  className="list-card"
                  onClick={loadUnassignedItems}
                >
                  <div className="list-card-header">
                    <FaShoppingBasket />
                    <h4>פריטים ללא רשימה</h4>
                  </div>
                  <div className="list-card-info">
                    <p>{unassignedItemsCount} פריטים</p>
                    <small>רשימת קניות פעילה</small>
                  </div>
                </div>
              )}
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
                setAllListItems([]);
                // Refresh saved lists and unassigned count when returning to selector
                loadSavedLists();
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
              <p>כל הפריטים נקנו.</p>
              {hideOnPurchase && selectedList && allListItems.length > 0 && (
                <button className="reset-all-btn" onClick={handleResetAllToUnpurchased}>
                  <FaUndo /> אפס פריטים לרשימה
                </button>
              )}
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