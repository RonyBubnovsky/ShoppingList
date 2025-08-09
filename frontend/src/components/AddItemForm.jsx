import React, { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';
import { showNotification, NOTIFICATION_TYPES } from './Notification';
import { FaPlus, FaCartPlus, FaMagic } from 'react-icons/fa';

function AddItemForm({ onItemAdded, currentList }) {
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
      const listContextId = currentList ? currentList.id : null;
      const result = await itemsApi.parseAndAddItem(freeText, listContextId);
      console.log("Received result:", result);
      setFreeText('');
      
      // Check if there are multiple items
      if (result && result.items && result.items.length > 0) {
        console.log(`Parsed ${result.items.length} items`);
        
        // Add each item to the parent component
        result.items.forEach(item => {
          onItemAdded(item);
        });

        // Notify user
        const total = result.items.length;
        const createdCount = result.items.filter(i => i.action === 'created').length;
        const updatedCount = result.items.filter(i => i.action === 'updated').length;
        if (total === 1) {
          const single = result.items[0];
          const name = single.name;
          if (single.action === 'updated') {
            showNotification(`הכמות עבור "${name}" עודכנה`, NOTIFICATION_TYPES.SUCCESS);
          } else {
            showNotification(`הפריט "${name}" נוסף בהצלחה`, NOTIFICATION_TYPES.SUCCESS);
          }
        } else {
          if (createdCount > 0 && updatedCount > 0) {
            showNotification(`נוספו ${createdCount} פריטים חדשים ועודכנו ${updatedCount} פריטים קיימים`, NOTIFICATION_TYPES.SUCCESS);
          } else if (createdCount > 0) {
            showNotification(`נוספו ${createdCount} פריטים חדשים`, NOTIFICATION_TYPES.SUCCESS);
          } else if (updatedCount > 0) {
            showNotification(`עודכנו ${updatedCount} פריטים קיימים`, NOTIFICATION_TYPES.SUCCESS);
          } else {
            showNotification(`נוספו/עודכנו ${total} פריטים`, NOTIFICATION_TYPES.SUCCESS);
          }
        }
      } else {
        console.log("No items returned from API");
        showNotification('לא נמצאו פריטים להוספה', NOTIFICATION_TYPES.INFO);
        onItemAdded();
      }
    } catch (error) {
      console.error('Error parsing and adding item:', error);
      const message = 'שגיאה בעיבוד הטקסט. אנא נסה שוב.';
      setError(message);
      showNotification(message, NOTIFICATION_TYPES.ERROR);
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