import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          ProjectFlow
        </Link>

        {user && (
          <div className="navbar-actions">
            <span className="navbar-user">Hello, {user.name}</span>

            {/* Notification Bell */}
            <div className="notifications-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="bell-button"
                onClick={toggleDropdown}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </button>

              {showDropdown && (
                <div className="notifications-dropdown">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        className="btn-text"
                        onClick={markAllRead}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <p className="empty-text">No notifications yet.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`notification-item ${
                            !notif.read ? 'unread' : ''
                          }`}
                        >
                          <p className="notif-message">{notif.message}</p>
                          <span className="notif-date">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

