/**
 * Root application component that gates protected routes behind local JWT
 * expiry checks before any dashboard screen is rendered.
 */
import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage';
import ShoppingPage from './pages/ShoppingPage';
import LoginPage from './pages/LoginPage';
import { authService } from './services/auth';

/**
 * Render the login screen or protected application routes.
 *
 * @returns {JSX.Element} The current authenticated or unauthenticated view.
 */
function App() {
  const [authed, setAuthed] = useState(() => authService.isAuthenticated());

  /**
   * Refresh authentication state after a successful login.
   *
   * @returns {void}
   */
  const handleLogin = () => {
    setAuthed(authService.isAuthenticated());
  };

  if (!authed) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/shopping-list" element={<ShoppingPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
