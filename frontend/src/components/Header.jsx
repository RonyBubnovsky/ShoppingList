import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaShoppingBasket, FaClipboardList, FaHome, FaShoppingCart } from 'react-icons/fa';

// Enhanced header component with icon
function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="header-bg-pattern"></div>
      <div className="container">
        <div className="header-content">
          <div className="header-logo">
            <FaShoppingBasket className="header-icon" />
            <h1 className="app-title">רשימת קניות</h1>
          </div>
          <p className="header-tagline">
            <FaClipboardList className="tagline-icon" /> 
            הוסף, עקוב ונהל את פריטי הקניות שלך במקום אחד
          </p>
        </div>
        <nav className="header-nav">
          <ul>
            <li className={location.pathname === '/' ? 'active' : ''}>
              <Link to="/">
                <FaHome /> ניהול רשימה
              </Link>
            </li>
            <li className={location.pathname === '/shopping-list' ? 'active' : ''}>
              <Link to="/shopping-list">
                <FaShoppingCart /> רשימת קניות
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;