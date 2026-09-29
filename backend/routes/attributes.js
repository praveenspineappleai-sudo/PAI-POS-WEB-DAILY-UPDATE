const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Get all attributes for a category
router.get('/categories/:categoryId/attributes', authMiddleware, async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        const [attributes] = await db.query(
            'SELECT id, category_id, attribute_name, attribute_type, created_at, updated_at FROM attributes WHERE category_id = ? ORDER BY id',
            [categoryId]
        );
        
        res.json({
            success: true,
            data: attributes
        });
    } catch (error) {
        console.error('Error fetching attributes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attributes',
            error: error.message
        });
    }
});

// Create attribute for a category
router.post('/categories/:categoryId/attributes', authMiddleware, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { attribute_name, attribute_type = 'text' } = req.body;
        
        const trimmedName = attribute_name ? attribute_name.trim() : '';
        if (!trimmedName) {
            return res.status(400).json({
                success: false,
                message: 'Attribute name is required.'
            });
        }
        if (!/[A-Za-z0-9]/.test(trimmedName)) {
            return res.status(400).json({
                success: false,
                message: 'Attribute name cannot contain only special characters.'
            });
        }
        
        // Check if attribute already exists for this category
        const [existing] = await db.query(
            'SELECT id FROM attributes WHERE category_id = ? AND attribute_name = ?',
            [categoryId, attribute_name]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Attribute already exists for this category'
            });
        }
        
        const [result] = await db.query(
            'INSERT INTO attributes (category_id, attribute_name, attribute_type) VALUES (?, ?, ?)',
            [categoryId, attribute_name, attribute_type]
        );

        // ✅ DYNAMICALLY CREATE THE TABLE FOR THIS ATTRIBUTE!
        const tableName = `attr_${attribute_name.toLowerCase().replace(/\s+/g, '_')}`;
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                value VARCHAR(255) NOT NULL UNIQUE
            )
        `);
        
        const [newAttribute] = await db.query(
            'SELECT id, category_id, attribute_name, attribute_type FROM attributes WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            data: newAttribute[0],
            message: 'Attribute created successfully'
        });
    } catch (error) {
        console.error('Error creating attribute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create attribute',
            error: error.message
        });
    }
});

// Create multiple attributes for a category
router.post('/categories/:categoryId/attributes/bulk', authMiddleware, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { categoryId } = req.params;
        const { attributes } = req.body;
        
        if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No attributes to create'
            });
        }
        
        await connection.beginTransaction();
        
        const createdAttributes = [];
        
        for (const attr of attributes) {
            const { attribute_name, attribute_type = 'text' } = attr;
            
            const trimmedName = attribute_name ? attribute_name.trim() : '';
            if (!trimmedName || !/[A-Za-z0-9]/.test(trimmedName)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Attribute name cannot contain only special characters.'
                });
            }
            
            // Check if attribute already exists
            const [existing] = await connection.query(
                'SELECT id FROM attributes WHERE category_id = ? AND attribute_name = ?',
                [categoryId, attribute_name]
            );
            
            if (existing.length === 0) {
                const [result] = await connection.query(
                    'INSERT INTO attributes (category_id, attribute_name, attribute_type) VALUES (?, ?, ?)',
                    [categoryId, attribute_name, attribute_type]
                );
                
                // ✅ DYNAMICALLY CREATE THE TABLE FOR THIS ATTRIBUTE!
                const tableName = `attr_${attribute_name.toLowerCase().replace(/\s+/g, '_')}`;
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        value VARCHAR(255) NOT NULL UNIQUE
                    )
                `);
                
                const [newAttribute] = await connection.query(
                    'SELECT id, category_id, attribute_name, attribute_type FROM attributes WHERE id = ?',
                    [result.insertId]
                );
                
                createdAttributes.push(newAttribute[0]);
            }
        }
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            data: createdAttributes,
            message: `${createdAttributes.length} attribute(s) created successfully`
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating attributes in bulk:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create attributes',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Update attribute
router.put('/attributes/:attributeId', authMiddleware, async (req, res) => {
    try {
        const { attributeId } = req.params;
        const { attribute_name, attribute_type } = req.body;
        
        await db.query(
            'UPDATE attributes SET attribute_name = ?, attribute_type = ? WHERE id = ?',
            [attribute_name, attribute_type, attributeId]
        );
        
        const [updatedAttribute] = await db.query(
            'SELECT id, category_id, attribute_name, attribute_type FROM attributes WHERE id = ?',
            [attributeId]
        );
        
        res.json({
            success: true,
            data: updatedAttribute[0],
            message: 'Attribute updated successfully'
        });
    } catch (error) {
        console.error('Error updating attribute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update attribute',
            error: error.message
        });
    }
});

