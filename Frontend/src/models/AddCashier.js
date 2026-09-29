///src/models/AddCashier.js
import React, { useState } from "react";
import "../styles/cashier.css";

// Import new icons
import suggestIcon from "../assets/icons/suggest.png";
import eyeIcon from "../assets/icons/eye.png";
import copyIcon from "../assets/icons/copy.png";

// Import ProceedOrderButton instead of AddButton
import ProcessOrderButton from "../components/buttons/ProceedOrderButton";
import { useToast } from "../contexts/ToastContext"; // Add toast context
import { addCashier } from "../integration/CashierAPI";

export default function AddCashier({ isOpen, onClose, onSubmit }) {
  const { showToast } = useToast(); // Initialize toast
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);// State to toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);// State to toggle confirm password visibility
  const [errors, setErrors] = useState({});// State to hold form validation errors
  const [copied, setCopied] = useState(false);// State to show "Password copied!" message

  if (!isOpen) return null;

  // Function to generate a random password
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Handle password visibility toggle
  const handleSuggestPassword = () => {
    const suggestedPassword = generatePassword();
    setFormData({
      ...formData,
      password: suggestedPassword,
      confirmPassword: suggestedPassword
    });

    // Clear password errors when suggesting a password
    if (errors.password || errors.confirmPassword) {
      setErrors({
        ...errors,
        password: "",
        confirmPassword: ""
      });
    }
  };
  // Handle password copy to clipboard
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    setCopied(true);

    // Hide the confirmation message after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
  };

  // Form validation function
  const validateForm = () => {
    const newErrors = {};


    const cashierName = formData.name.trim();

    if (!cashierName) {
      newErrors.name = 'Name is required';
    } else if (!/[A-Za-z]/.test(cashierName)) {
      newErrors.name = 'Name must contain alphabetic characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }


    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(formData.password)
    ) {
      newErrors.password =
        'Password must be 8+ characters with uppercase, lowercase, number and special character.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    // Call backend
    const result = await addCashier({
      name: formData.name,
      email: formData.email,
      password: formData.password
    });


    if (result.success) {
      showToast("Success", "Cashier successfully added", "success");

      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });
      setErrors({});

      if (onSubmit) {
        onSubmit(result.data);
      }

      onClose();
    } else {
      const errorMessage = result.error || "Failed to add cashier";

      // Show email-related errors (e.g. duplicate email) below the email field
      if (/email/i.test(errorMessage)) {
        setErrors({
          ...errors,
          email: errorMessage
        });
      } else {
        showToast("Error", errorMessage, "error");
      }
    }
  };

  // Handle closing the popup and resetting form state
  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    });
    setErrors({});
    setCopied(false);
    onClose();
  };

  return (
    <div className="add-cashier-overlay">
      <div className="add-cashier-container">
        {/* Header */}
        <div className="add-cashier-header">
          <h2>Add cashier</h2>
          <button className="add-cashier-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="add-cashier-content">
          <div className="add-cashier-section">
            <h3 className="add-cashier-section-title">Basic details</h3>
            <p className="add-cashier-section-description">
              Provide the cashier's full name along with their email and password.
            </p>
          </div>

          <form
            className="add-cashier-form"
            onSubmit={handleSubmit}
            autoComplete="off"
            data-form-type="other"
          >
            {/* Name Input */}
            <div className="add-cashier-input-group">
              <label className="add-cashier-label">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="eg. John"
                className="add-cashier-input"
                autoComplete="off"
              />
              {errors.name && <span style={{ color: 'red', fontSize: '12px' }}>{errors.name}</span>}
            </div>

            {/* Email Input */}
            <div className="add-cashier-input-group">
              <label className="add-cashier-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="eg. example@gmail.com"
                className="add-cashier-input"
                autoComplete="off"
                data-lpignore="true"
              />
              {errors.email && <span style={{ color: 'red', fontSize: '12px' }}>{errors.email}</span>}
            </div>

            {/* Password Input */}
            <div className="add-cashier-input-group">
              <label className="add-cashier-label">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="add-cashier-input"
                  autoComplete="new-password"
                  data-lpignore="true"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <img src={eyeIcon} alt="Toggle visibility" className="password-toggle-icon" />
                </button>
              </div>
              {errors.password && <span style={{ color: 'red', fontSize: '12px' }}>{errors.password}</span>}

              <div className="add-cashier-password-actions">
                <button
                  type="button"
                  className="add-cashier-suggest-btn"
                  onClick={handleSuggestPassword}
                >
                  <img src={suggestIcon} alt="Suggest password" className="action-icon" />
                  Suggest password
                </button>
                <div className="copy-password-container">
                  <button
                    type="button"
                    className="add-cashier-copy-btn"
                    onClick={handleCopyPassword}
                    disabled={!formData.password}
                  >
                    <img src={copyIcon} alt="Copy password" className="action-icon" />
                    Copy password
                  </button>
                  {copied && (
                    <div className="password-copied-message">
                      Password copied!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="add-cashier-input-group">
              <label className="add-cashier-label">Confirm password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="add-cashier-input"
                  autoComplete="new-password"
                  data-lpignore="true"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <img src={eyeIcon} alt="Toggle visibility" className="password-toggle-icon" />
                </button>
              </div>
              {errors.confirmPassword && <span style={{ color: 'red', fontSize: '12px' }}>{errors.confirmPassword}</span>}
            </div>
          </form>
        </div>

        {/* Footer - Updated to use ProcessOrderButton */}
        <div className="add-cashier-footer">
          <ProcessOrderButton onClick={handleSubmit} title="Create cashier" />
        </div>
      </div>
    </div>
  );
}