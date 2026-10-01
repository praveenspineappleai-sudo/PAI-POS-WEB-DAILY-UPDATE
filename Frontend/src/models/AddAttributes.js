import React, { useState, useEffect } from 'react';
import ProcessOrderButton from '../components/buttons/ProceedOrderButton';
import AddButton from '../components/buttons/AddButton';
import DeleteButton from '../components/buttons/DeleteButton';
import '../styles/addattributes.css';

const AddAttributes = ({ 
    isOpen, 
    onClose, 
    categoryName,
    onSaveAttributes,
    onSave,
    initialAttributes = []
}) => {
    // Initialize with empty attributes when modal opens
    const [attributes, setAttributes] = useState([
        { id: Date.now(), labelName: '' } // Start with one empty attribute
    ]);
    const [hasSavedAttributes, setHasSavedAttributes] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState({});

    // Reset attributes when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            // Always reset to one empty attribute when modal opens
            setAttributes([{ id: Date.now(), labelName: '' }]);
            setHasSavedAttributes(false);
            setValidationMessage('');
            setValidationErrors({});
        }
    }, [isOpen]); // This effect runs every time isOpen changes

    // Handle existing initialAttributes if provided
    useEffect(() => {
        if (isOpen && initialAttributes && initialAttributes.length > 0) {
            // If there are initialAttributes, use them
            setAttributes(initialAttributes.map((attr, index) => ({
                id: attr.id || Date.now() + index,
                labelName: attr.labelName || ''
            })));
        }
    }, [isOpen, initialAttributes]);
    // Handle label name change
    const handleLabelNameChange = (id, value) => {
        const filteredValue = value.replace(/[^A-Za-z]/g, '');
        setValidationErrors(prev => ({ ...prev, [id]: '' }));
        setAttributes(prev => prev.map(attr => 
            attr.id === id ? { ...attr, labelName: filteredValue } : attr
        ));
    };
    // Add new attribute
    const addNewAttribute = () => {
        const newId = Date.now() + Math.random(); // Generate unique ID
        setAttributes(prev => [
            ...prev,
            { id: newId, labelName: '' }
        ]);
    };
    // Remove attribute by ID
    const removeAttribute = (id) => {
        if (attributes.length > 1) {
            setAttributes(prev => prev.filter(attr => attr.id !== id));
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    };
    // Handle save action
    const handleSave = () => {
        const newErrors = {};
        
        const seen = new Set();
        
        attributes.forEach((attr) => {
            const val = attr.labelName.trim();
            const normalized = val.toLowerCase();
            
            // DEF_010: Empty value
            if (val === '') {
                newErrors[attr.id] = 'Please enter a value for this option.';
            } 
            // DEF_011: Maximum length
            else if (val.length > 255) {
                newErrors[attr.id] = 'Label name must be 255 characters or fewer.';
            }
            // DEF_012: Special characters only
            else if (!/[A-Za-z0-9]/.test(val)) {
                newErrors[attr.id] = 'Attribute name cannot contain only special characters.';
            }
            // DEF_009: Duplicate values
            else if (seen.has(normalized)) {
                newErrors[attr.id] = 'This attribute value already exists.';
            } else {
                seen.add(normalized);
            }
        });
        
        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            return;
        }
        
        // All attributes are valid, ensure they are trimmed
        const validAttributes = attributes.map(attr => ({
            ...attr,
            labelName: attr.labelName.trim()
        }));
        
        const saveHandler = onSaveAttributes || onSave;
        if (saveHandler) {
            setHasSavedAttributes(true);
            saveHandler(validAttributes);
        }
        // Don't reset here - let the parent handle cleanup
    };

    const handleCancel = () => {
        if (!hasSavedAttributes) {
            setValidationMessage('* Please add at least one attribute before closing');
            return;
        }

        // Clear attributes when canceling
        setAttributes([{ id: Date.now(), labelName: '' }]);
        onClose();
    };

    // Close modal when clicking outside
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container add-attributes-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add attributes</h2>
                    <button className="modal-close-btn" onClick={handleCancel}>
                        ✕
                    </button>
                </div>

                <div className="modal-content">
                    {attributes.map((attribute, index) => (
                        <div key={attribute.id} className="attribute-item">
                            <div className="attribute-header">
                                <span className="attribute-number">Option {String(index + 1).padStart(2, '0')}</span>
                            </div>
                            
                            <div className="attribute-input-row">
                                <input
                                    type="text"
                                    placeholder="Type your Label Name"
                                    value={attribute.labelName}
                                    onChange={(e) => handleLabelNameChange(attribute.id, e.target.value)}
                                    className="attribute-input"
                                    autoFocus={index === 0}
                                />
                                {index === attributes.length - 1 && ( // Only show + button on last attribute
                                    <AddButton onClick={addNewAttribute} />
                                )}
                                {index > 0 && ( // Only show delete button for Option 02 and beyond
                                    <DeleteButton onClick={() => removeAttribute(attribute.id)} />
                                )}
                            </div>
                            {validationErrors[attribute.id] && (
                                <span className="validation-error" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                                    {validationErrors[attribute.id]}
                                </span>
                            )}
                            {validationMessage && index === 0 && (
                                <div className="attribute-validation-message" role="alert">
                                    {validationMessage}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="modal-actions">
                    <ProcessOrderButton 
                        onClick={handleSave}
                        title="Add"
                    />
                </div>
            </div>
        </div>
    );
};

export default AddAttributes;