import React, { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';
import { FaPlus, FaCartPlus, FaMagic } from 'react-icons/fa';

function AddItemForm({ onItemAdded }) {
  const [freeText, setFreeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Force refresh items with null listContext whenever the component mounts
  // This ensures proper synchronization between pages
  useEffect(() => {
    const refreshItems = async () => {
      try {
        // Check if we're in "new list" mode (just created a list)
        const isNewList = localStorage.getItem('newList');
        
        // If we're in new list mode, don't load items - let the parent handle it
        if (isNewList === 'true') {
          console.log('AddItemForm: In new list mode, skipping item refresh');
          return;
        }
        
        // Check if parent already has items loaded
        const tempItems = localStorage.getItem('tempItems');
        if (tempItems) {
          try {
            const existingItems = JSON.parse(tempItems);
            if (existingItems.length > 0) {
              console.log('AddItemForm: Parent already has items, skipping refresh');
              return;
            }
          } catch (err) {
            console.error('Failed to parse existing tempItems:', err);
          }
        }
        
        // Explicitly get items with null listContext (main list)
        const currentItems = await itemsApi.getAllItems(null);
        console.log(`AddItemForm: Found ${currentItems.length} items with null listContext`);
        
        // Only update if we have items and the callback exists
        if (currentItems && currentItems.length > 0 && onItemAdded) {
          // Pass the items directly to parent component
          onItemAdded(currentItems);
        }
      } catch (err) {
        console.error('Error refreshing items in AddItemForm:', err);
      }
    };
    
    refreshItems();
  }, [onItemAdded]);

  const handleChange = (e) => {
    setFreeText(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!freeText.trim()) {
      setError('יש להזין טקסט');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Sending text to parse:", freeText);
      const result = await itemsApi.parseAndAddItem(freeText);
      console.log("Received result:", result);
      setFreeText('');
      
      // Check if there are multiple items
      if (result && result.items && result.items.length > 0) {
        console.log(`Parsed ${result.items.length} items`);
        
        // Get current items from localStorage
        const tempItems = localStorage.getItem('tempItems');
        let currentItems = [];
        
        if (tempItems) {
          try {
            currentItems = JSON.parse(tempItems);
          } catch (err) {
            console.error('Failed to parse temp items:', err);
          }
        }
        
        // Add all new items
        const updatedItems = [...currentItems, ...result.items];
        localStorage.setItem('tempItems', JSON.stringify(updatedItems));
        
        // If only one item was added, pass it directly
        if (result.items.length === 1) {
          onItemAdded(result.items[0]);
        } else {
          // For multiple items, tell parent to refresh the list
          onItemAdded();
        }
      } else {
        console.log("No items returned from API");
        onItemAdded();
      }
    } catch (error) {
      console.error('Error parsing and adding item:', error);
      setError('שגיאה בעיבוד הטקסט. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-item-form">
      <div className="form-title">
        <FaCartPlus /> הוסף פריט חדש
      </div>
      <div className="free-text-hint">
        <FaMagic /> הכנס פריט בטקסט חופשי, לדוגמה: "עגבניות 3 ק״ג" או "5 ביצים" או "חלב 2 ליטר"
      </div>
      <div className="free-text-hint multi-item-hint">
        <FaMagic /> ניתן להוסיף מספר פריטים בבת אחת! לדוגמה: "עגבניות 3 ק״ג, חלב 2 ליטר, לחם"
      </div>
      <form onSubmit={handleSubmit}>
        <div className="free-text-form">
          <div className="form-group-free-text">
            <input
              type="text"
              id="freeText"
              name="freeText"
              value={freeText}
              onChange={handleChange}
              placeholder="הכנס פריט או פריטים מופרדים בפסיקים..."
              required
              className="form-input form-input-free-text"
              dir="rtl"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group-submit">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>מוסיף...</>
              ) : (
                <>
                  <FaPlus /> הוסף
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default AddItemForm;