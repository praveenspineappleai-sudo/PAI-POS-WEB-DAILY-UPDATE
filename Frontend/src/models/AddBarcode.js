import React, { useState } from "react";
import "../styles/addbarcode.css";
// This component is a popup for adding a barcode to a product variant when a duplicate variant is detected without a barcode.
const AddBarcode = ({ isOpen, onClose, onSave, pendingProduct }) => {
  const [barcodeNumber, setBarcodeNumber] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    const normalizedBarcode = String(barcodeNumber || '').trim();
    if (!normalizedBarcode) return;

    // DEF_021, DEF_022, DEF_023: Validate barcode format (alphanumeric based on frontend generating 'BAR123456')
    const BARCODE_PATTERN = /^[A-Za-z0-9]+$/;
    if (!BARCODE_PATTERN.test(normalizedBarcode)) {
      setError('Barcode can contain only letters and numbers.');
      return;
    }

    const saveResult = onSave(normalizedBarcode);
    if (typeof saveResult === 'string') {
      setError(saveResult);
      return;
    }
    
    // Success, reset and close (if parent hasn't already closed)
    setBarcodeNumber("");
    setError("");
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  const handleInputChange = (e) => {
    setBarcodeNumber(e.target.value);
    if (error) setError(""); // Clear error when typing
  };

  return (
    <div className="addbarcode-popup-overlay">
      <div className="addbarcode-popup-container">
        {/* Close button */}
        <button className="addbarcode-popup-close" onClick={onClose}>
          ✕
        </button>

        {/* Popup content */}
        <div className="addbarcode-popup-content">
          <h3 className="addbarcode-popup-title">
            Add Barcode to Product Variant
          </h3>
          <p className="addbarcode-popup-subtitle">
            A product with identical attributes already exists, but no barcode has been assigned for this variant. To proceed, please enter a new, unique barcode.
          </p>

          {/* Barcode Number Input */}
          <div className="addbarcode-input-group">
            <label className="addbarcode-label">Barcode Number</label>
            <input
              type="text"
              className="addbarcode-input"
              placeholder="Enter barcode"
              value={barcodeNumber}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            {error && <span className="validation-error" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>{error}</span>}
          </div>

          {/* Save Button */}
          <button className="addbarcode-save-button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBarcode;