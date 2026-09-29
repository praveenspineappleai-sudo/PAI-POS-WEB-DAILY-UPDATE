//path src/components/layout/Sidebar.js
// Sidebar.js 
import React, { useState } from 'react';
import '../../styles/layout.css';
import dashboardIcon from '../../assets/icons/dashboard.png';
import productIcon from '../../assets/icons/product_management.png';
import salesIcon from '../../assets/icons/sales_management.png';
import logo from '../../assets/images/web-logo.png';
// Sidebar component with mobile responsiveness and active item highlighting
const Sidebar = ({ 
  activeItem = "dashboard",
  onDashboardClick = () => console.log("Dashboard clicked"),
  onProductClick = () => console.log("Product management clicked"),
  onSalesClick = () => console.log("Sales management clicked"),
  onLogoClick = () => console.log("Logo clicked")
}) => {
  // State to manage mobile menu visibility
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Toggle mobile menu visibility
  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };
  // Handler for item clicks - closes mobile menu and calls appropriate callback
  const handleItemClick = (item) => {
    // Close mobile menu when an item is clicked
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
    
    // Call the appropriate callback
    switch(item) {
      case 'dashboard':
        onDashboardClick();
        break;
      case 'product':
        onProductClick();
        break;
      case 'sales':
        onSalesClick();
        break;
      default:
        break;
    }
  };

  // Debug: Log the activeItem prop to see if it's being passed correctly
  console.log('Sidebar activeItem:', activeItem);

  return (
    <>
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        {isMobileOpen ? '✕' : '☰'}
      </button>
      
      <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" onClick={onLogoClick} style={{cursor: 'pointer'}}>
          <img src={logo} alt="PINEAPPLEAI Logo" className="sidebar-logo" />
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li 
              className={`nav-item ${activeItem === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleItemClick('dashboard')}
            >
              <img 
                src={dashboardIcon} 
                alt="Dashboard" 
                className="nav-icon" 
                style={{ 
                  filter: activeItem === 'dashboard' ? 'brightness(0) invert(1)' : 'none' 
                }}
              />
              <span>Dashboard</span>
            </li>
            <li 
              className={`nav-item ${activeItem === 'product' ? 'active' : ''}`}
              onClick={() => handleItemClick('product')}
            >
              <img 
                src={productIcon} 
                alt="Product Management" 
                className="nav-icon" 
                style={{ 
                  filter: activeItem === 'product' ? 'brightness(0) invert(1)' : 'none' 
                }}
              />
              <span>Product management</span>
            </li>
            <li 
              className={`nav-item ${activeItem === 'sales' ? 'active' : ''}`}
              onClick={() => handleItemClick('sales')}
            >
              <img 
                src={salesIcon} 
                alt="Sales Management" 
                className="nav-icon" 
                style={{ 
                  filter: activeItem === 'sales' ? 'brightness(0) invert(1)' : 'none' 
                }}
              />
              <span>Sales management</span>
            </li>
          </ul>
        </nav>

        <div className="sidebar-support-card">
          <div className="support-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2F7A3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="support-text">
            <span>Need Help?</span>
            <strong>Contact Support</strong>
          </div>
          <span className="support-arrow">›</span>
        </div>
      </div>
      
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>
      )}
    </>
  );
};

export default Sidebar;