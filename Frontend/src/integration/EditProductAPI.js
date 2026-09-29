// EditProductAPI.js - Fixed API integration for editing products
import { getToken } from './AuthAPI';
import Cookies from 'js-cookie';
/// API base URL
import { API_BASE_URL as BASE_URL } from '../config/apiConfig';

const API_BASE_URL = `${BASE_URL}/api`;
// Update product with price endpoint
export const updateProductWithPrice = async (productId, priceId, productData) => {
    try {
        const token = getToken();
        const businessId = Cookies.get('business_id');

        if (!token || !businessId) {
            throw new Error('Authentication missing. Please log in again.');
        }
        // Prepare payload for updating product - SIMILAR TO CREATE PRODUCT
        const updatePayload = {
            name: productData.name,
            description: productData.description || '',
            categorys_id: productData.category_id,
            color_id: productData.color_id,
            size_id: productData.size_id,
            quantity: parseFloat(productData.quantity),
            unit: productData.unit,
            cost_price: parseFloat(productData.cost_price || 0),
            selling_price: parseFloat(productData.selling_price),
            business_id: parseInt(businessId),
        };

        // Copy any dynamic custom attributes
        Object.keys(productData).forEach(key => {
            if (!['name', 'description', 'category_id', 'color_id', 'size_id', 'quantity', 'cost_price', 'selling_price'].includes(key)) {
                updatePayload[key] = productData[key];
            }
        });

        console.log('📤 Sending to update product:', {
            productId,
            priceId,
            payload: updatePayload
        });
        // FIRST TRY - Update with price ID
        const response = await fetch(`${API_BASE_URL}/products/update-product-with-price/${productId}/${priceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updatePayload),
        });

        let responseData;
        try {
            responseData = await response.json();
        } catch {
            throw new Error('Server returned invalid JSON for product update.');
        }

        console.log('📥 Update product response:', responseData);

        if (!response.ok) {
            console.log('🔄 Trying alternative endpoint...');
            const altResponse = await fetch(`${API_BASE_URL}/products/update-product/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updatePayload),
            });

            let altResponseData;
            try {
                altResponseData = await altResponse.json();
            } catch {
                throw new Error('Server returned invalid JSON for alternative product update.');
            }

            console.log('📥 Alternative update response:', altResponseData);

            if (!altResponse.ok) {
                throw new Error(altResponseData.error || responseData.error || `Failed to update product: ${altResponse.status}`);
            }

            return {
                success: true,
                message: 'Product updated successfully',
                data: altResponseData
            };
        }

        return {
            success: true,
            message: 'Product updated successfully',
            data: responseData
        };

    } catch (error) {
        console.error('❌ Update Product Error:', error);
        return {
            success: false,
            error: error.message || 'An error occurred while updating the product'
        };
    }
};

// Get product details by ID
export const getProductById = async (productId) => {
    try {
        const token = getToken();
        const businessId = Cookies.get('business_id');

        if (!token || !businessId) {
            throw new Error('Authentication missing');
        }

        const response = await fetch(`${API_BASE_URL}/products/${productId}?business_id=${businessId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
    }
};

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    updateProductWithPrice,
    getProductById,
};