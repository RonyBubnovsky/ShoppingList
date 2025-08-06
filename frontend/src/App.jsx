import { useState, useCallback } from 'react';
import Header from './components/Header';
import AddItemForm from './components/AddItemForm';
import ShoppingList from './components/ShoppingList';
import './index.css';

function App() {
  const [refreshList, setRefreshList] = useState(false);

  // Callback for when an item is added
  const handleItemAdded = useCallback(() => {
    // Trigger refresh of the shopping list
    setRefreshList(prev => !prev);
  }, []);

  return (
    <div className="App" dir="rtl">
      <Header />
      <main className="container">
        <AddItemForm onItemAdded={handleItemAdded} />
        <ShoppingList key={refreshList} />
      </main>
    </div>
  );
}

export default App;