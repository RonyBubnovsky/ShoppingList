import React, { useState, useEffect, useRef } from 'react';
import { FaSave, FaTrash, FaPlus, FaCheck } from 'react-icons/fa';
import { savedListsApi } from '../services/api';
import { showNotification, NOTIFICATION_TYPES } from './Notification';

function SavedLists({ onListApplied, currentList: propCurrentList, onNewList, refreshVersion, onListsLoaded, onListsLoadingChange }) {
  const [savedLists, setSavedLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentList, setCurrentList] = useState(null);
  const containerRef = useRef(null);
  
  // Sync with parent component's currentList prop
  useEffect(() => {
    setCurrentList(propCurrentList);
  }, [propCurrentList]);

  // Refetch when parent indicates lists changed
  useEffect(() => {
    if (refreshVersion !== undefined) {
      fetchSavedLists();
    }
  }, [refreshVersion]);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Fetch all saved lists
  const fetchSavedLists = async () => {
    try {
      setIsLoading(true);
      if (onListsLoadingChange) onListsLoadingChange(true);
      const lists = await savedListsApi.getAllSavedLists();
      setSavedLists(lists);
      if (onListsLoaded) {
        onListsLoaded(Array.isArray(lists) ? lists.length : 0);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch saved lists:', err);
      setError('טעינת הרשימות השמורות נכשלה');
    } finally {
      setIsLoading(false);
      if (onListsLoadingChange) onListsLoadingChange(false);
    }
  };

  // Apply a saved list
  const handleApplyList = async (id, listName) => {
    try {
      const result = await savedListsApi.applySavedList(id);
      setShowDropdown(false);
      
      // Set current list
      setCurrentList({ id, name: listName });
      
      // Call the onListApplied callback with the new items
      if (onListApplied && result.items) {
        onListApplied(result.items, { id, name: listName });
      }
    } catch (err) {
      console.error('Failed to apply saved list:', err);
      setError('הוספת הרשימה השמורה נכשלה');
    }
  };

  // Delete a saved list
  const handleDeleteList = async (id, e) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    
    // Find the list name for the notification
    const listToDelete = savedLists.find(list => list._id === id);
    const listName = listToDelete ? listToDelete.name : '';
    
    try {
      // Delete the list and its items
      const result = await savedListsApi.deleteSavedList(id, true);
      console.log('Delete result:', result);
      
      // Update the UI
      const updated = savedLists.filter(list => list._id !== id);
      setSavedLists(updated);
      if (onListsLoaded) {
        onListsLoaded(updated.length);
      }

      // If the deleted list is the current active list, clear items in parent and reset current list
      if (currentList && currentList.id === id) {
        if (onListApplied) {
          // Pass null to signal parent to reload main list items (listContext=null)
          onListApplied(null, null);
        }
        setCurrentList(null);
      }
      
      // Show success notification with item count if available
      if (result.itemsDeleted !== undefined) {
        showNotification(
          `הרשימה "${listName}" נמחקה בהצלחה יחד עם ${result.itemsDeleted} פריטים`, 
          NOTIFICATION_TYPES.SUCCESS
        );
      } else {
        showNotification(
          `הרשימה "${listName}" נמחקה בהצלחה`, 
          NOTIFICATION_TYPES.SUCCESS
        );
      }
    } catch (err) {
      console.error('Failed to delete saved list:', err);
      setError('מחיקת הרשימה השמורה נכשלה');
      showNotification('מחיקת הרשימה נכשלה', NOTIFICATION_TYPES.ERROR);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  return (
    <div className="saved-lists" ref={containerRef}>
      <button 
        className={`btn saved-lists-btn ${currentList ? 'active-list' : ''}`}
        onClick={toggleDropdown}
      >
        <FaSave /> 
        {currentList 
          ? (
            <>
              <span className="current-list-name">{currentList.name}</span>
            </>
          ) : (
            <>
              <span>רשימות שמורות</span>
              <span className="saved-lists-count"> ({savedLists.length})</span>
            </>
          )
        }
      </button>
      
      {showDropdown && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <h4>רשימות שמורות</h4>
            <button 
              className="btn new-list-btn" 
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(false);
                if (onNewList) onNewList();
              }}
            >
              <FaPlus /> רשימה חדשה
            </button>
          </div>
          
          {error && <div className="dropdown-error">{error}</div>}
          
          {isLoading ? (
            <div className="dropdown-loading">טוען רשימות...</div>
          ) : savedLists.length === 0 ? (
            <div className="dropdown-empty">אין רשימות שמורות</div>
          ) : (
            <ul className="saved-lists-menu">
              {savedLists.map(list => (
                <li 
                  key={list._id} 
                  onClick={() => handleApplyList(list._id, list.name)}
                  className={`saved-list-item ${currentList && currentList.id === list._id ? 'current-list' : ''}`}
                >
                  <div className="saved-list-name">
                    {currentList && currentList.id === list._id 
                      ? <FaCheck className="current-icon" />
                      : <FaPlus className="add-icon" />
                    }
                    {list.name}
                  </div>
                  <button 
                    className="delete-saved-list-btn"
                    onClick={(e) => handleDeleteList(list._id, e)}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default SavedLists;
