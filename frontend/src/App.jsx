/**
 * Root application component that gates protected routes behind local JWT
 * expiry checks before any dashboard screen is rendered.
 */
import { useEffect, useState } from 'react';
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
  const [authed, setAuthed] = useState(false);

  // On mount, ask the backend whether we're authenticated (cookie-based).
  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await authService.getCurrentUser();
      if (mounted) setAuthed(Boolean(user));
    })();
    return () => { mounted = false; };
  }, []);

  /**
   * Refresh authentication state after a successful login.
   */
  const handleLogin = () => setAuthed(true);

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
