/// src/pages/Login/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/login.css';
import { login } from '../../integration/AuthAPI';
import { checkEmailRegistered } from '../../integration/ForgotPasswordAPI';
import EmailVerification from '../../models/EmailVerification';

import eyeIcon from '../../assets/icons/eye.png';
import posLogo from '../../assets/images/web-logo.png';
import googleIcon from '../../assets/images/google.png';
import ProcessOrderButton from '../../components/buttons/ProceedOrderButton';

// This component renders the login page, allowing users to enter their email/username and password to sign in. It also includes options for Google OAuth and a forgot password flow.
const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: ''
    };


const identifier = formData.email.trim();

if (!identifier) {
  newErrors.email = 'Email or username is required';
} else if (
  identifier.includes('@') &&
  !/^\S+@\S+\.\S+$/.test(identifier)
) {
  newErrors.email = 'Please enter a valid email address';
}

if (!formData.password) {
  newErrors.password = 'Password is required';
} else if (formData.password.length < 6) {
  newErrors.password = 'Password must be at least 6 characters';
}

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsLoading(true);

      try {
        // Call the login API
        const result = await login(formData.email, formData.password, rememberMe);

        if (result.success) {
          console.log('Login successful:', result.data);

          // Get user role from response
          const userRole = (result.data.user?.role || '').toLowerCase();

          // Navigate based on user role - replace current history entry
          if (['owner', 'admin', 'superadmin', 'super_admin', 'super admin'].includes(userRole)) {
            navigate('/dashboard', { replace: true });
          } else if (userRole === 'cashier') {
            navigate('/order-list', { replace: true });
          } else {
            // Default navigation
            navigate('/dashboard', { replace: true });
          }
        } else {
          // Show error message
          setErrors({
            email: '',
            password: result.error || 'Login failed. Please try again.'
          });
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrors({
          email: '',
          password: 'An unexpected error occurred. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = () => {
    // Just log to console, no sign-in, no toaster, no navigation
    console.log('Google OAuth would be initiated here in production');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPasswordClick = async (e) => {
    e.preventDefault();

    // Validate email before opening forgot password modal
    const emailValue = formData.email.trim();

    if (!emailValue) {
      setErrors(prev => ({
        ...prev,
        email: 'Please enter your email address first'
      }));
      return;
    }

    // Basic email format validation
    if (!/\S+@\S+\.\S+/.test(emailValue)) {
      setErrors(prev => ({
        ...prev,
        email: 'Please enter a valid email address'
      }));
      return;
    }

    // Clear any errors before checking whether the email is registered
    setErrors({ email: '', password: '' });
    setIsCheckingEmail(true);

    const result = await checkEmailRegistered(emailValue);

    setIsCheckingEmail(false);

    if (!result.registered) {
      setErrors(prev => ({
        ...prev,
        email: result.error || 'Unregistered Email, Cannot Proceed'
      }));
      return;
    }

    // Email is registered - proceed to the forgot password modal
    setShowForgotPassword(true);
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleVerificationSuccess = () => {
    setShowForgotPassword(false);
    // Clear the password field after successful reset
    setFormData(prev => ({
      ...prev,
      password: ''
    }));
    // Optionally, you could show a success message here
    console.log('Password reset successful! You can now login with your new password.');
  };

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          {/* Logo Section */}
          <div className="logo-section">
            <img
              src={posLogo}
              alt="POS Logo"
              className="logo"
            />
            <h2 className="brand-name">POS</h2>
          </div>

          {/* Welcome Message */}
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome Back!</h1>
            <p className="welcome-subtitle">Please sign in to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Email Input */}
            <div className="input-group">
              <label htmlFor="email" className="input-label">
                Email or username
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="eg. example@email.com"
                className={`input-field ${errors.email ? 'error' : ''}`}
                autoComplete="off"
                required
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="* * * * * * * *"
                  className={`input-field password-input ${errors.password ? 'error' : ''}`}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <img
                    src={eyeIcon}
                    alt="Toggle password visibility"
                    className={`eye-icon ${showPassword ? 'eye-open' : 'eye-closed'}`}
                  />
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              {/* Updated Checkbox - Matching Signup3.js style */}
              <label className="remember-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                  className="remember-checkbox-input"
                />
                <span className="remember-text">Remember me</span>
              </label>
              <a
                href="#forgot"
                className="forgot-password"
                onClick={isCheckingEmail ? (e) => e.preventDefault() : handleForgotPasswordClick}
                aria-disabled={isCheckingEmail}
              >
                {isCheckingEmail ? 'Checking...' : 'Forgot password?'}
              </a>
            </div>

            {/* Sign In Button - Using ProcessOrderButton component */}
            <div className="signin-btn-container">
              <ProcessOrderButton
                type="submit"
                title={isLoading ? "Signing in..." : "Sign in"}
                disabled={isLoading}
              />
            </div>
          </form>

          {/* Divider */}
          <div className="divider">
            <span className="divider-text">Or continue with</span>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="google-signin-btn"
          >
            <img
              src={googleIcon}
              alt="Google"
              className="google-icon"
            />
            Google
          </button>

          {/* Sign Up Link */}
          <div className="signup-link">
            Don't have an account?
            <a
              href="/signup"
              className="signup-text"
              onClick={(e) => {
                e.preventDefault();
                navigate('/signup');
              }}
            >
              Sign up
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Flow - Email Verification Modal */}
      <EmailVerification
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userEmail={formData.email} 
        onVerificationSuccess={handleVerificationSuccess}
      />
    </>
  );
};

export default Login;