import { useState, useEffect, useCallback } from 'react';

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);

  // Function to add notification
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Listen for global notification events
  useEffect(() => {
    const handleAddNotification = (event) => {
      const { message, type } = event.detail;
      addNotification(message, type);
    };

    window.addEventListener('addNotification', handleAddNotification);
    
    // Expose addNotification globally for easy access
    window.showNotification = addNotification;

    return () => {
      window.removeEventListener('addNotification', handleAddNotification);
      delete window.showNotification;
    };
  }, [addNotification]);

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification ${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          {notification.message}
          <span className="close-btn">×</span>
        </div>
      ))}
    </div>
  );
}

// Export function to add notifications globally
export const showNotification = (message, type = 'info') => {
  if (window.showNotification) {
    window.showNotification(message, type);
  } else {
    // Fallback: dispatch event
    window.dispatchEvent(new CustomEvent('addNotification', { 
      detail: { message, type } 
    }));
  }
};

// Success notification helper
export const notifySuccess = (message) => {
  showNotification(message, 'success');
};

// Error notification helper
export const notifyError = (message) => {
  showNotification(message, 'error');
};

// Warning notification helper
export const notifyWarning = (message) => {
  showNotification(message, 'warning');
};

