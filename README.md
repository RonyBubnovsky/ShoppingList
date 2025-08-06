# Shopping List App

A simple shopping list application I built for my parents to help them manage grocery shopping more efficiently. The app makes it easy to create and manage shopping lists, track purchased items, and organize products by categories.

## Features

- Add, edit, and remove shopping items
- Mark items as purchased with a single click
- Group similar items (automatically increases quantity of existing items)
- Filter items by name or category
- View statistics of purchased/remaining items
- Mobile-friendly design with RTL (right-to-left) support

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
    ├── prisma/          # Database schema and migrations
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
- Prisma ORM
- SQLite

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
   DATABASE_URL="file:./prisma/dev.db"
   ```

4. Run the application:
   ```
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```
5. Open your browser at http://localhost:5173