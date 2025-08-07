# Shopping List App

A simple shopping list application I built for my parents to help them manage grocery shopping more efficiently. The app makes it easy to create and manage shopping lists, track purchased items, and organize products by categories. It features AI-powered text analysis that lets my parents easily add multiple items by typing natural language descriptions.

## Features

- Add, edit, and remove shopping items
- Mark items as purchased with a single click
- Group similar items (automatically increases quantity of existing items)
- Filter items by name or category
- View statistics of purchased/remaining items
- Mobile-friendly design with RTL (right-to-left) support
- AI-powered item parsing using Google Gemini API (add multiple items with plain text)
- Product images automatically fetched via Pexels API

## Project Structure

```
ShoppingList/
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── services/    # API services
│   │   ├── constants/   # Application constants
│   └── ...
└── backend/             # Node.js + Express backend
    ├── controllers/     # Business logic
    ├── routes/          # API routes
    ├── models/          # Database models
    ├── services/        # External services like Gemini API
    ├── prompts/         # AI prompt templates
    └── ...
```

## Technology Stack

### Frontend
- React
- Vite
- Axios

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- Google Gemini API
- Pexels API

## Getting Started

1. Clone the repository
2. Install dependencies for backend and frontend:
   ```
   cd backend && npm install
   cd frontend && npm install
   ```
3. Set up environment files:

   **Frontend (.env file in frontend/ directory):**
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

   **Backend (.env file in backend/ directory):**
   ```
   PORT=5000
   MONGO_URI="your_mongodb_connection_string_here"
   GEMINI_API_KEY="your_gemini_api_key_here"
   PEXELS_API="your_pexels_api_key_here"
   ```

4. Run the application:
   ```
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```
5. Open your browser at http://localhost:5173
