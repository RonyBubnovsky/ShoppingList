import React, { useState } from 'react';
import { itemsApi } from '../services/api';
import { FaPlus, FaCartPlus, FaMagic } from 'react-icons/fa';

function AddItemForm({ onItemAdded }) {
  const [freeText, setFreeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
              placeholder="הכנס פריט או רשימת פריטים מופרדים בפסיקים..."
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
                  <FaPlus /> הוסף לרשימה
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