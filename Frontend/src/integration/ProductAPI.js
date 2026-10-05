// ProductAPI.js - Product API integration with custom barcode support
import { getToken } from './AuthAPI';
import Cookies from 'js-cookie';

import { API_BASE_URL as BASE_URL } from '../config/apiConfig';

const API_BASE_URL = `${BASE_URL}/api`;
/**
 * Create a new product with variations
 * @param {Object} productData - Product basic information
 * @param {Array} variations - Product variations (color, size, quantity, prices, barcode)
 * @returns {Promise<Object>} Created product response
 */
export const createProduct = async (productData, variations) => {
    try {
        // Get authentication token and business ID
        const token = getToken();
        const businessId = Cookies.get('business_id');

        if (!token || !businessId) {
            throw new Error('Authentication missing. Please log in again.');
        }

        // Step 1: Create the product
        const productPayload = {
            name: productData.name,
            description: productData.description || '',
            categorys_id: productData.category_id,
            business_id: parseInt(businessId),
        };

        console.log('📤 Sending to /products/add-product:', productPayload);

        const productResponse = await fetch(`${API_BASE_URL}/products/add-product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(productPayload),
        });

        let productData_response;
        try {
            productData_response = await productResponse.json();
        } catch {
            throw new Error('Server returned invalid JSON for product creation.');
        }

        console.log('📥 /products/add-product response:', productData_response);

        if (!productResponse.ok || !productData_response.product_id) {
            throw new Error(productData_response.error || 'Failed to create product');
        }

        const productId = productData_response.product_id;

        // Step 2: Add pricing and variations WITH BARCODE
        const pricingPayload = {
            product_id: productId,
            variations: variations.map((variation) => {
                const payload = {
                    color_id: variation.color_id,
                    size_id: variation.size_id,
                    quantity: parseFloat(variation.quantity),
                    unit: variation.unit,
                    cost_price: parseFloat(variation.cost_price || 0),
                    selling_price: parseFloat(variation.selling_price),
                };

                // ADD CUSTOM BARCODE IF PROVIDED
                if (variation.barcode && variation.barcode.trim() !== '') {
                    payload.barcode = variation.barcode.trim();
                    console.log(`📦 Adding custom barcode for variant: ${variation.barcode}`);
                }

                // Copy any dynamic custom attributes
                Object.keys(variation).forEach(key => {
                    if (!['color_id', 'size_id', 'quantity', 'unit', 'cost_price', 'selling_price', 'barcode', 'id', 'name', 'category', 'description'].includes(key)) {
                        payload[key] = variation[key];
                    }
                });

                return payload;
            }),
        };

        console.log('📤 Sending to /products/add-pricing with barcodes:', pricingPayload);

        const pricingResponse = await fetch(`${API_BASE_URL}/products/add-pricing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(pricingPayload),
        });

        let pricingData;
        try {
            pricingData = await pricingResponse.json();
        } catch {
            throw new Error('Server returned invalid JSON for pricing creation.');
        }

        console.log('📥 /products/add-pricing response:', pricingData);

        if (!pricingResponse.ok) {
            throw new Error(pricingData.error || 'Failed to add pricing');
        }

        // Return success response
        return {
            success: true,
            productId: productId,
            message: 'Product created successfully',
            data: {
                product: productData_response,
                pricing: pricingData
            }
        };

    } catch (error) {
        console.error('❌ Create Product Error:', error);
        return {
            success: false,
            error: error.message || 'An error occurred while creating the product'
        };
    }
};

/**
 * Fetch all products
 * @returns {Promise<Array>} Array of products
 */
export const fetchProducts = async () => {
    try {
        const token = getToken();
        const businessId = Cookies.get('business_id');

        if (!token || !businessId) {
            throw new Error('Authentication missing');
        }

        const response = await fetch(`${API_BASE_URL}/products?business_id=${businessId}`, {
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

        // Handle different response structures
        if (Array.isArray(data)) {
            return data;
        } else if (data.products && Array.isArray(data.products)) {
            return data.products;
        } else if (data.data && Array.isArray(data.data)) {
            return data.data;
        }

        return [];
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
};

/**
 * Get category ID by name (FIXED FUNCTION)
 * @param {string} categoryName - Category name
 * @param {Array} categories - Array of category objects
 * @returns {number|null} Category ID
 */
export const getCategoryIdByName = (categoryName, categories) => {
    console.log('🔍 getCategoryIdByName called with:', {
        categoryName,
        categoriesCount: categories?.length,
        categories: categories
    });

    if (!categoryName || !categories || categories.length === 0) {
        console.log('❌ Missing category name or categories array');
        return null;
    }

    // Try different field names that might contain the category name and ID
    const category = categories.find(cat => {
        // Check all possible field names for category name
        const name = cat.category_name || cat.name || cat.categoryName || cat.title || '';
        const id = cat.id || cat.category_id || cat.categoryId;

        console.log('🔍 Checking category:', {
            object: cat,
            nameFound: name,
            idFound: id,
            matches: name.toLowerCase() === categoryName.toLowerCase()
        });

        return name.toLowerCase() === categoryName.toLowerCase();
    });

    if (category) {
        const categoryId = category.id || category.category_id || category.categoryId;
        console.log('✅ Category found:', { categoryName, categoryId, category });
        return categoryId;
    }

    console.log('❌ Category not found for name:', categoryName);
    return null;
};

/**
 * Get color ID by name (helper function)
 * @param {string} colorName - Color name
 * @param {Array} colors - Array of color objects
 * @returns {number|null} Color ID
 */
export const getColorIdByName = (colorName, colors) => {
    console.log('🔍 getColorIdByName called with:', {
        colorName,
        colorsCount: colors?.length
    });

    if (!colorName || !colors || colors.length === 0) {
        return null;
    }

    const color = colors.find(c => {
        const name = c.colour_name || c.name || c.colorName || '';
        const id = c.id || c.colour_id || c.colorId;

        console.log('🔍 Checking color:', {
            nameFound: name,
            idFound: id,
            matches: name.toLowerCase() === colorName.toLowerCase()
        });

        return name.toLowerCase() === colorName.toLowerCase();
    });

    if (color) {
        const colorId = color.id || color.colour_id || color.colorId;
        console.log('✅ Color found:', { colorName, colorId });
        return colorId;
    }

    console.log('❌ Color not found for name:', colorName);
    return null;
};

/**
 * Get size ID by name (helper function)
 * @param {string} sizeName - Size name
 * @param {Array} sizes - Array of size objects
 * @returns {number|null} Size ID
 */
export const getSizeIdByName = (sizeName, sizes) => {
    console.log('🔍 getSizeIdByName called with:', {
        sizeName,
        sizesCount: sizes?.length
    });

    if (!sizeName || !sizes || sizes.length === 0) {
        return null;
    }

    const size = sizes.find(s => {
        const name = s.size || s.size_name || s.name || s.sizeName || '';
        const id = s.id || s.size_id || s.sizeId;

        console.log('🔍 Checking size:', {
            nameFound: name,
            idFound: id,
            matches: name.toLowerCase() === sizeName.toLowerCase()
        });

        return name.toLowerCase() === sizeName.toLowerCase();
    });

    if (size) {
        const sizeId = size.id || size.size_id || size.sizeId;
        console.log('✅ Size found:', { sizeName, sizeId });
        return sizeId;
    }

    console.log('❌ Size not found for name:', sizeName);
    return null;
};

/**
 * Update product (placeholder for future implementation)
 * @param {number} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Update response
 */
export const updateProduct = async (productId, productData) => {
    // TODO: Implement update product API call
    console.log('Update product API not yet implemented:', productId, productData);
    return { success: true };
};

/**
 * Delete product (placeholder for future implementation)
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} Delete response
 */
export const deleteProduct = async (productId) => {
    // TODO: Implement delete product API call
    console.log('Delete product API not yet implemented:', productId);
    return { success: true };
};

export default {
    createProduct,
    fetchProducts,
    getCategoryIdByName,
    getColorIdByName,
    getSizeIdByName,
    updateProduct,
    deleteProduct,
};