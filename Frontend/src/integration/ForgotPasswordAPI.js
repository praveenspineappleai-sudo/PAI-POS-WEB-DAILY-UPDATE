// ForgotPasswordAPI.js
import Cookies from 'js-cookie';

import { API_BASE_URL as BASE_URL } from '../config/apiConfig';

const API_BASE_URL = `${BASE_URL}/api/auth`;


/**
 * Check whether an email is registered before starting the forgot password flow
 * @param {string} email - User email
 * @returns {Promise<Object>} Response with registered status and message
 */
export const checkEmailRegistered = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/check-email-registered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        registered: false,
        error: data.message || 'Unregistered Email, Cannot Proceed'
      };
    }

    return {
      success: true,
      registered: true,
      message: data.message || 'Email is registered'
    };

  } catch (error) {
    console.error('Check email registered error:', error);
    return {
      success: false,
      registered: false,
      error: 'Failed to verify email. Please try again.'
    };
  }
};

/**
 * Send OTP for password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Response with success status and message
 */
export const sendPasswordResetOTP = async (email) => {
  try {
    console.log('Sending OTP to:', email);
    
    const response = await fetch(`${API_BASE_URL}/send-password-reset-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await response.json();
    console.log('Send OTP response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return {
      success: true,
      data: data,
      message: data.message || 'OTP sent successfully'
    };

  } catch (error) {
    console.error('Send OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP. Please try again.'
    };
  }
};

/**
 * Verify OTP for password reset
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @returns {Promise<Object>} Response with verification status
 */
export const verifyOTP = async (email, code) => {
  try {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    
    console.log('=== Verify OTP Debug ===');
    console.log('Email:', trimmedEmail);
    console.log('Code:', trimmedCode);
    console.log('Code Length:', trimmedCode.length);
    console.log('Email Length:', trimmedEmail.length);
    
    // Ensure code is exactly 6 digits
    if (!trimmedCode || trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      throw new Error('Code must be exactly 6 digits');
    }
    
    // Ensure email is valid
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Valid email is required');
    }
    
    const requestBody = { 
      email: trimmedEmail, 
      code: trimmedCode  // Changed from 'otp' to 'code'
    };
    
    console.log('Request URL:', `${API_BASE_URL}/verify-otp`);
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Verify OTP response data:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error || 'OTP verification failed');
    }

    return {
      success: true,
      data: data,
      message: data.message || 'OTP verified successfully'
    };

  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      success: false,
      error: error.message || 'Invalid OTP. Please try again.'
    };
  }
};

/**
 * Reset password using OTP
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Response with reset status
 */
export const resetPasswordWithOTP = async (email, code, newPassword) => {
  try {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    
    console.log('=== Reset Password Debug ===');
    console.log('Email:', trimmedEmail);
    console.log('Code:', trimmedCode);
    console.log('Password length:', newPassword.length);
    
    const requestBody = { 
      email: trimmedEmail, 
      code: trimmedCode,  // Changed from 'otp' to 'code'
      newPassword: newPassword 
    };
    
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(`${API_BASE_URL}/reset-password-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Reset password response:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Password reset failed');
    }

    return {
      success: true,
      data: data,
      message: data.message || 'Password reset successful'
    };

  } catch (error) {
    console.error('Reset password error:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset password. Please try again.'
    };
  }
};

/**
 * Store OTP verification data temporarily
 * @param {string} email - User email
 * @param {string} code - OTP code
 */
export const storeOTPData = (email, code) => {
  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();
  
  sessionStorage.setItem('reset_password_email', trimmedEmail);
  sessionStorage.setItem('reset_password_code', trimmedCode);  // Changed key name
  
  console.log('Stored OTP data:', { 
    email: trimmedEmail, 
    code: trimmedCode,
    emailLength: trimmedEmail.length,
    codeLength: trimmedCode.length 
  });
};

/**
 * Get stored OTP data
 * @returns {Object} Email and code data
 */
export const getOTPData = () => {
  const email = sessionStorage.getItem('reset_password_email');
  const code = sessionStorage.getItem('reset_password_code');  // Changed key name
  
  console.log('Retrieved OTP data:', { 
    email, 
    code,
    emailLength: email ? email.length : 0,
    codeLength: code ? code.length : 0
  });
  
  return { email, code };
};

/**
 * Clear OTP data from storage
 */
export const clearOTPData = () => {
  sessionStorage.removeItem('reset_password_email');
  sessionStorage.removeItem('reset_password_code');  // Changed key name
  console.log('Cleared OTP data');
};