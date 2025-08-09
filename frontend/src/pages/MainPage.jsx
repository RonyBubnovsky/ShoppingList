import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSave, FaShoppingCart, FaTrash, FaCheck, FaWhatsapp, FaUndo, FaPlus } from 'react-icons/fa';
import Header from '../components/Header';
import AddItemForm from '../components/AddItemForm';
import SavedLists from '../components/SavedLists';
import ShoppingItem from '../components/ShoppingItem';
import Notification, { showNotification, NOTIFICATION_TYPES } from '../components/Notification';
import { itemsApi, savedListsApi } from '../services/api';

function MainPage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [listName, setListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentList, setCurrentList] = useState(null);
  const [savedListsVersion, setSavedListsVersion] = useState(0);
  const navigate = useNavigate();

  // Load items from database
  const loadItems = useCallback(async () => {
    try {
      if (currentList) {
        // Load items for specific saved list
        const result = await savedListsApi.applySavedList(currentList.id);
        if (result && result.items) {
          setItems(result.items);
        }
      } else {
        // Load items with null listContext (main list) - always get fresh data
        const allItems = await itemsApi.getAllItems(null);
        console.log(`MainPage: Loaded ${allItems.length} items from database`);
        setItems(allItems);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
      setItems([]);
    }
  }, [currentList]);

  // Load items when component mounts
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Refresh items when user returns to this page (e.g., from shopping page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('MainPage: Window focused, refreshing items to get latest purchase status');
      loadItems();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadItems]);

  

  // Callback for when an item is added
  const handleItemAdded = useCallback((newItem) => {
    if (newItem) {
      // Add the new item to the list
      setItems(prev => [newItem, ...prev]);
    } else {
      // Refresh the list from database
      loadItems();
    }
  }, [loadItems]);

  // If all items were removed while a saved list is applied, clear the current list context
  useEffect(() => {
    if (currentList && items.length === 0) {
      setCurrentList(null);
      // Optionally notify SavedLists to refresh UI if needed elsewhere
      setSavedListsVersion(v => v + 1);
    }
  }, [items, currentList]);

  // Handle delete item
  const handleDeleteItem = async (id) => {
    try {
      const deletedItem = items.find(item => item._id === id);
      await itemsApi.deleteItem(id);
      setItems(items.filter(item => item._id !== id));
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
      const deletedName = deletedItem?.name ? `"${deletedItem.name}" ` : '';
      showNotification(`הפריט ${deletedName}נמחק בהצלחה`, NOTIFICATION_TYPES.SUCCESS);
    } catch (err) {
      console.error('Failed to delete item:', err);
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
  
  // Handle toggling purchased status for a single item
  const handleTogglePurchased = async (id) => {
    try {
      console.log("Toggling purchase status for item:", id);
      const updatedItem = await itemsApi.toggleItemPurchased(id);
      console.log("Updated item from server:", updatedItem);
      
      // Update the item in the state
      const updatedItems = items.map(item => 
        item._id === id ? updatedItem : item
      );
      
      setItems(updatedItems);
      
      // Show notification
      const message = updatedItem.purchased 
        ? `הפריט "${updatedItem.name}" סומן כנקנה` 
        : `הפריט "${updatedItem.name}" סומן כלא נקנה`;
      showNotification(message, NOTIFICATION_TYPES.SUCCESS);
    } catch (err) {
      console.error('Failed to update item:', err);
      showNotification('עדכון סטטוס הפריט נכשל', NOTIFICATION_TYPES.ERROR);
    }
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
    }
  };

  // Go to shopping list
  const goToShoppingList = () => {
    navigate('/shopping-list');
  };
  
  // Share shopping list via WhatsApp
  const handleShareWhatsApp = () => {
    // Filter items to show only unpurchased ones (items to buy)
    const itemsToBuy = items.filter(item => !item.purchased);
    
    let message = "רשימת קניות:\n\n";
    
    if (itemsToBuy.length > 0) {
      itemsToBuy.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit}\n`;
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

  // Show save list modal or update existing list
  const handleShowSaveModal = () => {
    // If we have a current list loaded, update it directly without showing modal
    if (currentList) {
      handleUpdateCurrentList();
    } else {
      // Otherwise show modal to create a new list
      setShowSaveModal(true);
      setListName('');
      setError(null);
    }
  };
  
  // Update the current loaded list
  const handleUpdateCurrentList = async () => {
    if (!currentList) return;
    
    setIsSaving(true);
    
    try {
      // Get current item IDs
      const itemIds = items.map(item => item._id);
      
      // Update the current list with the new items
      await savedListsApi.updateSavedList(currentList.id, itemIds);
      
      // Show success message using our custom notification
      showNotification(`הרשימה "${currentList.name}" עודכנה בהצלחה`, NOTIFICATION_TYPES.SUCCESS);
      
      setIsSaving(false);
    } catch (err) {
      console.error('Failed to update list:', err);
      showNotification('שגיאה בעדכון הרשימה', NOTIFICATION_TYPES.ERROR);
      setIsSaving(false);
    }
  };

  // Handle save list submit
  const handleSaveList = async (e) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      setError('שם רשימה נדרש');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Pass the current item IDs to save only these items
      const itemIds = items.map(item => item._id);
      const result = await savedListsApi.createSavedList(listName, itemIds);
      setShowSaveModal(false);
      setIsSaving(false);
      setListName('');
      
      // Show success notification
      showNotification(`הרשימה "${listName}" נשמרה בהצלחה`, NOTIFICATION_TYPES.SUCCESS);
      
      // Clear items after saving the list
      setItems([]);
      setSelectedItems([]);
      setCurrentList(null);

      // Notify SavedLists to refresh its list and update the count immediately
      setSavedListsVersion(v => v + 1);
    } catch (err) {
      console.error('Failed to save list:', err);
      setError(err.response?.data?.error || 'שגיאה בשמירת הרשימה');
      showNotification('שגיאה בשמירת הרשימה', NOTIFICATION_TYPES.ERROR);
      setIsSaving(false);
    }
  };
  
  // Handle when a saved list is applied
  const handleSavedListApplied = (newItems, listInfo) => {
    // Replace items state completely with the new items
    setItems(newItems);
    
    // Clear any selected items
    setSelectedItems([]);
    
    // Set the current list info
    setCurrentList(listInfo);
  };
  
  // Handle starting a new list
  const handleNewList = () => {
    // Clear all items
    setItems([]);
    // Clear selected items
    setSelectedItems([]);
    // Clear current list
    setCurrentList(null);
  };

  // Toggle purchased status of multiple items
  const handleMarkSelectedPurchased = async (purchased) => {
    if (selectedItems.length === 0) return;
    
    try {
      console.log(`Marking ${selectedItems.length} items as purchased=${purchased}`);
      const result = await itemsApi.updateMultipleItems(selectedItems, purchased);
      console.log("Update result:", result);
      
      // Update the items in the state
      const updatedItems = items.map(item => {
        if (selectedItems.includes(item._id)) {
          return { ...item, purchased };
        }
        return item;
      });
      
      setItems(updatedItems);
      
      // Show notification
      const message = purchased 
        ? `${selectedItems.length} פריטים סומנו כנקנו` 
        : `${selectedItems.length} פריטים סומנו כלא נקנו`;
      showNotification(message, NOTIFICATION_TYPES.SUCCESS);
      
      // Clear selection after marking items
      setSelectedItems([]);
    } catch (err) {
      console.error('Failed to update items:', err);
      showNotification('עדכון הפריטים שנבחרו נכשל', NOTIFICATION_TYPES.ERROR);
    }
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
  
  // Render list of items
  const renderItems = () => {
    if (items.length === 0) {
      return (
        <div className="empty-list">
          <p>רשימת הקניות שלך ריקה. הוסף פריטים כדי להתחיל!</p>
        </div>
      );
    }
    
    return (
      <>
        {renderBulkActions()}
        <ul className="item-list">
          {items.map(item => (
            <ShoppingItem
              key={item._id}
              item={item}
              onDelete={handleDeleteItem}
              onTogglePurchased={handleTogglePurchased}
              isSelected={selectedItems.includes(item._id)}
              onSelectItem={handleSelectItem}
              showPurchaseButton={true}
            />
          ))}
        </ul>
      </>
    );
  };
  
  // Save list modal
  const renderSaveListModal = () => {
    if (!showSaveModal) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>שמור רשימת קניות</h3>
          <form onSubmit={handleSaveList}>
            <div className="form-group">
              <label htmlFor="listName">שם הרשימה:</label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="הכנס שם לרשימה..."
                className="form-input"
                dir="rtl"
              />
            </div>
            
            {error && <div className="form-error">{error}</div>}
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn secondary-btn"
                onClick={() => setShowSaveModal(false)}
              >
                ביטול
              </button>
              <button 
                type="submit" 
                className="btn primary-btn"
                disabled={isSaving}
              >
                {isSaving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="App" dir="rtl">
      <Header />
      <main className="container">
        <AddItemForm onItemAdded={handleItemAdded} currentList={currentList} />
        
        <div className="items-container">
          <div className="items-header">
            <h2>פריטים ברשימה</h2>
            <div className="header-actions">
              <SavedLists 
                onListApplied={handleSavedListApplied} 
                currentList={currentList}
                onNewList={handleNewList}
                refreshVersion={savedListsVersion}
              />
              
              {items.length > 0 && (
                <>
                  <button className="btn btn-primary" onClick={handleSelectAll}>
                    {selectedItems.length === items.length && items.length > 0
                      ? 'בטל בחירה'
                      : 'בחר הכל'
                    }
                  </button>
                  {currentList ? (
                    <button 
                      className="btn save-list-btn" 
                      onClick={handleNewList}
                    >
                      <FaPlus /> רשימה חדשה
                    </button>
                  ) : (
                    <button 
                      className="btn save-list-btn" 
                      onClick={handleShowSaveModal}
                    >
                      <FaSave /> שמור רשימה
                    </button>
                  )}
                  <button 
                    className="btn btn-whatsapp" 
                    onClick={handleShareWhatsApp}
                    title="שתף רשימה בווצאפ"
                  >
                    <FaWhatsapp /> שתף בווצאפ
                  </button>
                  <button 
                    className="btn go-shopping-btn" 
                    onClick={goToShoppingList}
                  >
                    <FaShoppingCart /> צא לקניות
                  </button>
                </>
              )}
            </div>
          </div>
          
          {renderItems()}
        </div>
      </main>
      
      {renderSaveListModal()}
      <Notification />
    </div>
  );
}

export default MainPage;
