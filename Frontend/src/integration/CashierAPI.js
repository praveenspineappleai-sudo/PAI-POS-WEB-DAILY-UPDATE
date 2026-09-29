// CashierAPI.js
import { getToken } from "./AuthAPI";
import Cookies from "js-cookie";
//import { useToast } from "../../contexts/ToastContext";

import { API_BASE_URL as BASE_URL } from '../config/apiConfig';

const API_BASE_URL = `${BASE_URL}/api/cashier`;
//const { showToast } = useToast();

/**
 * Add a new cashier (POST request)
 */
export const addCashier = async (cashierData) => {
  try {
    const token = getToken();

    // ✅ Token missing check
    if (!token) {
      alert("Session expired! Please log in again.");
      return { success: false, error: "No token found" };
    }
    
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullname: cashierData.name, // ✅ backend expects fullname
        email: cashierData.email,
        password: cashierData.password,
        business_id: Cookies.get("business_id"), // ✅ include business_id
      }),
    });

    // ✅ Handle Unauthorized (expired or invalid token)
    if (response.status === 401) {
      console.warn("⚠ Unauthorized or expired token");
      alert("Your session has expired. Please refresh the page or log in again.");
      // ❌ Don’t auto-logout or clear cookies — just notify the user
      return { success: false, error: "Unauthorized" };
    }

    // ✅ Read raw text (for safety)
    const text = await response.text();
    console.log("Server Response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response (server may have returned HTML)");
    }

    // ✅ Check response success
    if (!response.ok) {
      throw new Error(data.message || "Failed to add cashier");
    }

    return { success: true, data };
  } catch (error) {
    console.error("❌ Add cashier error:", error);
    return { success: false, error: error.message };
  }
};