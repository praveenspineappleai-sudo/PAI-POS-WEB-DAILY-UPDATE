// models/AddAttributes.js
import React, { useState } from 'react';
import '../../styles/AddAttributes.css';

const AddAttributes = ({ isOpen, onClose, onSave, categoryName }) => {
    const [attributes, setAttributes] = useState([
        { id: 1, type: 'color', label: 'Colour', values: [] }
    ]);
    const [nextId, setNextId] = useState(2);
    const [addingValueFor, setAddingValueFor] = useState(null);
    const [newValue, setNewValue] = useState('');
    const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);
    const [newAttributeName, setNewAttributeName] = useState('');

    // Pre-defined colors for quick selection
    const predefinedColors = [
        { name: 'Red', code: '#FF0000' },
        { name: 'Blue', code: '#0000FF' },
        { name: 'Green', code: '#00FF00' },
        { name: 'Yellow', code: '#FFFF00' },
        { name: 'Black', code: '#000000' },
        { name: 'White', code: '#FFFFFF' },
        { name: 'Orange', code: '#FFA500' },
        { name: 'Purple', code: '#800080' },
        { name: 'Pink', code: '#FFC0CB' },
        { name: 'Brown', code: '#A52A2A' },
        { name: 'Grey', code: '#808080' },
        { name: 'Cyan', code: '#00FFFF' },
        { name: 'Magenta', code: '#FF00FF' },
        { name: 'Lime', code: '#00FF00' },
        { name: 'Teal', code: '#008080' },
        { name: 'Lavender', code: '#E6E6FA' },
        { name: 'Maroon', code: '#800000' },
        { name: 'Navy', code: '#000080' },
        { name: 'Olive', code: '#808000' },
        { name: 'Silver', code: '#C0C0C0' },
        { name: 'Gold', code: '#FFD700' },
        { name: 'Beige', code: '#F5F5DC' },
        { name: 'Coral', code: '#FF7F50' },
        { name: 'Indigo', code: '#4B0082' },
        { name: 'Violet', code: '#EE82EE' },
        { name: 'Turquoise', code: '#40E0D0' },
        { name: 'Salmon', code: '#FA8072' },
        { name: 'Plum', code: '#DDA0DD' }
    ];

    // Add new attribute row
    const addAttributeRow = () => {
        if (newAttributeName.trim() === '') {
            alert('Please enter an attribute name');
            return;
        }

        // Check if attribute with same name already exists
        const exists = attributes.some(attr => 
            attr.label.toLowerCase() === newAttributeName.trim().toLowerCase()
        );
        
        if (exists) {
            alert('This attribute already exists!');
            return;
        }

        setAttributes([
            ...attributes,
            { id: nextId, type: 'custom', label: newAttributeName.trim(), values: [] }
        ]);
        setNextId(nextId + 1);
        setNewAttributeName('');
        setShowAddAttributeModal(false);
    };

    // Remove attribute row
    const removeAttributeRow = (id) => {
        if (attributes.length > 1) {
            setAttributes(attributes.filter(attr => attr.id !== id));
        }
    };

    // Update attribute label
    const updateAttributeLabel = (id, label) => {
        setAttributes(attributes.map(attr => 
            attr.id === id ? { ...attr, label: label } : attr
        ));
    };

    // Toggle color selection
    const toggleColor = (id, colorName) => {
        setAttributes(attributes.map(attr => {
            if (attr.id === id) {
                const values = attr.values.includes(colorName)
                    ? attr.values.filter(v => v !== colorName)
                    : [...attr.values, colorName];
                return { ...attr, values };
            }
            return attr;
        }));
    };

    // Add value to custom attribute
    const handleAddValue = (id) => {
        const value = newValue.trim();
        if (value === '') return;
        
        setAttributes(attributes.map(attr => {
            if (attr.id === id) {
                const isDuplicate = attr.values.some(
                    existingValue => existingValue.trim().toLowerCase() === value.toLowerCase()
                );
                if (isDuplicate) {
                    alert('This attribute value already exists.');
                    return attr;
                }
                return { ...attr, values: [...attr.values, value] };
            }
            return attr;
        }));
        setNewValue('');
        setAddingValueFor(null);
    };

    // Remove value from attribute
    const removeValue = (attrId, valueToRemove) => {
        setAttributes(attributes.map(attr => {
            if (attr.id === attrId) {
                return { ...attr, values: attr.values.filter(v => v !== valueToRemove) };
            }
            return attr;
        }));
    };

    // Handle save - create table and save attributes
    const handleSave = async () => {
        // Validate attributes
        const customAttributes = attributes.filter(attr => attr.type === 'custom');
        const hasEmptyLabel = customAttributes.some(attr => attr.label.trim() === '');
        
        if (hasEmptyLabel) {
            alert('Please enter labels for all custom attributes');
            return;
        }

        // Check if custom attributes have values
        const hasEmptyValues = customAttributes.some(attr => attr.values.length === 0);
        if (hasEmptyValues) {
            alert('Please add at least one value for each custom attribute');
            return;
        }

        // Check if color has values
        const colorAttr = attributes.find(attr => attr.type === 'color');
        if (!colorAttr || colorAttr.values.length === 0) {
            alert('Please select at least one color');
            return;
        }

        // Prepare data for API
        const attributeData = {
            categoryName: categoryName,
            attributes: attributes.map(attr => ({
                labelName: attr.label,
                type: attr.type === 'color' ? 'select' : 'text',
                values: attr.values
            }))
        };

        if (onSave) {
            await onSave(attributeData);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="add-attributes-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title">Add Attributes for "{categoryName}"</h2>
                        <button className="modal-close-btn" onClick={onClose}>×</button>
                    </div>

                    <div className="modal-content">
                        {attributes.map((attr) => (
                            <div key={attr.id} className="attribute-item">
                                <div className="attribute-header">
                                    <span className="attribute-number">
                                        {attr.type === 'color' ? 'Color' : attr.label || `Attribute ${attr.id}`}
                                    </span>
                                    <div className="attribute-actions">
                                        {/* Plus Button - Opens Add Attribute Modal */}
                                        <button 
                                            className="add-attr-btn"
                                            onClick={() => setShowAddAttributeModal(true)}
                                            title="Add new attribute"
                                        >
                                            +
                                        </button>
                                        {/* Remove button for custom attributes */}
                                        {attr.type === 'custom' && attributes.length > 1 && (
                                            <button 
                                                className="remove-attr-btn"
                                                onClick={() => removeAttributeRow(attr.id)}
                                                title="Remove this attribute"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {attr.type === 'color' ? (
                                    <>
                                        <div className="attribute-type-label">Select Colors</div>
                                        <div className="color-options-grid">
                                            {predefinedColors.map(color => (
                                                <button
                                                    key={color.name}
                                                    className={`color-option ${attr.values.includes(color.name) ? 'selected' : ''}`}
                                                    onClick={() => toggleColor(attr.id, color.name)}
                                                    style={{ backgroundColor: color.code }}
                                                    title={color.name}
                                                >
                                                    {attr.values.includes(color.name) && '✓'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="selected-values">
                                            <span className="selected-label">Selected colors:</span>
                                            <div className="selected-tags">
                                                {attr.values.map(color => (
                                                    <span key={color} className="selected-tag" style={{ backgroundColor: color.toLowerCase() }}>
                                                        {color}
                                                        <button 
                                                            className="remove-tag-btn"
                                                            onClick={() => removeValue(attr.id, color)}
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="attribute-values-section">
                                            <div className="values-label">Values</div>
                                            <div className="values-tags">
                                                {attr.values.map(value => (
                                                    <span key={value} className="value-tag">
                                                        {value}
                                                        <button 
                                                            className="remove-tag-btn"
                                                            onClick={() => removeValue(attr.id, value)}
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            {addingValueFor === attr.id ? (
                                                <div className="add-value-row">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter value"
                                                        value={newValue}
                                                        onChange={(e) => setNewValue(e.target.value)}
                                                        className="add-value-input"
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') handleAddValue(attr.id);
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button 
                                                        className="add-value-confirm"
                                                        onClick={() => handleAddValue(attr.id)}
                                                    >
                                                        Add
                                                    </button>
                                                    <button 
                                                        className="add-value-cancel"
                                                        onClick={() => {
                                                            setAddingValueFor(null);
                                                            setNewValue('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="add-value-btn"
                                                    onClick={() => setAddingValueFor(attr.id)}
                                                >
                                                    + Add Value
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="modal-actions">
                        <button className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button className="add-btn" onClick={handleSave}>Save Attributes</button>
                    </div>
                </div>
            </div>

            {/* Add Attribute Name Modal */}
            {showAddAttributeModal && (
                <div className="modal-overlay add-attribute-overlay" onClick={() => setShowAddAttributeModal(false)}>
                    <div className="add-attribute-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="add-attribute-title">Add Attribute Name</h3>
                        <div className="add-attribute-input-container">
                            <input
                                type="text"
                                placeholder="Type your attribute name"
                                value={newAttributeName}
                                onChange={(e) => setNewAttributeName(e.target.value)}
                                className="add-attribute-input"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') addAttributeRow();
                                }}
                                autoFocus
                            />
                            <button 
                                className="add-attribute-submit"
                                onClick={addAttributeRow}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddAttributes;