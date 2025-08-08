import { Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage';
import ShoppingPage from './pages/ShoppingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/shopping-list" element={<ShoppingPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;