import Cookies from 'js-cookie';
import { API_BASE_URL } from '../config/apiConfig';

/**
 * Get active business name from cookies or localStorage
 */
export const getBusinessName = () => {
  return Cookies.get('business_name') || localStorage.getItem('business_name') || '';
};

/**
 * Fetch dashboard statistics and real-time backend data
 * @param {string} [overrideBusinessName] - Optional override business name
 * @returns {Promise<Object>} Formatted dashboard data
 */
export const fetchDashboardStats = async (overrideBusinessName) => {
  try {
    const businessName = overrideBusinessName || getBusinessName();
    const token = Cookies.get('token') || localStorage.getItem('token');

    const url = businessName 
      ? `${API_BASE_URL}/api/dashboard/stats?business_name=${encodeURIComponent(businessName)}`
      : `${API_BASE_URL}/api/dashboard/stats`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to fetch dashboard data');
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error in fetchDashboardStats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
