import React from 'react';
import { FaShoppingBasket, FaClipboardList } from 'react-icons/fa';

// Enhanced header component with icon
function Header() {
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
      </div>
    </header>
  );
}

export default Header;