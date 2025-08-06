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
    const response = await api.get('/items/stats');
    return response.data;
  },
  
  // Add a new item to the shopping list
  addItem: async (item) => {
    const response = await api.post('/items', item);
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
  toggleItemPurchased: async (id, purchased) => {
    const response = await api.patch(`/items/${id}/purchase`, { purchased });
    return response.data;
  },
  
  // Mark multiple items as purchased
  updateMultipleItems: async (ids, purchased) => {
    const response = await api.patch('/items/purchase', { ids, purchased });
    return response.data;
  },
};

// Categories now come from local constants
export const categoriesApi = {
  // Get all predefined categories
  getCategories: async () => {
    return CATEGORIES;
  },
};

export default api;