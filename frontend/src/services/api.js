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
  getAllItems: async (listContextId = null) => {
    let url = '/items';
    
    // If listContextId is explicitly null, we want items with no list context
    // If defined, we want items for that specific list
    url += `?listContext=${listContextId === null ? 'null' : listContextId}`;
    
    const response = await api.get(url);
    return response.data;
  },
  

  
  // Add a new item to the shopping list
  addItem: async (item) => {
    // Only add listContextId if it's explicitly provided in the item
    // Don't automatically take from localStorage as this causes issues
    // when adding items to the main list (which should have null listContext)
    
    const response = await api.post('/items', item);
    return response.data;
  },
  
  // Parse free text and add item to the shopping list
  parseAndAddItem: async (text, listContextId = null) => {
    const requestData = { text };
    
    // Add listContextId to request if provided
    if (listContextId !== null) {
      requestData.listContextId = listContextId;
    }
    
    const response = await api.post('/parse/add', requestData);
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
  
  // Get stats about all saved lists (for UI)
  getAllSavedListsStats: async () => {
    const lists = await savedListsApi.getAllSavedLists();
    return {
      lists,
      total: lists.length,
      hasLists: lists.length > 0
    };
  },
  
  // Get a saved list by ID
  getSavedListById: async (id) => {
    const response = await api.get(`/saved-lists/${id}`);
    return response.data;
  },
  

  
  // Create a new saved list
  createSavedList: async (name, itemIds = null) => {
    const response = await api.post('/saved-lists', { name, itemIds });
    return response.data;
  },
  
  // Delete a saved list
  deleteSavedList: async (id, deleteItems = true) => {
    const response = await api.delete(`/saved-lists/${id}?deleteItems=${deleteItems}`);
    return response.data;
  },
  
  // Apply a saved list to the current shopping list
  applySavedList: async (id) => {
    const response = await api.post(`/saved-lists/${id}/apply`);
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