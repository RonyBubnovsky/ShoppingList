import React from 'react';

// Simple header component for the application
function Header() {
  return (
    <header className="app-header">
      <div className="container">
        <h1 className="app-title">רשימת קניות</h1>
        <p>הוסף, עקוב ונהל את פריטי הקניות שלך במקום אחד</p>
      </div>
    </header>
  );
}

export default Header;