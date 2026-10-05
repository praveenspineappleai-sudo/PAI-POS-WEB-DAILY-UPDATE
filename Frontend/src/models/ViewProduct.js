// src/models/ViewProduct.js
import React, { useState, useEffect } from 'react';
import NextButton from '../components/buttons/NextButton';
import DeleteConfirmation from './DeleteConfirmation';
import ConfirmationPopup from './ConfirmationPopup';
import Barcode from './Barcode';
import { fetchProductWithBarcode } from '../integration/BarcodeScannerAPI';
import colorIcon from '../assets/icons/color.png';
import priceIcon from '../assets/icons/price.png';
import sizeIcon from '../assets/icons/size.png';
import quantityIcon from '../assets/icons/quantity.png';
import barcodeIcon from '../assets/icons/barcode.png';
import limitIcon from '../assets/icons/limit.png';
import '../styles/viewproduct.css';

const ViewProduct = ({ isOpen, onClose, addedProducts, basicDetails, onNext, onDeleteVariant, showNextButton = true, showBarcodeButton = false }) => {
    const [showBarcode, setShowBarcode] = useState(false);
    const [selectedBarcodeData, setSelectedBarcodeData] = useState('');
    const [selectedBarcodeId, setSelectedBarcodeId] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [showNextConfirmation, setShowNextConfirmation] = useState(false);
    const [variantToDelete, setVariantToDelete] = useState(null);
    const [barcodeError, setBarcodeError] = useState(null);
    const [selectedVariantData, setSelectedVariantData] = useState(null);
    const [loadingBarcodes, setLoadingBarcodes] = useState({});

    useEffect(() => {
        if (!isOpen) {
            setShowBarcode(false);
            setSelectedBarcodeData('');
            setSelectedBarcodeId(null);
            setShowDeleteConfirmation(false);
            setShowNextConfirmation(false);
            setVariantToDelete(null);
            setBarcodeError(null);
            setSelectedVariantData(null);
            setLoadingBarcodes({});
        }
    }, [isOpen]);

    if (!isOpen && !showBarcode && !showNextConfirmation) return null;

    const handleDeleteVariant = (index) => {
        setVariantToDelete(index);
        setShowDeleteConfirmation(true);
    };

    const handleConfirmDelete = () => {
        if (onDeleteVariant && variantToDelete !== null) {
            onDeleteVariant(variantToDelete);
        }
        setShowDeleteConfirmation(false);
        setVariantToDelete(null);
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirmation(false);
        setVariantToDelete(null);
    };

    const handleNext = () => {
        setShowNextConfirmation(true);
    };

    const handleConfirmNext = () => {
        setShowNextConfirmation(false);
        if (onClose) {
            onClose();
        }
        if (onNext) {
            onNext();
        }
    };

    const handleCancelNext = () => {
        setShowNextConfirmation(false);
    };

    const handleBarcodeClick = async (index) => {
        const product = addedProducts[index];
        if (!product || !product.id) {
            console.error('No product ID found for barcode');
            setBarcodeError('Product ID not found');
            return;
        }

        setLoadingBarcodes(prev => ({
            ...prev,
            [index]: true
        }));
        setBarcodeError(null);

        try {
            console.log(`📄 Fetching barcode for product ID: ${product.id}`, {
                color: product.color,
                size: product.size
            });
            
            const variantData = {
                color: product.color,
                size: product.size,
                productId: product.id
            };
            
            setSelectedVariantData(variantData);
            
            const result = await fetchProductWithBarcode(product.id, variantData);
            
            if (result.success && result.barcode && result.barcode.barcodeNo) {
                const barcodeNo = result.barcode.barcodeNo;
                const barcodeId = result.barcode.barcodeId;
                
                setSelectedBarcodeData(barcodeNo);
                setSelectedBarcodeId(barcodeId);
                setShowBarcode(true);
                console.log('✅ Barcode loaded successfully:', { barcodeNo, barcodeId });
            } else {
                throw new Error(result.error || 'No barcode found for this product');
            }
        } catch (error) {
            console.error('❌ Error loading barcode:', error);
            alert(`Failed to load barcode: ${error.message || 'Barcode not found for this product'}`);
            
            setSelectedBarcodeData('');
            setSelectedBarcodeId(null);
            setShowBarcode(false);
            setBarcodeError(null);
            setSelectedVariantData(null);
        } finally {
            setLoadingBarcodes(prev => ({
                ...prev,
                [index]: false
            }));
        }
    };

    const handleBarcodeClose = () => {
        setShowBarcode(false);
        setSelectedBarcodeData('');
        setSelectedBarcodeId(null);
        setBarcodeError(null);
        setSelectedVariantData(null);
    };

    const handleViewProductClose = () => {
        onClose();
    };

    const isBarcodeLoading = (index) => {
        return !!loadingBarcodes[index];
    };

    // Helper function to extract all custom attributes (object or flat keys)
    const getCombinedCustomAttributes = (product) => {
        if (!product) return {};
        const combined = { ...(product.customAttributes || {}) };
        const standardKeys = [
            'id', 'variantKey', 'color', 'size', 'quantity', 'unit', 'sellingPrice',
            'costPrice', 'barcode', 'name', 'category', 'description', 'customAttributes',
            'status', 'created_at', 'priceId', 'category_id', 'color_id', 'size_id'
        ];
        Object.keys(product).forEach(key => {
            if (!standardKeys.includes(key) && product[key] !== undefined && product[key] !== null && product[key] !== '') {
                combined[key] = product[key];
            }
        });
        return combined;
    };

    // Helper function to render product attributes conditionally
    const renderProductAttribute = (product, icon, label, value, showCondition = true) => {
        if (!showCondition || !value || value === 'N/A' || value === 'Default' || value === '') {
            return null;
        }
        
        return (
            <div className="product-attribute">
                <img src={icon} alt={label} className="attr-icon" />
                <div className="attr-details">
                    <span className="attr-label" style={{ textTransform: 'capitalize' }}>{label}</span>
                    <span className="attr-value">{value}</span>
                </div>
            </div>
        );
    };

    return (
        <>
            {isOpen && !showDeleteConfirmation && !showBarcode && !showNextConfirmation && (
                <div className="view-product-overlay" onClick={handleViewProductClose}>
                    <div className="view-product-content" onClick={(e) => e.stopPropagation()}>
                        <div className="view-product-header">
                            <h2 className="view-product-title">{basicDetails?.name || 'Product'}</h2>
                            <button className="view-product-close" onClick={handleViewProductClose}>
                                ×
                            </button>
                        </div>

                        <div className="view-product-body">
                            <div className="product-management-section">
                                <div className="basic-product-info">
                                    <div className="product-name-category">
                                        <span className="product-category">{basicDetails?.category || 'Uncategorized'}</span>
                                    </div>

                                    <div className="product-description">
                                        <h4 className="description-title">Description</h4>
                                        <p className="description-text">
                                            {basicDetails?.description || 'Product description will appear here'}
                                        </p>
                                    </div>
                                </div>

                                <div className="product-attributes-section">
                                    <h4 className="attributes-title">Product attributes</h4>

                                    <div className="product-cards-grid">
                                        {addedProducts.map((product, index) => {
                                            const isLoading = isBarcodeLoading(index);
                                            return (
                                                <div key={product.id || index} className="product-card">
                                                    <div className="product-card-header">
                                                        <h5 className="product-card-title">Attributes {index + 1}</h5>
                                                        <div className="product-card-actions">
                                                            {/* Only show barcode button if showBarcodeButton prop is true */}
                                                            {showBarcodeButton && (
                                                                <button
                                                                    className={`barcode-button ${isLoading ? 'loading' : ''}`}
                                                                    onClick={() => handleBarcodeClick(index)}
                                                                    title="Barcode"
                                                                    disabled={isLoading}
                                                                >
                                                                    <img 
                                                                        src={barcodeIcon} 
                                                                        alt="Barcode" 
                                                                        className={`barcode-icon ${isLoading ? 'loading' : ''}`} 
                                                                    />
                                                                    {isLoading && <span className="loading-spinner"></span>}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="product-card-content">
                                                        {/* Only show color if it exists and has a valid value */}
                                                        {renderProductAttribute(
                                                            product, 
                                                            colorIcon, 
                                                            'Color', 
                                                            product.color,
                                                            product.color && product.color !== 'N/A' && product.color !== 'Default'
                                                        )}
                                                        
                                                        {/* Only show size if it exists and has a valid value */}
                                                        {renderProductAttribute(
                                                            product, 
                                                            sizeIcon, 
                                                            'Size', 
                                                            product.size,
                                                            product.size && product.size !== 'N/A' && product.size !== 'Default'
                                                        )}

                                                        {/* Custom attributes (both from customAttributes object and dynamically added custom fields) */}
                                                        {(() => {
                                                            const customAttrs = getCombinedCustomAttributes(product);
                                                            return Object.entries(customAttrs).map(([attrKey, attrVal]) => (
                                                                renderProductAttribute(
                                                                    product,
                                                                    limitIcon,
                                                                    attrKey.replace(/_/g, ' '),
                                                                    attrVal,
                                                                    Boolean(attrVal && attrVal !== 'N/A' && attrVal !== 'Default')
                                                                )
                                                            ));
                                                        })()}
                                                        
                                                        {/* Always show quantity */}
                                                        {renderProductAttribute(product, quantityIcon, 'Quantity', `${product.quantity} ${product.unit || 'pcs'}`, true)}
                                                        
                                                        {/* Always show selling price */}
                                                        {renderProductAttribute(product, priceIcon, 'Price', `Rs ${product.sellingPrice}`, true)}

                                                        {/* Always show cost price */}
                                                        {renderProductAttribute(product, priceIcon, 'Cost Price', `Rs ${product.costPrice}`, product.costPrice !== undefined && product.costPrice !== null && product.costPrice !== '')}
                                                    </div>
                                                    {barcodeError && index === 0 && (
                                                        <div className="barcode-error-message">
                                                            {barcodeError}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {showNextButton === true && (
                                <div className="action-section">
                                    <div className="next-button-container">
                                        <NextButton onClick={handleNext} title="Next" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmation
                isOpen={showDeleteConfirmation}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete product attribute"
                message='Click "yes" to delete the product attribute.'
                confirmText="Yes"
                cancelText="No"
            />

            <ConfirmationPopup
                isOpen={showNextConfirmation}
                onClose={handleCancelNext}
                onConfirm={handleConfirmNext}
                title="Save product details"
                message="Click 'Yes' to save product details."
                confirmText="Yes"
                cancelText="No"
            />

            {showBarcode && selectedBarcodeData && (
                <Barcode
                    isOpen={showBarcode}
                    onClose={handleBarcodeClose}
                    barcodeData={selectedBarcodeData}
                    barcodeId={selectedBarcodeId}
                    isLoading={false}
                    error={barcodeError}
                    variantData={selectedVariantData}
                />
            )}
        </>
    );
};

export default ViewProduct;