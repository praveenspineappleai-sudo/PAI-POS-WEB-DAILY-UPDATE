///src/models/AdminUserSetting.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/admin.css";
import AddCashier from "./AddCashier";
import AccountDelete from "./AccountDelete";
import NeedHelp from "./NeedHelp";
import ConfirmationPopup from "./ConfirmationPopup";
import { logout } from "../integration/LogoutAPI";
import { clearAllCookies } from "../integration/AuthAPI";
import { fetchCashiers, deleteCashier } from "../integration/AccountManagementAPI";

// Import icons
import termsIcon from "../assets/icons/terms.png";
import notificationIcon from "../assets/icons/notification.png";
import paymentIcon from "../assets/icons/payment.png";
import helpIcon from "../assets/icons/help.png";
import deleteIcon from "../assets/icons/delete.png";
import userIcon from "../assets/icons/user.png";
import addIcon from "../assets/icons/add.png";
import logoutIcon from "../assets/icons/logout.png";
import cashierIcon from "../assets/icons/cashier.png"; // Import cashier icon

export default function AdminUserSetting({
  isOpen,
  onClose,
  userImage,
  userName,
  onAddCashier,
  onLogout,
  onDelete
}) {
  const navigate = useNavigate();
  const [showAddCashier, setShowAddCashier] = useState(false);
  const [showAccountDelete, setShowAccountDelete] = useState(false);
  const [showNeedHelp, setShowNeedHelp] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cashiers, setCashiers] = useState([]);
  const [isLoadingCashiers, setIsLoadingCashiers] = useState(false);
  const [showCashierList, setShowCashierList] = useState(false);
  const [cashierToDelete, setCashierToDelete] = useState(null);

  // Fetch cashiers when popup opens - MUST BE BEFORE CONDITIONAL RETURN
  useEffect(() => {
    if (isOpen) {
      loadCashiers();
    }
  }, [isOpen]);

  // Conditional return AFTER all hooks
  if (!isOpen && !showAddCashier && !showAccountDelete && !showNeedHelp) return null;

  const loadCashiers = async () => {
    setIsLoadingCashiers(true);
    try {
      const result = await fetchCashiers();
      if (result.success) {
        setCashiers(result.data);
      } else {
        console.error('Failed to fetch cashiers:', result.error);
        setCashiers([]);
      }
    } catch (error) {
      console.error('Error loading cashiers:', error);
      setCashiers([]);
    } finally {
      setIsLoadingCashiers(false);
    }
  };

  const handleDeleteCashier = async (cashierId) => {
    try {
      const result = await deleteCashier(cashierId);
      if (result.success) {
        // Reload cashiers list
        loadCashiers();
        console.log('Cashier deleted successfully');
      } else {
        console.error('Failed to delete cashier:', result.error);
        alert('Failed to delete cashier. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting cashier:', error);
      alert('An error occurred while deleting cashier.');
    }
  };

  const handleConfirmDeleteCashier = () => {
    const id = cashierToDelete;
    setCashierToDelete(null);
    if (id !== null) handleDeleteCashier(id);
  };

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const handleAddCashierClick = () => {
    setShowAddCashier(true);
  };

  const handleCashierClose = () => {
    setShowAddCashier(false);
  };

  const handleCashierSubmit = (cashierData) => {
    console.log("New cashier:", cashierData);

    if (onAddCashier) {
      onAddCashier(cashierData);
    }

    // Reload cashiers list
    loadCashiers();

    setShowAddCashier(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Call the logout API
      const result = await logout();
      
      if (result.success) {
        console.log('Logout successful:', result.message);
        
        // Clear any remaining data
        clearAllCookies();
        
        // Force clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear browser cache and history by forcing a fresh navigation
        // This prevents back button from showing previous admin pages
        window.history.replaceState(null, '', '/login');
        
        // Navigate to login page with replace to prevent back navigation
        navigate('/login', { replace: true });
        
        // Force reload to clear any cached state and React components
        window.location.href = '/login';
        
        // Call the onLogout callback if provided
        if (onLogout) onLogout();
      } else {
        console.error('Logout failed:', result.error);
        // Even if API fails, proceed with comprehensive local logout
        handleForceLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Proceed with comprehensive local logout even if there's an error
      handleForceLogout();
    } finally {
      setIsLoggingOut(false);
      // Close the admin popup
      onClose();
    }
  };

  const handleForceLogout = () => {
    clearAllCookies();
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear browser history state
    window.history.replaceState(null, '', '/login');
    
    // Navigate with replace and force reload
    navigate('/login', { replace: true });
    
    // Force reload to completely clear the session
    window.location.href = '/login';
    
    if (onLogout) onLogout();
  };

  const handleDeleteAccount = (password) => {
    console.log("Deleting account with password:", password);
    if (onDelete) onDelete(password);
    setShowAccountDelete(false);
  };

  const handleAccountDeleteClose = () => {
    setShowAccountDelete(false);
  };

  const handleNeedHelpClick = () => {
    setShowNeedHelp(true);
  };

  const handleNeedHelpClose = () => {
    setShowNeedHelp(false);
  };

  return (
    <>
      {/* Admin User Popup - Only show when not showing other modals */}
      {isOpen && !showAddCashier && !showAccountDelete && !showNeedHelp && (
        <div className="admin-popup-overlay">
          <div className="admin-popup-container">
            {/* Header with Close button only */}
            <div className="admin-popup-header">
              <h2>Admin user</h2>
              <div className="admin-header-actions">
                <button className="admin-popup-close" onClick={onClose}>
                  ×
                </button>
              </div>
            </div>

            {/* User Profile Section */}
            <div className="admin-user-profile">
              <div className="admin-user-avatar">
                {userImage ? (
                  <img src={userImage} alt="User" />
                ) : (
                  <img src={userIcon} alt="User" className="admin-user-icon" />
                )}
              </div>
              <h3 className="admin-username">
                {userName}
              </h3>
            </div>

            {/* Action Buttons Container - Add Cashier and Logout side by side */}
            <div className="admin-action-buttons">
              {/* Add Cashier Button */}
              <button className="add-cashier-button" onClick={handleAddCashierClick}>
                <img src={addIcon} alt="Add Cashier" className="add-cashier-icon" />
                <span>Add cashier</span>
              </button>

              {/* Logout Button */}
              <button 
                className="logout-button" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <img src={logoutIcon} alt="Logout" className="logout-icon" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>

            {/* Navigation Menu */}
            <div className="admin-nav-menu">
              {/* Cashier Section - Expandable */}
              <div 
                className="admin-nav-item cashier-section"
                onClick={() => setShowCashierList(!showCashierList)}
              >
                <img src={cashierIcon} alt="Cashier" className="admin-nav-icon cashier-main-icon" />
                <div className="admin-nav-content">
                  <span className="admin-nav-title">Cashier</span>
                  <span className="admin-nav-subtitle">Cashiers</span>
                </div>
                {cashiers.length > 0 && (
                  <span className="cashier-count-badge">{cashiers.length}</span>
                )}
                <span className={`cashier-arrow ${showCashierList ? 'open' : ''}`}>▼</span>
              </div>

              {/* Cashier List - Collapsible */}
              {showCashierList && (
                <div className="cashier-list">
                  {isLoadingCashiers ? (
                    <div className="cashier-loading">Loading cashiers...</div>
                  ) : cashiers.length === 0 ? (
                    <div className="cashier-empty">No cashiers added yet</div>
                  ) : (
                    cashiers.map((cashier) => (
                      <div key={cashier.id} className="cashier-item">
                        <div className="cashier-info">
                          <div className="cashier-avatar">
                            <img src={userIcon} alt="Cashier" />
                          </div>
                          <div className="cashier-details">
                            <div className="cashier-name">{cashier.username || cashier.name}</div>
                            <div className="cashier-email">{cashier.email}</div>
                          </div>
                        </div>
                        <button
                          className="cashier-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCashierToDelete(cashier.id);
                          }}
                          title="Delete cashier"
                        >
                          <img src={deleteIcon} alt="Delete" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div
                className="admin-nav-item"
                onClick={() => handleNavigation('/notification')}
              >
                <img src={notificationIcon} alt="Notification" className="admin-nav-icon" />
                <div className="admin-nav-content">
                  <span className="admin-nav-title">Notification</span>
                  <span className="admin-nav-subtitle">Customize your notification settings</span>
                </div>
              </div>

              <div
                className="admin-nav-item"
                onClick={() => handleNavigation('/payment-gateway')}
              >
                <img src={paymentIcon} alt="Payment" className="admin-nav-icon" />
                <div className="admin-nav-content">
                  <span className="admin-nav-title">Payment gateway</span>
                  <span className="admin-nav-subtitle">Manage your payment methods and security</span>
                </div>
              </div>

              <div
                className="admin-nav-item"
                onClick={() => handleNavigation('/terms-conditions')}
              >
                <img src={termsIcon} alt="Terms" className="admin-nav-icon" />
                <div className="admin-nav-content">
                  <span className="admin-nav-title">Terms & conditions</span>
                  <span className="admin-nav-subtitle">View our terms of service and conditions</span>
                </div>
              </div>

              <div
                className="admin-nav-item"
                onClick={handleNeedHelpClick} 
              >
                <img src={helpIcon} alt="Help" className="admin-nav-icon" />
                <div className="admin-nav-content">
                  <span className="admin-nav-title">Need help</span>
                  <span className="admin-nav-subtitle">Get the help you need here</span>
                </div>
              </div>

              <div
                className="admin-nav-item"
                onClick={() => setShowAccountDelete(true)}
              >
                <img src={deleteIcon} alt="Deletion" className="admin-nav-icon" />
                <div className="admin-nav-content">
                  <span className="admin-nav-title">Deletion</span>
                  <span className="admin-nav-subtitle">Permanently delete your account and data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cashier Confirmation */}
      <ConfirmationPopup
        isOpen={cashierToDelete !== null}
        onClose={() => setCashierToDelete(null)}
        onConfirm={handleConfirmDeleteCashier}
        title="Confirm Deletion"
        message="Are you sure you want to delete this cashier?"
      />

      {/* Add Cashier Modal */}
      {showAddCashier && (
        <AddCashier
          isOpen={showAddCashier}
          onClose={handleCashierClose}
          onSubmit={handleCashierSubmit}
        />
      )}

      {/* Account Delete Modal */}
      {showAccountDelete && (
        <AccountDelete
          isOpen={showAccountDelete}
          onClose={handleAccountDeleteClose}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {/* Need Help Modal */}
      {showNeedHelp && (
        <NeedHelp
          isOpen={showNeedHelp}
          onClose={handleNeedHelpClose}
        />
      )}
    </>
  );
}