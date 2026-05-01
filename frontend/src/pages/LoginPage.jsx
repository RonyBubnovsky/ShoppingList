import { useState } from 'react';
import { authService } from '../services/auth';

export default function LoginPage({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('default');
  const [loading, setLoading] = useState(false);

  const formatRetryDelay = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return '';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0 && remainingSeconds > 0) {
      return `${minutes} דקות ו-${remainingSeconds} שניות`;
    }
    if (minutes > 0) {
      return `${minutes} דקות`;
    }
    return `${remainingSeconds} שניות`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorType('default');
    setLoading(true);
    try {
      await authService.login(phone.trim());
      onLogin();
    } catch (err) {
      if (err && err.code === 'RATE_LIMITED') {
        const delayText = formatRetryDelay(err.retryAfterSeconds);
        setError(delayText
          ? `יותר מדי ניסיונות התחברות. נסה שוב בעוד ${delayText}.`
          : 'יותר מדי ניסיונות התחברות. נסה שוב מאוחר יותר.');
        setErrorType('rate-limit');
      } else {
        setError('מספר טלפון לא מורשה');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>🛒 רשימת קניות</h1>
        <p>הכנס מספר טלפון להתחברות</p>
        <input
          type="tel"
          placeholder="05XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          autoFocus
        />
        {error && (
          <p className={`login-error ${errorType === 'rate-limit' ? 'login-warning' : ''}`}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading || !phone}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>
    </div>
  );
}
