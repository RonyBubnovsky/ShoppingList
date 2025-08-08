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

function ShoppingList({ hideOnPurchase = false, showDeleteButton = true }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    categoryFilter: ''
  });

  // Listen for storage events to sync between tabs/pages
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tempItems' && e.newValue) {
        try {
          const parsedItems = JSON.parse(e.newValue);
          setItems(parsedItems);
        } catch (err) {
          console.error('Failed to parse items from storage event:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Fetch all items when component mounts
  useEffect(() => {
    fetchItems();
    
    // Set up interval to refresh items from database every 30 seconds
    // This ensures purchased items status is always up to date
    const refreshInterval = setInterval(() => {
      fetchItems();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Apply filters to items and update filtered items
  useEffect(() => {
    if (!items.length) return;
    
    const { categoryFilter } = filters;
    let result = [...items];
    
    // Always filter out purchased items in the shopping page
    // This ensures purchased items don't appear after refresh
    if (hideOnPurchase) {
      result = result.filter(item => !item.purchased);
      
      // Also update localStorage to keep it in sync
      localStorage.setItem('tempItems', JSON.stringify(result));
    }
    
    // Filter by category
    if (categoryFilter) {
      result = result.filter(item => item.category === categoryFilter);
    }
    
    setFilteredItems(result);
  }, [items, filters, hideOnPurchase]);



  // Function to fetch items from API
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching items, hideOnPurchase:", hideOnPurchase);
      
      // First check if there's a saved current list in localStorage
      const savedCurrentList = localStorage.getItem('currentList');
      
      // Check if there are temporary items from a previous session
      const tempItems = localStorage.getItem('tempItems');
      
      let data = [];
      
      // Always get all items from database first to have the most up-to-date purchase status
      let allItemsFromDB = [];
      try {
        allItemsFromDB = await itemsApi.getAllItems();
        console.log("All items from database:", allItemsFromDB.length);
      } catch (dbErr) {
        console.error('Failed to load all items from database:', dbErr);
      }
      
      // Create a map of items by ID for quick lookup of purchase status
      const purchaseStatusMap = {};
      allItemsFromDB.forEach(item => {
        purchaseStatusMap[item._id] = item.purchased;
      });
      
      // Primary source of truth for which items to show is localStorage or saved list
      if (tempItems) {
        // We have temporary items from localStorage - this is the most up-to-date list
        try {
          let parsedItems = JSON.parse(tempItems);
          console.log("Loaded items from localStorage:", parsedItems.length);
          
          // Update purchase status from database
          parsedItems = parsedItems.map(item => {
            // If we have this item in the database, use its purchase status
            if (purchaseStatusMap.hasOwnProperty(item._id)) {
              return {
                ...item,
                purchased: purchaseStatusMap[item._id]
              };
            }
            return item;
          });
          
          // Save the updated purchase status back to localStorage
          localStorage.setItem('tempItems', JSON.stringify(parsedItems));
          
          // For display, filter out purchased items in shopping page
          if (hideOnPurchase) {
            data = parsedItems.filter(item => !item.purchased);
            console.log(`Showing ${data.length} unpurchased items out of ${parsedItems.length} total`);
          } else {
            data = parsedItems;
          }
        } catch (err) {
          console.error('Failed to parse temporary items:', err);
          localStorage.removeItem('tempItems');
          data = []; // Show empty state if we can't parse temp items
        }
      } else if (savedCurrentList) {
        try {
          // We have a saved list, load items from that list
          const listInfo = JSON.parse(savedCurrentList);
          console.log("Loading saved list:", listInfo);
          
          // Get the saved list items
          const result = await savedListsApi.applySavedList(listInfo.id);
          if (result && result.items) {
            // Update purchase status from database for each item
            const updatedItems = result.items.map(item => {
              // If we have this item in the database, use its purchase status
              if (purchaseStatusMap.hasOwnProperty(item._id)) {
                return {
                  ...item,
                  purchased: purchaseStatusMap[item._id]
                };
              }
              return item;
            });
            
            // Save these items to localStorage for future reference
            localStorage.setItem('tempItems', JSON.stringify(updatedItems));
            
            // For display, filter out purchased items in shopping page
            if (hideOnPurchase) {
              data = updatedItems.filter(item => !item.purchased);
              console.log(`Showing ${data.length} unpurchased items out of ${updatedItems.length} total`);
            } else {
              data = updatedItems;
            }
          }
        } catch (err) {
          console.error('Failed to load saved list:', err);
          setError('טעינת הרשימה השמורה נכשלה. נא לנסות שוב.');
          data = []; // Show empty state if we can't load the saved list
        }
      } else {
              // No saved list or temp items
      // Check if we have any saved lists and use their items
      try {
        const allListsStats = await savedListsApi.getAllSavedListsStats();
        if (allListsStats && allListsStats.lists && allListsStats.lists.length > 0) {
          console.log(`Found ${allListsStats.lists.length} saved lists with ${allListsStats.total} total items`);
          
          // We have saved lists, but none is selected - show empty state
          // This allows the user to explicitly choose which list to work with
          data = [];
          console.log("No list selected, showing empty state");
        } else {
          // No saved lists at all, use all items from the database
          if (hideOnPurchase) {
            data = allItemsFromDB.filter(item => !item.purchased);
            console.log(`Showing ${data.length} unpurchased items out of ${allItemsFromDB.length} total`);
          } else {
            data = allItemsFromDB;
          }
          
          // Save these items to localStorage for future reference
          localStorage.setItem('tempItems', JSON.stringify(allItemsFromDB));
        }
      } catch (err) {
        console.error("Failed to check for saved lists:", err);
        
        // Fallback to showing all items from database
        if (hideOnPurchase) {
          data = allItemsFromDB.filter(item => !item.purchased);
          console.log(`Showing ${data.length} unpurchased items out of ${allItemsFromDB.length} total`);
        } else {
          data = allItemsFromDB;
        }
        
        // Save these items to localStorage for future reference
        localStorage.setItem('tempItems', JSON.stringify(allItemsFromDB));
      }
      }
      
      setItems(data);
      setFilteredItems(data);
      

      
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
      categoryFilter: ''
    });
  };

  // Delete a single item
  const handleDeleteItem = async (id) => {
    try {
      await itemsApi.deleteItem(id);
      const updatedItems = items.filter(item => item._id !== id);
      setItems(updatedItems);
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
      
      // Also update localStorage
      if (updatedItems.length > 0) {
        localStorage.setItem('tempItems', JSON.stringify(updatedItems));
      } else {
        localStorage.removeItem('tempItems');
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('מחיקת הפריט נכשלה. נא לנסות שוב.');
    }
  };

  // Toggle purchased status of an item
  const handleTogglePurchased = async (id) => {
    try {
      console.log("Toggling purchase status for item:", id);
      const updatedItem = await itemsApi.toggleItemPurchased(id);
      console.log("Updated item from server:", updatedItem);
      
      // Get current items from localStorage for consistent updates
      const tempItems = localStorage.getItem('tempItems');
      let allItems = [];
      
      if (tempItems) {
        try {
          allItems = JSON.parse(tempItems);
        } catch (err) {
          console.error('Failed to parse tempItems:', err);
          allItems = [...items]; // Fallback to current items
        }
      } else {
        allItems = [...items];
      }
      
      // Update the purchased status in localStorage for all cases
      allItems = allItems.map(item => {
        if (item._id === id) {
          return { ...item, purchased: updatedItem.purchased };
        }
        return item;
      });
      
      // Save updated items to localStorage
      localStorage.setItem('tempItems', JSON.stringify(allItems));
      
      // If item was marked as purchased and we're in shopping page
      if (hideOnPurchase && updatedItem.purchased) {
        console.log("Item marked as purchased in shopping page, removing from view");
        
        // Remove it from the visible items array
        const visibleItems = items.filter(item => item._id !== id);
        setItems(visibleItems);
        
        // Update filteredItems to remove the purchased item
        setFilteredItems(prevFiltered => 
          prevFiltered.filter(item => item._id !== id)
        );
        
        // Also remove from selected items if it was selected
        setSelectedItems(prev => 
          prev.filter(itemId => itemId !== id)
        );
      } else {
        console.log("Regular update for item:", updatedItem);
        
        // Regular update for non-purchased items or in main page
        const updatedVisibleItems = items.map(item => 
          item._id === id ? updatedItem : item
        );
        
        setItems(updatedVisibleItems);
      }
      

      
      // Don't call fetchItems() here to prevent UI refresh
      // This prevents the item from reappearing in the shopping list
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
      const updatedItems = items.filter(item => !selectedItems.includes(item._id));
      setItems(updatedItems);
      setSelectedItems([]);
      
      // Also update localStorage
      if (updatedItems.length > 0) {
        localStorage.setItem('tempItems', JSON.stringify(updatedItems));
      } else {
        localStorage.removeItem('tempItems');
      }
    } catch (err) {
      console.error('Failed to delete items:', err);
      setError('מחיקת הפריטים שנבחרו נכשלה. נא לנסות שוב.');
    }
  };

  // Mark selected items as purchased/unpurchased
  const handleMarkSelectedPurchased = async (purchased) => {
    if (selectedItems.length === 0) return;
    
    try {
      console.log(`Marking ${selectedItems.length} items as purchased=${purchased}`);
      const result = await itemsApi.updateMultipleItems(selectedItems, purchased);
      console.log("Update result:", result);
      
      // Get current items from localStorage for consistent updates
      const tempItems = localStorage.getItem('tempItems');
      let allItems = [];
      
      if (tempItems) {
        try {
          allItems = JSON.parse(tempItems);
        } catch (err) {
          console.error('Failed to parse tempItems:', err);
          allItems = [...items]; // Fallback to current items
        }
      } else {
        allItems = [...items];
      }
      
      // Update the purchased status in localStorage for all selected items
      allItems = allItems.map(item => {
        if (selectedItems.includes(item._id)) {
          return { ...item, purchased };
        }
        return item;
      });
      
      // Save updated items to localStorage
      localStorage.setItem('tempItems', JSON.stringify(allItems));
      
      // If items are being marked as purchased and we're in shopping page
      if (hideOnPurchase && purchased) {
        console.log("Removing purchased items from shopping view");
        
        // Remove purchased items from the visible items array
        const visibleItems = items.filter(item => !selectedItems.includes(item._id));
        setItems(visibleItems);
        
        // Update filteredItems to remove the purchased items
        setFilteredItems(prevFiltered => 
          prevFiltered.filter(item => !selectedItems.includes(item._id))
        );
      } else {
        console.log("Regular update for items");
        
        // Regular update for non-purchased items or in main page
        const updatedVisibleItems = items.map(item => (
          selectedItems.includes(item._id) ? { ...item, purchased } : item
        ));
        
        setItems(updatedVisibleItems);
      }
      

      
      // Clear selection after marking items
      setSelectedItems([]);
      
      // Don't call fetchItems() here to prevent UI refresh
      // This prevents the items from reappearing in the shopping list
    } catch (err) {
      console.error('Failed to update items:', err);
      setError('עדכון הפריטים שנבחרו נכשל. נא לנסות שוב.');
    }
  };

  // Handle when a new item is added from the form
  const handleItemAdded = (newItem) => {
    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    
    // Also update localStorage
    localStorage.setItem('tempItems', JSON.stringify(updatedItems));
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
          <button 
            className="btn bulk-btn mark-unpurchased" 
            onClick={() => handleMarkSelectedPurchased(false)}
          >
            <FaUndo /> סמן כלא נקנה
          </button>
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
    <div className="shopping-list" dir="rtl">
      <div className="shopping-list-header">
        <h2 className="shopping-list-title">פריטים ברשימה</h2>
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
      </div>



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
              key={item.id}
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
    </div>
  );
}

export default ShoppingList;