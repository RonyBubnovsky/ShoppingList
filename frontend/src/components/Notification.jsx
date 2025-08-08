import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import '../styles/Notification.css';

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
};

// Global notification management
let notificationCallback = () => {};

// Function to show notification from anywhere in the app
export const showNotification = (message, type = NOTIFICATION_TYPES.INFO, duration = 3000) => {
  notificationCallback(message, type, duration);
};

function Notification() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState(NOTIFICATION_TYPES.INFO);
  const [timeoutId, setTimeoutId] = useState(null);

  // Register the callback to show notifications
  useEffect(() => {
    notificationCallback = (message, type, duration) => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set the notification properties
      setMessage(message);
      setType(type);
      setVisible(true);

      // Auto-hide after duration
      const id = setTimeout(() => {
        setVisible(false);
      }, duration);
      
      setTimeoutId(id);
    };

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Handle manual close
  const handleClose = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setVisible(false);
  };

  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return <FaCheckCircle />;
      case NOTIFICATION_TYPES.ERROR:
        return <FaExclamationCircle />;
      case NOTIFICATION_TYPES.WARNING:
        return <FaExclamationCircle />;
      case NOTIFICATION_TYPES.INFO:
      default:
        return <FaInfoCircle />;
    }
  };

  if (!visible) return null;

  return (
    <div className={`notification notification-${type}`} dir="rtl">
      <div className="notification-icon">
        {getIcon()}
      </div>
      <div className="notification-content">
        {message}
      </div>
      <button className="notification-close" onClick={handleClose}>
        <FaTimes />
      </button>
    </div>
  );
}

export default Notification;