// Delete attribute
router.delete('/attributes/:attributeId', authMiddleware, async (req, res) => {
    try {
        const { attributeId } = req.params;
        
        await db.query('DELETE FROM attributes WHERE id = ?', [attributeId]);
        
        res.json({
            success: true,
            message: 'Attribute deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting attribute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete attribute',
            error: error.message
        });
    }
});

// Get attribute by name for a category
router.get('/categories/:categoryId/attributes/name/:attributeName', authMiddleware, async (req, res) => {
    try {
        const { categoryId, attributeName } = req.params;
        
        const [attribute] = await db.query(
            'SELECT id, category_id, attribute_name, attribute_type FROM attributes WHERE category_id = ? AND attribute_name = ?',
            [categoryId, attributeName]
        );
        
        if (attribute.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Attribute not found'
            });
        }
        
        res.json({
            success: true,
            data: attribute[0]
        });
    } catch (error) {
        console.error('Error fetching attribute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attribute',
            error: error.message
        });
    }
});

// ✅ Get attribute values for a category (Dynamic Table query)
router.get('/categories/:categoryId/attributes/:attributeName/values', authMiddleware, async (req, res) => {
    try {
        const { attributeName } = req.params;
        const tableName = `attr_${attributeName.toLowerCase().replace(/\s+/g, '_')}`;
        
        // Check if table exists
        const [tables] = await db.query("SHOW TABLES LIKE ?", [tableName]);
        if (tables.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const [rows] = await db.query(`SELECT value FROM \`${tableName}\` ORDER BY value`);
        res.json({
            success: true,
            data: rows.map(r => r.value)
        });
    } catch (error) {
        console.error('Error fetching attribute values:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Add value to attribute (Dynamic Table insert)
router.post('/attributes/:attributeId/values', authMiddleware, async (req, res) => {
    try {
        const { attributeId } = req.params;
        const { value } = req.body;
        
        const trimmedValue = value ? value.trim() : '';
        if (!trimmedValue) {
            return res.status(400).json({
                success: false,
                message: 'Attribute value cannot be empty.'
            });
        }
        
        // Look up attribute name
        const [attrs] = await db.query(
            'SELECT attribute_name FROM attributes WHERE id = ?',
            [attributeId]
        );
        
        if (attrs.length === 0) {
            return res.status(404).json({ success: false, message: 'Attribute not found' });
        }
        
        const attributeName = attrs[0].attribute_name;
        const tableName = `attr_${attributeName.toLowerCase().replace(/\s+/g, '_')}`;
        
        // Ensure table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                value VARCHAR(255) NOT NULL UNIQUE
            )
        `);
        // Check for duplicates case-insensitively
        const [existingVal] = await db.query(
            `SELECT id FROM \`${tableName}\` WHERE LOWER(TRIM(value)) = LOWER(?)`,
            [trimmedValue]
        );
        
        if (existingVal.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This attribute value already exists."
            });
        }
        
        await db.query(
            `INSERT IGNORE INTO \`${tableName}\` (value) VALUES (?)`,
            [trimmedValue]
        );
        
        res.json({
            success: true,
            message: 'Value added successfully',
            data: { value: trimmedValue }
        });
    } catch (error) {
        console.error('Error adding attribute value:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save product attribute values
router.post('/products/:productId/attributes', authMiddleware, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { productId } = req.params;
        const { attributes } = req.body;
        
        if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No attributes to save'
            });
        }
        
        await connection.beginTransaction();
        
        // Delete existing attribute values for this product
        await connection.query(
            'DELETE FROM product_attribute_values WHERE product_id = ?',
            [productId]
        );
        
        // Insert new attribute values
        const savedAttributes = [];
        for (const attr of attributes) {
            const { attribute_id, attribute_value } = attr;
            
            const [result] = await connection.query(
                'INSERT INTO product_attribute_values (product_id, attribute_id, attribute_value) VALUES (?, ?, ?)',
                [productId, attribute_id, attribute_value]
            );
            
            savedAttributes.push({
                id: result.insertId,
                product_id: productId,
                attribute_id: attribute_id,
                attribute_value: attribute_value
            });
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            data: savedAttributes,
            message: 'Product attributes saved successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error saving product attributes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save product attributes',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Get product attribute values
router.get('/products/:productId/attributes', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.params;
        
        const [attributes] = await db.query(
            `SELECT pav.id, pav.product_id, pav.attribute_id, pav.attribute_value,
                    a.attribute_name, a.attribute_type
             FROM product_attribute_values pav
             JOIN attributes a ON pav.attribute_id = a.id
             WHERE pav.product_id = ?`,
            [productId]
        );
        
        res.json({
            success: true,
            data: attributes
        });
    } catch (error) {
        console.error('Error fetching product attributes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product attributes',
            error: error.message
        });
    }
});

module.exports = router;