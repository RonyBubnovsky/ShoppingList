# Shopping List Application

A full-stack shopping list application built with React, Vite, Node.js, Express, and SQLite with Prisma ORM.

## Features

- View, add, update, and delete shopping items
- Mark items as purchased
- Batch operations for multiple items
- Categorize items by product type
- Specify quantity and units for each item
- Responsive design for all screen sizes

## Project Structure

```
ShoppingListApp/
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   ├── App.jsx      # Main application component
│   │   └── main.jsx     # Entry point
│   └── ...
└── backend/             # Node.js + Express backend
    ├── prisma/          # Prisma schema and migrations
    ├── index.js         # Express server
    └── ...
```

## Technologies Used

### Frontend
- React (UI library)
- Vite (build tool)
- Axios (HTTP client)
- React Icons (icon library)

### Backend
- Node.js (runtime)
- Express (web framework)
- Prisma (ORM)
- SQLite (database)

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm (v6+)

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## API Endpoints

- `GET /api/items` - Get all items
- `POST /api/items` - Add a new item
- `DELETE /api/items/:id` - Delete an item
- `PATCH /api/items/:id/purchase` - Toggle item purchase status
- `DELETE /api/items` - Delete multiple items
- `PATCH /api/items/purchase` - Update purchase status for multiple items
- `GET /api/categories` - Get all categories

## Database Schema

The application uses a single table for storing shopping list items:

```prisma
model Item {
  id        Int      @id @default(autoincrement())
  name      String
  quantity  Int
  unit      String
  category  String
  purchased Boolean  @default(false)
  createdAt DateTime @default(now())
}
```