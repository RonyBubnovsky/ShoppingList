import axios from 'axios';
import { CATEGORIES } from '../constants/categories';

// Base API URL from environment variables
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API methods for items
export const itemsApi = {
  // Get all shopping list items
  getAllItems: async () => {
    const response = await api.get('/items');
    return response.data;
  },
  
  // Get item statistics
  getItemStats: async () => {
    try {
      const response = await api.get('/items/stats');
      return response.data;
    } catch (error) {
      // If the endpoint fails, return null to trigger local calculation
      console.warn('Stats endpoint failed, will calculate locally');
      return null;
    }
  },
  
  // Get statistics for specific items by IDs
  getItemStatsByIds: async (itemIds) => {
    try {
      console.log(`Fetching stats for ${itemIds.length} items`);
      const response = await api.post('/items/stats/by-ids', { ids: itemIds });
      console.log('Stats from server:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Stats by IDs endpoint failed:', error);
      return null;
    }
  },
  
  // Add a new item to the shopping list
  addItem: async (item) => {
    const response = await api.post('/items', item);
    return response.data;
  },
  
  // Parse free text and add item to the shopping list
  parseAndAddItem: async (text) => {
    const response = await api.post('/parse/add', { text });
    return response.data;
  },
  
  // Just parse free text without adding to the shopping list
  parseItemOnly: async (text) => {
    const response = await api.post('/parse', { text });
    return response.data;
  },
  
  // Delete a single item by ID
  deleteItem: async (id) => {
    const response = await api.delete(`/items/${id}`);
    return response.data;
  },
  
  // Delete multiple items by array of IDs
  deleteMultipleItems: async (ids) => {
    const response = await api.delete('/items', { data: { ids } });
    return response.data;
  },
  
  // Toggle purchased status of an item
  toggleItemPurchased: async (id) => {
    // Get current item first to toggle its purchased state
    const currentItemResponse = await api.get(`/items/${id}`);
    const currentItem = currentItemResponse.data;
    const newPurchasedState = !currentItem.purchased;
    
    console.log(`Toggling item ${id} purchased state to ${newPurchasedState}`);
    const response = await api.patch(`/items/${id}/purchase`, { purchased: newPurchasedState });
    console.log("Response from server:", response.data);
    return response.data;
  },
  
  // Mark multiple items as purchased
  updateMultipleItems: async (ids, purchased) => {
    const response = await api.patch('/items/purchase', { ids, purchased });
    return response.data;
  },
};

// API methods for saved lists
export const savedListsApi = {
  // Get all saved lists
  getAllSavedLists: async () => {
    const response = await api.get('/saved-lists');
    return response.data;
  },
  
  // Get a saved list by ID
  getSavedListById: async (id) => {
    const response = await api.get(`/saved-lists/${id}`);
    return response.data;
  },
  
  // Get statistics for a saved list
  getSavedListStats: async (id) => {
    try {
      console.log(`Fetching stats for saved list ${id}`);
      const response = await api.get(`/saved-lists/${id}/stats`);
      console.log('Saved list stats from server:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to get saved list stats:', error);
      return null;
    }
  },
  
  // Create a new saved list
  createSavedList: async (name, itemIds = null) => {
    const response = await api.post('/saved-lists', { name, itemIds });
    return response.data;
  },
  
  // Delete a saved list
  deleteSavedList: async (id) => {
    const response = await api.delete(`/saved-lists/${id}`);
    return response.data;
  },
  
  // Apply a saved list to the current shopping list
  applySavedList: async (id) => {
    console.log(`Applying saved list with ID: ${id}`);
    const response = await api.post(`/saved-lists/${id}/apply`);
    console.log('Response from applySavedList:', response.data);
    
    // Check if we have items and they're properly formatted
    if (response.data && response.data.items) {
      // Make sure all items have their purchased status properly set
      // This is important because we're no longer creating new items in the backend
      const items = response.data.items.map(item => ({
        ...item,
        // Keep the existing purchased status
      }));
      
      console.log(`Processed ${items.length} items from saved list`);
      
      // Save the list ID and stats to localStorage for persistence
      if (response.data.listId) {
        localStorage.setItem('currentListId', response.data.listId);
        
        if (response.data.stats) {
          localStorage.setItem('currentListStats', JSON.stringify(response.data.stats));
        }
      }
      
      return {
        ...response.data,
        items
      };
    }
    
    return response.data;
  },
  
  // Update an existing saved list with current items
  updateSavedList: async (id, itemIds) => {
    console.log(`Updating saved list ${id} with ${itemIds.length} items`);
    const response = await api.put(`/saved-lists/${id}`, { itemIds });
    return response.data;
  }
};

// Categories now come from local constants
export const categoriesApi = {
  // Get all predefined categories
  getCategories: async () => {
    return CATEGORIES;
  },
};

export default api;