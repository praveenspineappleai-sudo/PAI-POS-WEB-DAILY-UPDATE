import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import SaveButton from '../../components/buttons/SaveButton';
import AddButton from '../../components/buttons/AddButton';
import NewProduct from '../../models/AddCategory';
import SelectPopup from '../../models/SelectPopup';
import ViewProduct from '../../models/ViewProduct';
import DeleteConfirmationPopup from '../../models/DeleteConfirmation';
import AddAttributes from '../../models/AddAttributes';
import NewBarcode from '../../models/NewBarcode';
import AddBarcode from '../../models/AddBarcode';
import { fetchCategories, createCategory, getCategoryName, createAttributesBulk, getCategoryAttributes, getAttributeValues, addAttributeValue } from '../../integration/CategoryAPI';
import { normalizeCategoryAttributeDefinitions, hasSpecialCharacters, stripSpecialCharacters, SPECIAL_CHARS_MESSAGE } from './categoryAttributeUtils';
import { fetchColors, createColor, getColorName } from '../../integration/ColorsAPI';
import { fetchSizes, createSize, getSizeName } from '../../integration/SizeAPI';
import {
    createProduct,
    getCategoryIdByName,
    getColorIdByName,
    getSizeIdByName
} from '../../integration/ProductAPI';
import { updateProductWithPrice } from '../../integration/EditProductAPI';
import { useToast } from '../../contexts/ToastContext';
import colorIcon from '../../assets/icons/color.png';
import priceIcon from '../../assets/icons/price.png';
import sizeIcon from '../../assets/icons/size.png';
import quantityIcon from '../../assets/icons/quantity.png';
import deleteIcon from '../../assets/icons/delete.png';
import dropdownIcon from '../../assets/icons/dropdown.png';
import '../../styles/addproduct.css';
import '../../styles/addcategory.css';

// Validation function for product name
const validateProductName = (name) => {
    if (!name || name.trim() === '') {
        return { isValid: false, message: 'Product name is required' };
    }

    if (/^\d+$/.test(name.trim())) {
        return {
            isValid: false,
            message: 'Product name cannot contain only numbers'
        };
    }

    const onlySpecialChars = /^[^a-zA-Z0-9]+$/.test(name.trim());
    if (onlySpecialChars) {
        return {
            isValid: false,
            message: 'Product name cannot contain only special characters'
        };
    }

    const hasLetter = /[a-zA-Z]/.test(name.trim());
    if (!hasLetter) {
        return {
            isValid: false,
            message: 'Product name must contain at least one letter'
        };
    }

    // DEF_011: Maximum Character Validation
    const MAX_PRODUCT_NAME_LENGTH = 255;
    if (name.trim().length > MAX_PRODUCT_NAME_LENGTH) {
        return {
            isValid: false,
            message: `Product name cannot exceed ${MAX_PRODUCT_NAME_LENGTH} characters.`
        };
    }

    return { isValid: true, message: '' };
};

// Validation function for quantity (numbers, decimals allowed, 1 and above)
// Countable units only allow whole numbers; other units allow decimals
const WHOLE_NUMBER_UNITS = ['pcs', 'box', 'pack'];
const isWholeNumberUnit = (unit) => WHOLE_NUMBER_UNITS.includes(unit || 'pcs');

const getQuantityError = (quantity, unit) => {
    const value = String(quantity ?? '').trim();
    if (value === '') return '* Quantity cannot be empty';
    if (isWholeNumberUnit(unit) && !/^\d+$/.test(value)) return `* Quantity must be a whole number for ${unit || 'pcs'}`;
    if (!/^\d+(\.\d+)?$/.test(value)) return '* Quantity must be a number of 1 or more';
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric) || numeric < 1) return '* Quantity must be a number of 1 or more';
    return '';
};

// Get icon for custom attribute
const getAttributeIcon = (labelName) => {
    const label = labelName.toLowerCase();
    if (label.includes('size')) return sizeIcon;
    if (label.includes('color') || label.includes('colour')) return colorIcon;
    if (label.includes('price')) return priceIcon;
    if (label.includes('quantity')) return quantityIcon;
    return null;
};

const AddProduct = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const editMode = location.state?.editMode || false;
    const editProductData = location.state?.productData || null;

    const [basicDetails, setBasicDetails] = useState({
        name: editProductData?.name || '',
        category: editProductData?.category || '',
        description: editProductData?.description || ''
    });

    const [validationErrors, setValidationErrors] = useState({
        name: '',
        category: '',
        description: ''
    });
    const [attributeValidationErrors, setAttributeValidationErrors] = useState({});

    const [productAttributes, setProductAttributes] = useState({
        quantity: editProductData?.quantity || '',
        unit: editProductData?.unit || 'pcs',
        costPrice: editProductData?.costPrice || '',
        sellingPrice: editProductData?.sellingPrice || '',
        color: editProductData?.color || '',
        size: editProductData?.size || '',
        barcode: editProductData?.barcode || ''
    });

    // Store custom attributes values for the current product
    const [customAttributeValues, setCustomAttributeValues] = useState(
        editProductData?.customAttributes || {}
    );

    // Store available values for each custom attribute (from DB)
    const [attributeOptions, setAttributeOptions] = useState({});
    // Loading state for each attribute's options
    const [attributeOptionsLoading, setAttributeOptionsLoading] = useState({});

    // Inline "Add new value" modal state
    const [addValueModal, setAddValueModal] = useState({ open: false, attribute: null, inputVal: '', saving: false });

    const [allCategories, setAllCategories] = useState([]);
    const [categoriesRaw, setCategoriesRaw] = useState([]);
    const [colors, setColors] = useState([]);
    const [colorsRaw, setColorsRaw] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [sizesRaw, setSizesRaw] = useState([]);

    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingColors, setLoadingColors] = useState(false);
    const [loadingSizes, setLoadingSizes] = useState(false);
    const [categoryError, setCategoryError] = useState(null);

    const [newProductModalOpen, setNewProductModalOpen] = useState(false);
    const [newProductModalType, setNewProductModalType] = useState(null);
    const [selectPopupOpen, setSelectPopupOpen] = useState(false);
    const [selectPopupType, setSelectPopupType] = useState(null);
    const [addAttributesOpen, setAddAttributesOpen] = useState(false);

    const [addedProducts, setAddedProducts] = useState([]);
    const [viewProductOpen, setViewProductOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductAttributes, setShowProductAttributes] = useState(false);

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isNewCategory, setIsNewCategory] = useState(false);

    const [barcodePopupOpen, setBarcodePopupOpen] = useState(false);
    const [addBarcodePopupOpen, setAddBarcodePopupOpen] = useState(false);
    const [pendingProduct, setPendingProduct] = useState(null);
    const [barcodeMode, setBarcodeMode] = useState(null);

    const [categoryCustomAttributes, setCategoryCustomAttributes] = useState(() => {
        try {
            const saved = localStorage.getItem('categoryCustomAttributes');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading category attributes from localStorage:', error);
            return {};
        }
    });

    const defaultAttributes = [
        { labelName: 'Quantity', fieldName: 'quantity', type: 'number', alwaysShow: true },
        { labelName: 'Cost Price', fieldName: 'costPrice', type: 'number', alwaysShow: true },
        { labelName: 'Selling Price', fieldName: 'sellingPrice', type: 'number', alwaysShow: true }
    ];

    useEffect(() => {
        try {
            localStorage.setItem('categoryCustomAttributes', JSON.stringify(categoryCustomAttributes));
        } catch (error) {
            console.error('Error saving category attributes to localStorage:', error);
        }
    }, [categoryCustomAttributes]);

    const getCurrentCategoryAttributes = () => {
        const allAttrs = [...defaultAttributes];

        if (basicDetails.category) {
            const categoryLower = basicDetails.category.toLowerCase();
            const customAttrs = categoryCustomAttributes[categoryLower];

            if (customAttrs?.length > 0) {
                customAttrs.forEach(customAttr => {
                    const labelName = customAttr.labelName?.toLowerCase() || '';
                    const fieldName = labelName.replace(/\s+/g, '_');

                    const isDefault = [
                        'quantity',
                        'costprice',
                        'sellingprice'
                    ].includes(fieldName);

                    if (!isDefault) {
                        allAttrs.push({
                            id: customAttr.id,
                            labelName: customAttr.labelName,
                            fieldName: fieldName,
                            type: customAttr.type || 'text',
                            isCustom: true
                        });
                    }
                });
            }
        }

        return allAttrs;
    };

    const loadCategories = async () => {
        setLoadingCategories(true);
        setCategoryError(null);
        try {
            const categories = await fetchCategories();
            if (categories?.length > 0) {
                setCategoriesRaw(categories);
                const categoryNames = categories.map(cat => getCategoryName(cat));
                const validCategoryNames = categoryNames.filter(name => name?.trim() !== '');
                setAllCategories(validCategoryNames);
            } else {
                setCategoriesRaw([]);
                setAllCategories([]);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
            setCategoryError('Failed to load categories from server');
            setCategoriesRaw([]);
            setAllCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    };

    const loadColors = async () => {
        setLoadingColors(true);
        try {
            const colorsData = await fetchColors();
            if (colorsData?.length > 0) {
                setColorsRaw(colorsData);
                const colorNames = colorsData.map(color => getColorName(color));
                const validColorNames = colorNames.filter(name => name?.trim() !== '');
                setColors(validColorNames);
            } else {
                setColorsRaw([]);
                setColors([]);
            }
        } catch (error) {
            console.error('Failed to load colors:', error);
            setColorsRaw([]);
            setColors([]);
        } finally {
            setLoadingColors(false);
        }
    };

    const loadSizes = async () => {
        setLoadingSizes(true);
        try {
            const sizesData = await fetchSizes();
            if (sizesData?.length > 0) {
                setSizesRaw(sizesData);
                const sizeNames = sizesData.map(size => getSizeName(size));
                const validSizeNames = sizeNames.filter(name => name?.trim() !== '');
                setSizes(validSizeNames);
            } else {
                setSizesRaw([]);
                setSizes([]);
            }
        } catch (error) {
            console.error('Failed to load sizes:', error);
            setSizesRaw([]);
            setSizes([]);
        } finally {
            setLoadingSizes(false);
        }
    };

    useEffect(() => {
        loadCategories();
        loadColors();
        loadSizes();
    }, []);

    useEffect(() => {
        if (editMode) {
            setShowProductAttributes(true);
        } else {
            const isBasicDetailsFilled = basicDetails.name.trim() !== '' &&
                basicDetails.category.trim() !== '' &&
                basicDetails.description.trim() !== '';
            setShowProductAttributes(isBasicDetailsFilled);
        }
    }, [basicDetails, editMode]);

    useEffect(() => {
        if (basicDetails.category && !editMode && isNewCategory) {
            const categoryLower = basicDetails.category.toLowerCase();
            const existingAttributes = categoryCustomAttributes[categoryLower];

            if (!existingAttributes || existingAttributes.length === 0) {
                const timer = setTimeout(() => {
                    setAddAttributesOpen(true);
                    setIsNewCategory(false);
                }, 500);

                return () => clearTimeout(timer);
            } else {
                setIsNewCategory(false);
            }
        }
    }, [basicDetails.category, categoryCustomAttributes, editMode, isNewCategory]);

    useEffect(() => {
        const loadCategoryAttributesFromServer = async () => {
            const categoryName = basicDetails.category?.trim();
            if (!categoryName) return;

            const categoryLower = categoryName.toLowerCase();
            const catObj = categoriesRaw.find(c =>
                (c.name || c.category_name || '').toLowerCase() === categoryLower
            );

            if (!catObj?.id) return;

            try {
                const attributes = await getCategoryAttributes(catObj.id);
                const normalizedAttrs = normalizeCategoryAttributeDefinitions(attributes);

                if (normalizedAttrs.length === 0) return;

                setCategoryCustomAttributes(prev => {
                    const existingAttrs = prev[categoryLower] || [];
                    const mergedAttrs = [...existingAttrs];

                    normalizedAttrs.forEach(attr => {
                        const existingIndex = mergedAttrs.findIndex(existingAttr => {
                            if (existingAttr.id && attr.id && existingAttr.id === attr.id) return true;
                            return (existingAttr.labelName || '').toLowerCase() === (attr.labelName || '').toLowerCase();
                        });

                        if (existingIndex >= 0) {
                            mergedAttrs[existingIndex] = { ...mergedAttrs[existingIndex], ...attr };
                        } else {
                            mergedAttrs.push(attr);
                        }
                    });

                    return { ...prev, [categoryLower]: mergedAttrs };
                });
            } catch (error) {
                console.error('Failed to load category attributes from server:', error);
            }
        };

        loadCategoryAttributesFromServer();
    }, [basicDetails.category, categoriesRaw]);

    // Load attribute values from DB whenever custom attributes change (category selected)
    useEffect(() => {
        const loadAttributeOptions = async () => {
            const categoryLower = basicDetails.category?.toLowerCase();
            if (!categoryLower) return;
            const customAttrs = categoryCustomAttributes[categoryLower] || [];
            if (customAttrs.length === 0) return;

            const catObj = categoriesRaw.find(c =>
                (c.name || c.category_name || '').toLowerCase() === categoryLower
            );
            const categoryId = catObj?.id;

            for (const attr of customAttrs) {
                const fieldName = (attr.labelName || '').toLowerCase().replace(/\s+/g, '_');
                setAttributeOptionsLoading(prev => ({ ...prev, [fieldName]: true }));
                try {
                    let values = [];
                    if (categoryId) {
                        values = await getAttributeValues(categoryId, attr.labelName);
                    }
                    setAttributeOptions(prev => ({ ...prev, [fieldName]: values }));
                } catch (e) {
                    setAttributeOptions(prev => ({ ...prev, [fieldName]: [] }));
                } finally {
                    setAttributeOptionsLoading(prev => ({ ...prev, [fieldName]: false }));
                }
            }
        };
        loadAttributeOptions();
    }, [basicDetails.category, categoryCustomAttributes, categoriesRaw]);

    // Handler to open the inline add-value modal for a custom attribute
    const handleOpenAddValueModal = (attribute) => {
        setAddValueModal({ open: true, attribute, inputVal: '', saving: false });
    };

    // Handler to save a new value for a custom attribute
    const handleSaveAttributeValue = async () => {

        const { attribute, inputVal } = addValueModal;
        const value = inputVal.trim();

        // Numbers only are not allowed; text, or text with numbers, is fine
        if (!/\p{L}/u.test(value) || hasSpecialCharacters(value)) {
            showToast('Error', 'Value cannot be numbers only. Use letters, or letters with numbers.', 'error');
            return;
        }

        setAddValueModal(prev => ({ ...prev, saving: true }));

        const fieldName = (attribute.labelName || '').toLowerCase().replace(/\s+/g, '_');

        // DEF_009: Prevent duplicate values
        const existingOptions = attributeOptions[fieldName] || [];
        const isDuplicate = existingOptions.some(
            existingValue => existingValue.trim().toLowerCase() === value.toLowerCase()
        );

        if (isDuplicate) {
            showToast('Error', 'This attribute value already exists.', 'error');
            setAddValueModal(prev => ({ ...prev, saving: false }));
            return;
        }

        try {
            const categoryLower = basicDetails.category?.toLowerCase();
            const catObj = categoriesRaw.find(c =>
                (c.name || c.category_name || '').toLowerCase() === categoryLower
            );

            if (catObj?.id && attribute.id) {
                await addAttributeValue(attribute.id, inputVal.trim());
            }

            const newVal = inputVal.trim();
            setAttributeOptions(prev => ({
                ...prev,
                [fieldName]: [...(prev[fieldName] || []), newVal]
            }));

            setCustomAttributeValues(prev => ({ ...prev, [fieldName]: newVal }));
            showToast('Success', `"${newVal}" added to ${attribute.labelName}!`, 'success');
        } catch (err) {
            showToast('Error', err.message || `Failed to add "${inputVal.trim()}" to ${attribute.labelName}.`, 'error');
        } finally {
            setAddValueModal({ open: false, attribute: null, inputVal: '', saving: false });
        }
    };

    const validateBasicDetails = () => {
        const errors = {
            name: '',
            category: '',
            description: ''
        };

        const nameValidation = validateProductName(basicDetails.name);
        if (!nameValidation.isValid) {
            errors.name = nameValidation.message;
        }

        if (!basicDetails.category.trim()) {
            errors.category = 'Category is required';
        }

        if (!basicDetails.description.trim()) {
            errors.description = 'Description is required';
        }

        setValidationErrors(errors);
        return !errors.name && !errors.category && !errors.description;
    };

    const handleBasicDetailsChange = (field, value) => {
        const updatedDetails = { ...basicDetails, [field]: value };
        setBasicDetails(updatedDetails);

        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }

        if (field === 'name') {
            const nameValidation = validateProductName(value);
            if (value.trim() !== '' && !nameValidation.isValid) {
                setValidationErrors(prev => ({ ...prev, name: nameValidation.message }));
            } else if (value.trim() === '') {
                setValidationErrors(prev => ({ ...prev, name: '' }));
            }
        }

        if (field === 'category') {
            setCustomAttributeValues({});

            setProductAttributes(prev => ({
                quantity: prev.quantity,
                unit: prev.unit || 'pcs',
                costPrice: prev.costPrice,
                sellingPrice: prev.sellingPrice,
                color: prev.color,
                size: prev.size,
                barcode: '',
                ...Object.keys(prev).reduce((acc, key) => {
                    if (!['quantity', 'unit', 'costPrice', 'sellingPrice', 'color', 'size', 'barcode'].includes(key)) {
                        acc[key] = '';
                    }
                    return acc;
                }, {})
            }));

            if (!editMode) {
                const isBasicDetailsFilled = updatedDetails.name.trim() !== '' &&
                    updatedDetails.category.trim() !== '' &&
                    updatedDetails.description.trim() !== '';
                setShowProductAttributes(isBasicDetailsFilled);
            }
        }
    };

    const handleAttributesChange = (field, value) => {
        if (field === 'unit') {
            const currentQty = String(productAttributes.quantity ?? '');
            const newQty = isWholeNumberUnit(value) ? currentQty.split('.')[0] : currentQty;
            setProductAttributes(prev => ({ ...prev, unit: value, quantity: newQty }));
            if (newQty !== '') {
                setAttributeValidationErrors(prev => ({ ...prev, quantity: getQuantityError(newQty, value) }));
            }
            return;
        }
        let filteredValue = value;
        if (['quantity', 'costPrice', 'sellingPrice'].includes(field)) {
            // Remove negative signs, letters, and special characters
            filteredValue = filteredValue.replace(/[^0-9.]/g, '');
            // Prevent multiple decimals
            const parts = filteredValue.split('.');
            if (parts.length > 2) {
                filteredValue = parts[0] + '.' + parts.slice(1).join('');
            }
            // Block exactly '0' while typing
            if (filteredValue === '0') {
                filteredValue = '';
            }
        }
        if (field === 'quantity') {
            // Numbers of 1 and above, decimals allowed: drop everything except digits and a single decimal point
            const wholeOnly = isWholeNumberUnit(productAttributes.unit);
            let cleaned = value.replace(wholeOnly ? /[^\d]/g : /[^\d.]/g, '');

            const firstDot = cleaned.indexOf('.');

            if (firstDot !== -1) {
                // Keep only the first decimal point; strip any extra ones
                cleaned =
                    cleaned.slice(0, firstDot + 1) +
                    cleaned.slice(firstDot + 1).replace(/\./g, '');
            }

            // Collapse leading zeros (e.g. "007" -> "7") but keep a leading "0." as typed (e.g. "0.5")
            cleaned = cleaned.replace(/^0+(?=\d)/, '');

            setAttributeValidationErrors(prev => ({
                ...prev,
                quantity: getQuantityError(cleaned, productAttributes.unit)
            }));

            setProductAttributes(prev => ({
                ...prev,
                quantity: cleaned
            }));

            return;
        }

        const isCustomAttribute =
            !['quantity', 'unit', 'costPrice', 'sellingPrice', 'color', 'size', 'barcode']
                .includes(field);

        if (filteredValue.trim() !== '') {
            setAttributeValidationErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }

        if (isCustomAttribute) {
            setCustomAttributeValues(prev => ({
                ...prev,
                [field]: filteredValue
            }));
        } else {
            setProductAttributes(prev => ({
                ...prev,
                [field]: filteredValue
            }));
        }
    };

    const handleGenerateBarcode = () => {
        if (pendingProduct) {
            setBarcodeMode('generated');
            const generatedBarcode = `BAR${Math.floor(100000 + Math.random() * 900000)}`;

            const newProduct = {
                ...pendingProduct,
                barcode: generatedBarcode,
                status: parseFloat(pendingProduct.quantity) === 0 ? 'Out of stock' :
                    parseFloat(pendingProduct.quantity) <= 10 ? 'Low stock' : 'In stock'
            };

            setAddedProducts(prev => [...prev, newProduct]);
            setProductAttributes({ quantity: '', unit: 'pcs', costPrice: '', sellingPrice: '', color: '', size: '', barcode: '' });
            setCustomAttributeValues({});
            setBarcodePopupOpen(false);
            setPendingProduct(null);
            showToast('Success', 'Product variant added successfully with generated barcode!', 'success');
        }
    };

    const handleAddBarcode = (barcodeValue) => {
        const normalizedBarcode = String(barcodeValue || '').trim();
        if (pendingProduct && normalizedBarcode !== '') {
            const BARCODE_PATTERN = /^[A-Za-z0-9]+$/;
            if (!BARCODE_PATTERN.test(normalizedBarcode)) {
                return 'Barcode can contain only letters and numbers.';
            }
            if (/^\d+$/.test(normalizedBarcode)) {
                return 'Barcode cannot be numbers only. Use letters together with numbers.';
            }
            if (/^[A-Za-z]+$/.test(normalizedBarcode)) {
                return 'Barcode cannot be letters only. Use numbers together with letters.';
            }

            // DEF_025: Local duplicate check
            const existsLocally = addedProducts.some(
                product => String(product.barcode || '').trim().toLowerCase() === normalizedBarcode.toLowerCase()
            );
            if (existsLocally) {
                return 'Barcode already exists. Please use a unique barcode.';
            }

            setBarcodeMode('custom');
            const newProduct = {
                ...pendingProduct,
                barcode: normalizedBarcode,
                status: parseFloat(pendingProduct.quantity) === 0 ? 'Out of stock' :
                    parseFloat(pendingProduct.quantity) <= 10 ? 'Low stock' : 'In stock'
            };

            setAddedProducts(prev => [...prev, newProduct]);
            setProductAttributes({ quantity: '', unit: 'pcs', costPrice: '', sellingPrice: '', color: '', size: '', barcode: '' });
            setCustomAttributeValues({});
            setAddBarcodePopupOpen(false);
            setPendingProduct(null);
            showToast('Success', 'Product variant added successfully with custom barcode!', 'success');
        }
    };

    const handleOpenAddBarcode = () => {
        setBarcodePopupOpen(false);
        setAddBarcodePopupOpen(true);
    };

    const handleAddProduct = () => {
        if (!validateBasicDetails()) {
            showToast('Validation Error', 'Please fix the errors in basic details before adding product', 'warning');
            return;
        }

        const currentAttributes = getCurrentCategoryAttributes();

        const requiredErrors = currentAttributes
            .filter(attr => attr.alwaysShow && !(productAttributes[attr.fieldName] || customAttributeValues[attr.fieldName] || '').trim())
            .map(attr => attr.labelName);

        if (requiredErrors.length > 0) {
            const missingAttributes = currentAttributes
                .filter(attr => attr.alwaysShow && !(productAttributes[attr.fieldName] || customAttributeValues[attr.fieldName] || '').trim())
                .reduce((errors, attr) => ({
                    ...errors,
                    [attr.fieldName]: attr.fieldName === 'quantity'
                        ? '* Quantity cannot be empty'
                        : `* Please enter ${attr.labelName}`
                }), {});
            setAttributeValidationErrors(missingAttributes);
            return;
        }
        const quantityError = getQuantityError(productAttributes.quantity, productAttributes.unit);
        if (quantityError) {
            setAttributeValidationErrors(prev => ({ ...prev, quantity: quantityError }));
            return;
        }

        const qtyValue = Number(productAttributes.quantity);
        const cpValue = Number(productAttributes.costPrice);
        const spValue = Number(productAttributes.sellingPrice);

        const newErrors = {};

        if (!Number.isFinite(qtyValue) || qtyValue < 0.1) {
            newErrors.quantity = 'Quantity must be at least 0.1.';
        }

        if (!Number.isFinite(cpValue) || cpValue < 0.1) {
            newErrors.costPrice = 'Cost price must be at least 0.1.';
        }

        if (!Number.isFinite(spValue) || spValue < 0.1) {
            newErrors.sellingPrice = 'Selling price must be at least 0.1.';
        }

        const decimalUnits = ['kg', 'g', 'L', 'ml'];
        if (Number.isFinite(qtyValue) && !decimalUnits.includes(productAttributes.unit || 'pcs') && !Number.isInteger(qtyValue)) {
            newErrors.quantity = 'Please enter a whole number for this unit.';
        }

        if (Object.keys(newErrors).length > 0) {
            setAttributeValidationErrors(newErrors);
            return;
        }

        const customAttrsWithValues = currentAttributes
            .filter(attr => attr.isCustom && customAttributeValues[attr.fieldName])
            .map(attr => ({
                ...attr,
                value: customAttributeValues[attr.fieldName]
            }));

        if (!basicDetails.name || !basicDetails.category) {
            showToast('Validation Error', 'Please enter product name and select a category', 'warning');
            return;
        }

        const nameValidation = validateProductName(basicDetails.name);
        if (!nameValidation.isValid) {
            showToast('Validation Error', nameValidation.message, 'warning');
            return;
        }

        const productWithoutBarcode = {
            id: Date.now(),
            ...basicDetails,
            ...productAttributes,
            ...customAttrsWithValues.reduce((acc, attr) => {
                acc[attr.fieldName] = attr.value;
                return acc;
            }, {})
        };

        setPendingProduct(productWithoutBarcode);
        setBarcodePopupOpen(true);
    };

    const handleFinalAdd = () => {
        if (!validateBasicDetails()) {
            showToast('Validation Error', 'Please fix the errors in basic details', 'warning');
            return;
        }

        if (editMode) {
            const validationErrors = getCurrentCategoryAttributes()
                .filter(attr => attr.alwaysShow && !productAttributes[attr.fieldName])
                .map(attr => attr.labelName);

            if (validationErrors.length > 0) {
                showToast('Validation Error', `Please fill in all required fields: ${validationErrors.join(', ')}`, 'warning');
                return;
            }

            const quantityError = getQuantityError(productAttributes.quantity, productAttributes.unit);
            if (quantityError) {
                setAttributeValidationErrors(prev => ({ ...prev, quantity: quantityError }));
                return;
            }
            setViewProductOpen(true);
            return;
        }

        if (addedProducts.length === 0) {
            showToast('Validation Error', 'Please add at least one product variant', 'warning');
            return;
        }

        setViewProductOpen(true);
    };

    const handleCancel = () => navigate('/product-management');

    const handleDeleteVariant = (index) => {
        setAddedProducts(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteClick = (index) => {
        setProductToDelete(index);
        setDeleteConfirmationOpen(true);
    };

    const handleConfirmDelete = () => {
        if (productToDelete !== null) {
            handleDeleteVariant(productToDelete);
            setDeleteConfirmationOpen(false);
            setProductToDelete(null);
            showToast('Success', 'Product variant deleted successfully!', 'success');
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirmationOpen(false);
        setProductToDelete(null);
    };

    const handleNext = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const nameValidation = validateProductName(basicDetails.name);
            if (!nameValidation.isValid) {
                showToast('Error', nameValidation.message, 'error');
                setIsSubmitting(false);
                return;
            }

            if (editMode && editProductData) {
                const finalCategoryId = getCategoryIdByName(basicDetails.category, categoriesRaw);
                const finalColorId = getColorIdByName(productAttributes.color, colorsRaw);
                const finalSizeId = getSizeIdByName(productAttributes.size, sizesRaw);

                if (!finalCategoryId) {
                    showToast('Error', 'Invalid category selected. Please select a valid category.', 'error');
                    setIsSubmitting(false);
                    return;
                }

                const updateData = {
                    name: basicDetails.name,
                    description: basicDetails.description || '',
                    category_id: finalCategoryId,
                    quantity: parseFloat(productAttributes.quantity),
                    unit: productAttributes.unit || 'pcs',
                    cost_price: parseFloat(productAttributes.costPrice || 0),
                    selling_price: parseFloat(productAttributes.sellingPrice),
                };

                if (productAttributes.color && finalColorId) updateData.color_id = finalColorId;
                if (productAttributes.size && finalSizeId) updateData.size_id = finalSizeId;

                const result = await updateProductWithPrice(
                    editProductData.id,
                    editProductData.priceId,
                    updateData
                );

                if (result.success) {
                    setViewProductOpen(false);
                    navigate('/product-management', { state: { refresh: true, productUpdated: true } });
                } else {
                    showToast('Error', `Failed to update product: ${result.error}`, 'error');
                    setIsSubmitting(false);
                }

            } else {
                const categoryId = getCategoryIdByName(addedProducts[0].category, categoriesRaw);

                if (!categoryId) {
                    showToast('Error', 'Invalid category selected. Please try again.', 'error');
                    setIsSubmitting(false);
                    return;
                }

                const productData = {
                    name: addedProducts[0].name,
                    description: addedProducts[0].description || '',
                    category_id: categoryId,
                };

                const variations = addedProducts.map(product => {
                    const colorId = getColorIdByName(product.color, colorsRaw);
                    const sizeId = getSizeIdByName(product.size, sizesRaw);

                    const variation = {
                        quantity: parseFloat(product.quantity),
                        unit: product.unit || 'pcs',
                        cost_price: parseFloat(product.costPrice || 0),
                        selling_price: parseFloat(product.sellingPrice),
                    };

                    if (product.barcode && product.barcode.trim() !== '') {
                        variation.barcode = product.barcode.trim();
                    }

                    if (colorId) variation.color_id = colorId;
                    if (sizeId) variation.size_id = sizeId;

                    const customAttrs = getCurrentCategoryAttributes().filter(attr => attr.isCustom);
                    customAttrs.forEach(attr => {
                        const value = product[attr.fieldName];
                        if (value && value.trim() !== '') {
                            variation[attr.fieldName] = value;
                        }
                    });

                    return variation;
                });

                const result = await createProduct(productData, variations);

                if (result.success) {
                    setViewProductOpen(false);
                    navigate('/product-management', { state: { refresh: true, newProductAdded: true } });
                } else {
                    showToast('Error', `Failed to create product: ${result.error}`, 'error');
                    setIsSubmitting(false);
                }
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Error', error.message || 'Failed to save product. Please try again.', 'error');
            setIsSubmitting(false);
        }
    };

    const handleOpenNewProductModal = (type) => {
        setNewProductModalType(type);
        setNewProductModalOpen(true);
    };

    const handleCloseNewProductModal = () => {
        setNewProductModalOpen(false);
        setNewProductModalType(null);
    };

    const handleAddNewItem = async (value) => {
        const capitalized = value.charAt(0).toUpperCase() + value.slice(1);

        if (newProductModalType === 'category') {
            if (allCategories.includes(capitalized)) {
                showToast('Warning', `Category "${capitalized}" already exists. Please select it from the list.`, 'warning');
                handleCloseNewProductModal();
                return;
            }

            setIsCreatingCategory(true);

            try {
                const createdCategory = await createCategory(capitalized);
                const categoryId = createdCategory.id;

                const newCategoryObject = {
                    id: categoryId,
                    name: capitalized,
                    category_name: capitalized,
                    attributes: []
                };

                setCategoriesRaw(prev => [...prev, newCategoryObject]);
                setAllCategories(prev => [...prev, capitalized]);

                setIsNewCategory(true);
                handleBasicDetailsChange('category', capitalized);
                showToast('Success', `Category "${capitalized}" created successfully!`, 'success');

                window._newCategoryId = categoryId;

            } catch (error) {
                console.error('❌ Failed to create category on backend:', error);
                showToast('Error', `Failed to create category "${capitalized}" on server. Please try again.`, 'error');

                const newCategoryObject = {
                    id: Date.now(),
                    name: capitalized,
                    category_name: capitalized,
                    attributes: []
                };

                setCategoriesRaw(prev => [...prev, newCategoryObject]);
                setAllCategories(prev => [...prev, capitalized]);

                setIsNewCategory(true);
                handleBasicDetailsChange('category', capitalized);
                showToast('Warning', `Category "${capitalized}" added locally.`, 'warning');

                window._newCategoryId = newCategoryObject.id;
            } finally {
                setIsCreatingCategory(false);
                handleCloseNewProductModal();
            }
        } else {
            if (newProductModalType === 'color' &&
                colors.some(c => c.trim().toLowerCase() === capitalized.trim().toLowerCase())) {
                showToast('Warning', `Color "${capitalized}" already exists. Please select it from the list.`, 'warning');
                handleCloseNewProductModal();
                return;
            }

            try {
                if (newProductModalType === 'color') {
                    await createColor(capitalized);
                    await loadColors();
                    handleAttributesChange('color', capitalized);
                } else if (newProductModalType === 'size') {
                    await createSize(capitalized);
                    await loadSizes();
                    handleAttributesChange('size', capitalized);
                }
            } catch (error) {
                console.error(`Failed to create ${newProductModalType}:`, error);
                showToast('Error', error.message || `Failed to create ${newProductModalType}. Please try again.`, 'error');

                if (newProductModalType === 'size') {
                    setSizes(prev => [...prev, capitalized]);
                    handleAttributesChange('size', capitalized);
                }
            }
            handleCloseNewProductModal();
        }
    };

    const handleOpenSelectPopup = (type) => {
        setSelectPopupType(type);
        setSelectPopupOpen(true);
    };

    const handleCloseSelectPopup = () => {
        setSelectPopupOpen(false);
        setSelectPopupType(null);
    };

    const handleSelectItem = (selectedValue) => {
        if (!selectedValue) return;
        const capitalized = selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1);
        if (selectPopupType === 'category') {
            setIsNewCategory(false);
            handleBasicDetailsChange(selectPopupType, capitalized);
        } else if (selectPopupType === 'color' || selectPopupType === 'size') {
            handleAttributesChange(selectPopupType, capitalized);
        } else {
            handleAttributesChange(selectPopupType, selectedValue);
        }
        handleCloseSelectPopup();
    };

    const getExistingItems = () => {
        switch (selectPopupType) {
            case 'category': return allCategories;
            case 'color': return colors;
            case 'size': return sizes;
            default:
                if (selectPopupType && attributeOptions[selectPopupType]) {
                    return attributeOptions[selectPopupType];
                }
                return [];
        }
    };

    const getSelectPopupTitle = () => {
        switch (selectPopupType) {
            case 'category': return loadingCategories ? 'Loading categories...' : 'Select category';
            case 'color': return loadingColors ? 'Loading colors...' : 'Select colour';
            case 'size': return loadingSizes ? 'Loading sizes...' : 'Select size';
            default:
                if (selectPopupType) {
                    const formattedName = selectPopupType.replace(/_/g, ' ');
                    const titleName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
                    return `Select ${titleName}`;
                }
                return 'Select item';
        }
    };

    const renderAttributeField = (attribute) => {
        const { labelName, fieldName, type } = attribute;

        if (type === 'select') {
            const items = fieldName === 'color' ? colors : sizes;
            const loading = fieldName === 'color' ? loadingColors : loadingSizes;
            const placeholder = loading ? "Loading..." : `Select ${labelName.toLowerCase()}`;

            return (
                <div className={`form-group ${fieldName}-field`}>
                    <label>{labelName}</label>
                    <div className={`${fieldName}-input-container`}>
                        <div className="select-wrapper">
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={productAttributes[fieldName] || ''}
                                readOnly
                                className={`form-input ${fieldName}-input`}
                                onClick={() => !loading && handleOpenSelectPopup(fieldName)}
                                disabled={loading}
                            />
                            <img src={dropdownIcon} alt="Dropdown" className="dropdown-icon" />
                        </div>
                        <div className="add-button-container">
                            <AddButton
                                onClick={() => handleOpenNewProductModal(fieldName)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    {attributeValidationErrors[fieldName] && (
                        <span className="validation-error">{attributeValidationErrors[fieldName]}</span>
                    )}
                </div>
            );
        } else if (attribute.isCustom) {
            // A custom attribute named Color/Size is backed by the shared colours/sizes lists
            // (the product save resolves color_id / size_id from them), so use those here.
            const usesGlobalList = fieldName === 'color' || fieldName === 'size';
            const loading = usesGlobalList
                ? (fieldName === 'color' ? loadingColors : loadingSizes)
                : (attributeOptionsLoading[fieldName] || false);
            const selectedVal = usesGlobalList
                ? (productAttributes[fieldName] || '')
                : (customAttributeValues[fieldName] || '');
            const placeholder = loading ? "Loading..." : `Select ${labelName.toLowerCase()}`;
            const handleAddClick = () => usesGlobalList
                ? handleOpenNewProductModal(fieldName)
                : handleOpenAddValueModal(attribute);

            return (
                <div className={`form-group ${fieldName}-field`}>
                    <label>{labelName}</label>
                    <div className="custom-attr-input-container">
                        <div className="select-wrapper custom-attr-select-wrapper">
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={selectedVal}
                                readOnly
                                className="form-input custom-attr-select"
                                onClick={() => !loading && handleOpenSelectPopup(fieldName)}
                                disabled={loading}
                            />
                            <img src={dropdownIcon} alt="Dropdown" className="dropdown-icon custom-attr-dropdown-icon" />
                        </div>
                        <AddButton
                            onClick={handleAddClick}
                            title={`Add new ${labelName}`}
                            className="custom-attr-add-btn"
                        />
                    </div>
                    {attributeValidationErrors[fieldName] && (
                        <span className="validation-error">{attributeValidationErrors[fieldName]}</span>
                    )}
                </div>
            );
        } else {
            const value = productAttributes[fieldName] || '';
            const placeholder = `Type your ${labelName.toLowerCase()}`;
            const onChange = (e) => handleAttributesChange(fieldName, e.target.value);

            if (fieldName === 'quantity') {
                return (
                    <div className={`form-group ${fieldName}-field`}>
                        <label>{labelName}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type={type === 'number' ? 'number' : 'text'}
                                min={fieldName === 'quantity' ? "0.1" : undefined}
                                placeholder={placeholder}
                                value={value}
                                onChange={onChange}
                                step={isWholeNumberUnit(productAttributes.unit) ? '1' : 'any'}
                                onKeyDown={(e) => {
                                    const blocked = isWholeNumberUnit(productAttributes.unit) ? ['-', '+', 'e', 'E', '.'] : ['-', '+', 'e', 'E'];
                                    if (blocked.includes(e.key)) e.preventDefault();
                                }}
                                onPaste={(e) => {
                                    const pattern = isWholeNumberUnit(productAttributes.unit) ? /[-+eE.]/ : /[-+eE]/;
                                    if (pattern.test(e.clipboardData.getData('text'))) e.preventDefault();
                                }}
                                className="form-input"
                                style={{ flex: 1 }}
                            />
                            <select
                                value={productAttributes.unit || 'pcs'}
                                onChange={(e) => handleAttributesChange('unit', e.target.value)}
                                className="form-input"
                                style={{ width: '80px', padding: '0 10px', backgroundColor: '#f7fbff' }}
                            >
                                <option value="pcs">pcs</option>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="L">L</option>
                                <option value="ml">ml</option>
                                <option value="box">box</option>
                                <option value="pack">pack</option>
                            </select>
                        </div>
                        {attributeValidationErrors[fieldName] && (
                            <span className="validation-error">{attributeValidationErrors[fieldName]}</span>
                        )}
                    </div>
                );
            }

            return (
                <div className={`form-group ${fieldName}-field`}>
                    <label>{labelName}</label>
                    <input
                        type={type === 'number' ? 'number' : 'text'}
                        inputMode={fieldName === 'quantity' ? 'decimal' : undefined}
                        min={['costPrice', 'sellingPrice', 'quantity'].includes(fieldName) ? '0.1' : undefined}
                        step={['costPrice', 'sellingPrice'].includes(fieldName) ? '0.01' : undefined}
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        onKeyDown={(e) => type === 'number' && ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                        className="form-input"
                    />
                    {attributeValidationErrors[fieldName] && (
                        <span className="validation-error">{attributeValidationErrors[fieldName]}</span>
                    )}
                </div>
            );
        }
    };

    const handleDashboardClick = () => navigate('/dashboard');
    const handleProductClick = () => navigate('/product-management');
    const handleSalesClick = () => navigate('/sales-management');
    const handleLogoClick = () => navigate('/');

    const getViewProductData = () => {
        if (editMode && editProductData) {
            return {
                basicDetails: {
                    name: basicDetails.name,
                    category: basicDetails.category,
                    description: basicDetails.description
                },
                addedProducts: [{
                    id: editProductData.id,
                    color: productAttributes.color,
                    size: productAttributes.size,
                    quantity: productAttributes.quantity,
                    unit: productAttributes.unit || 'pcs',
                    sellingPrice: productAttributes.sellingPrice,
                    costPrice: productAttributes.costPrice,
                    customAttributes: { ...customAttributeValues },
                    ...customAttributeValues
                }]
            };
        } else {
            return {
                basicDetails: addedProducts.length > 0 ? {
                    name: addedProducts[0].name,
                    category: addedProducts[0].category,
                    description: addedProducts[0].description
                } : null,
                addedProducts: addedProducts.map(p => {
                    const customAttrs = p.customAttributes ? { ...p.customAttributes } : {};
                    Object.keys(p).forEach(key => {
                        if (!['id', 'name', 'category', 'description', 'color', 'size', 'quantity', 'unit', 'sellingPrice', 'costPrice', 'barcode', 'status', 'customAttributes'].includes(key)) {
                            customAttrs[key] = p[key];
                        }
                    });
                    return {
                        id: p.id,
                        color: p.color,
                        size: p.size,
                        quantity: p.quantity,
                        unit: p.unit || 'pcs',
                        sellingPrice: p.sellingPrice,
                        costPrice: p.costPrice,
                        customAttributes: customAttrs,
                        ...customAttrs
                    };
                })
            };
        }
    };

    const viewProductData = getViewProductData();
    const currentCategoryAttributes = getCurrentCategoryAttributes();

    const getCustomAttributesForDisplay = (product) => {
        const customAttrs = currentCategoryAttributes.filter(attr => attr.isCustom);
        const displayAttrs = [];

        customAttrs.forEach(attr => {
            const value = product[attr.fieldName];
            if (value && value.trim() !== '') {
                displayAttrs.push({
                    label: attr.labelName,
                    fieldName: attr.fieldName,
                    value: value
                });
            }
        });

        return displayAttrs;
    };

    const handleSaveAttributes = async (newAttributes) => {
        const categoryLower = basicDetails.category.toLowerCase();
        const currentAttrs = categoryCustomAttributes[categoryLower] || [];

        // Skip labels that are already in the list (case-insensitive)
        const knownLabels = new Set(currentAttrs.map(a => (a.labelName || '').toLowerCase()));
        const attrsToAdd = newAttributes.filter(attr => {
            const key = (attr.labelName || '').trim().toLowerCase();
            if (!key || knownLabels.has(key)) return false;
            knownLabels.add(key);
            return true;
        });

        if (attrsToAdd.length === 0) {
            showToast('Warning', 'These attributes already exist for this category.', 'warning');
            setAddAttributesOpen(false);
            return;
        }

        // Show the new attributes in the list immediately
        setCategoryCustomAttributes(prev => ({
            ...prev,
            [categoryLower]: [...(prev[categoryLower] || []), ...attrsToAdd]
        }));

        try {
            const catObj = categoriesRaw.find(c =>
                (c.name || c.category_name || '').toLowerCase() === categoryLower
            );
            const categoryId = catObj?.id || window._newCategoryId;

            if (categoryId) {
                const attributesForDb = attrsToAdd.map(attr => ({
                    attribute_name: attr.labelName.trim(),
                    attribute_type: attr.type || 'text',
                    is_required: true
                }));

                await createAttributesBulk(categoryId, attributesForDb);
                showToast('Success', `${attrsToAdd.length} custom attribute(s) saved to database!`, 'success');

                // Re-sync with the server so the list carries the real attribute ids
                const serverAttrs = normalizeCategoryAttributeDefinitions(await getCategoryAttributes(categoryId));
                if (serverAttrs.length > 0) {
                    setCategoryCustomAttributes(prev => {
                        const merged = [...(prev[categoryLower] || [])];
                        serverAttrs.forEach(attr => {
                            const idx = merged.findIndex(existing =>
                                (existing.labelName || '').toLowerCase() === (attr.labelName || '').toLowerCase()
                            );
                            if (idx >= 0) merged[idx] = { ...merged[idx], ...attr };
                            else merged.push(attr);
                        });
                        return { ...prev, [categoryLower]: merged };
                    });
                }
            } else {
                showToast('Success', `${attrsToAdd.length} custom attribute(s) added locally!`, 'success');
            }
        } catch (error) {
            console.error('Failed to save attributes to database:', error);
            showToast('Warning', error.message || 'Attributes saved locally but failed to save to database.', 'warning');
        }

        setAddAttributesOpen(false);
    };

    return (
        <div className="add-product-page">
            <Sidebar
                activeItem="product"
                onDashboardClick={handleDashboardClick}
                onProductClick={handleProductClick}
                onSalesClick={handleSalesClick}
                onLogoClick={handleLogoClick}
            />

            <Header
                title={editMode ? "Edit Product" : "Add Products"}
                subtitle={editMode ? "Update the product information below" : "Fill in the product information below"}
            />

            <div className="add-product-content">
                <div className="form-containers-wrapper">
                    <div className="form-container">
                        <div className="container-header">
                            <h3 className="container-title">Basic details</h3>
                        </div>
                        <div className="container-content">
                            <div className="basic-details-grid">
                                <div className="form-group name-field">
                                    <label>Product Name</label>
                                    <input
                                        type="text"
                                        placeholder="E.g. T-shirt"
                                        value={basicDetails.name}
                                        onChange={(e) => handleBasicDetailsChange('name', e.target.value)}
                                        className="form-input"
                                        maxLength={255}
                                    />
                                    {validationErrors.name && (
                                        <span className="validation-error">{validationErrors.name}</span>
                                    )}
                                </div>

                                <div className="form-group description-field">
                                    <label>Description</label>
                                    <textarea
                                        placeholder="Type your description"
                                        value={basicDetails.description}
                                        onChange={(e) => handleBasicDetailsChange('description', e.target.value)}
                                        className="form-textarea"
                                        rows="3"
                                    />
                                    {validationErrors.description && (
                                        <span className="validation-error">{validationErrors.description}</span>
                                    )}
                                </div>

                                <div className="form-group category-field">
                                    <label>Category</label>
                                    <div className="category-input-container">
                                        <div className="select-wrapper">
                                            <input
                                                type="text"
                                                placeholder={loadingCategories ? "Loading..." : "Search category"}
                                                value={basicDetails.category}
                                                readOnly
                                                className="form-input category-input"
                                                onClick={() => !loadingCategories && handleOpenSelectPopup('category')}
                                                disabled={loadingCategories}
                                            />
                                            <img src={dropdownIcon} alt="Dropdown" className="dropdown-icon" />
                                        </div>
                                        <div className="add-button-container">
                                            <AddButton
                                                onClick={() => handleOpenNewProductModal('category')}
                                                disabled={loadingCategories || isCreatingCategory}
                                            />
                                        </div>
                                    </div>
                                    {validationErrors.category && (
                                        <span className="validation-error">{validationErrors.category}</span>
                                    )}
                                    {categoryError && <span className="category-error">{categoryError}</span>}
                                    {!showProductAttributes && !editMode && (
                                        <span className="category-hint">*Select a category to view and add relevant product attributes.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {showProductAttributes && (
                        <div className="form-container">
                            <div className="container-header">
                                <h3 className="container-title">Product attributes</h3>
                            </div>
                            <div className="container-content">
                                <div className="product-attributes-grid">
                                    <div className="attribute-row first-row">
                                        {currentCategoryAttributes
                                            .filter(attr => ['quantity'].includes(attr.fieldName))
                                            .map(attribute => (
                                                <React.Fragment key={attribute.fieldName}>
                                                    {renderAttributeField(attribute)}
                                                </React.Fragment>
                                            ))}
                                    </div>

                                    <div className="attribute-row second-row">
                                        {currentCategoryAttributes
                                            .filter(attr => ['costPrice', 'sellingPrice'].includes(attr.fieldName))
                                            .map(attribute => (
                                                <React.Fragment key={attribute.fieldName}>
                                                    {renderAttributeField(attribute)}
                                                </React.Fragment>
                                            ))}
                                    </div>

                                    {currentCategoryAttributes
                                        .filter(attr => attr.isCustom)
                                        .map(attribute => (
                                            <div className="attribute-row" key={attribute.fieldName}>
                                                {renderAttributeField(attribute)}
                                            </div>
                                        ))}
                                </div>
                                {!editMode && (
                                    <div className="form-actions">
                                        <SaveButton onClick={handleAddProduct} title="Add" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!editMode && addedProducts.length > 0 && (
                        <div className="form-container">
                            <div className="container-header">
                                <h3 className="container-title">Added product</h3>
                            </div>
                            <div className="container-content">
                                <div className="product-cards-grid">
                                    {addedProducts.map((product, index) => {
                                        const customAttrs = getCustomAttributesForDisplay(product);

                                        return (
                                            <div key={product.id} className="product-card">
                                                <div className="product-card-header">
                                                    <h4 className="product-card-title">Attributes {index + 1}</h4>
                                                    <button
                                                        className="delete-variant-btn"
                                                        onClick={() => handleDeleteClick(index)}
                                                        title="Delete this variant"
                                                    >
                                                        <img src={deleteIcon} alt="Delete" className="delete-icon" />
                                                    </button>
                                                </div>
                                                <div className="product-card-content">
                                                    {product.color && product.color.trim() !== '' && (
                                                        <div className="product-attribute">
                                                            <img src={colorIcon} alt="Color" className="attr-icon" />
                                                            <div className="attr-details">
                                                                <span className="attr-label">Color</span>
                                                                <span className="attr-value">{product.color}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {product.size && product.size.trim() !== '' && (
                                                        <div className="product-attribute">
                                                            <img src={sizeIcon} alt="Size" className="attr-icon" />
                                                            <div className="attr-details">
                                                                <span className="attr-label">Size</span>
                                                                <span className="attr-value">{product.size}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {product.quantity && (
                                                        <div className="product-attribute">
                                                            <img src={quantityIcon} alt="Quantity" className="attr-icon" />
                                                            <div className="attr-details">
                                                                <span className="attr-label">Quantity</span>
                                                                <span className="attr-value">{product.quantity} {product.unit || 'pcs'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {product.sellingPrice && (
                                                        <div className="product-attribute">
                                                            <img src={priceIcon} alt="Price" className="attr-icon" />
                                                            <div className="attr-details">
                                                                <span className="attr-label">Price</span>
                                                                <span className="attr-value">Rs {product.sellingPrice}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {product.costPrice && (
                                                        <div className="product-attribute">
                                                            <img src={priceIcon} alt="Cost Price" className="attr-icon" />
                                                            <div className="attr-details">
                                                                <span className="attr-label">Cost Price</span>
                                                                <span className="attr-value">Rs {product.costPrice}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {customAttrs.map(attr => (
                                                        <div className="product-attribute" key={attr.fieldName}>
                                                            <img
                                                                src={getAttributeIcon(attr.label) || quantityIcon}
                                                                alt={attr.label}
                                                                className="attr-icon"
                                                            />
                                                            <div className="attr-details">
                                                                <span className="attr-label">{attr.label}</span>
                                                                <span className="attr-value">{attr.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="final-actions">
                                    <button onClick={handleCancel} className="cancel-btn">Cancel</button>
                                    <button onClick={handleFinalAdd} className="final-add-btn">Add</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {editMode && (
                        <div className="final-actions">
                            <button onClick={handleCancel} className="cancel-btn">Cancel</button>
                            <button onClick={handleFinalAdd} className="final-add-btn">Update</button>
                        </div>
                    )}
                </div>
            </div>

            <NewProduct
                isOpen={newProductModalOpen}
                onClose={handleCloseNewProductModal}
                type={newProductModalType}
                onAdd={handleAddNewItem}
            />

            <SelectPopup
                isOpen={selectPopupOpen}
                onClose={handleCloseSelectPopup}
                onSave={handleSelectItem}
                title={getSelectPopupTitle()}
                existingOptions={getExistingItems()}
                type="select"
            />

            <ViewProduct
                isOpen={viewProductOpen}
                onClose={() => setViewProductOpen(false)}
                addedProducts={viewProductData.addedProducts}
                basicDetails={viewProductData.basicDetails}
                onNext={handleNext}
                onDeleteVariant={handleDeleteVariant}
                isSubmitting={isSubmitting}
                showBarcodeButton={false}
            />

            <DeleteConfirmationPopup
                isOpen={deleteConfirmationOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />

            <AddAttributes
                isOpen={addAttributesOpen}
                onClose={() => setAddAttributesOpen(false)}
                onSave={handleSaveAttributes}
                categoryName={basicDetails.category}
            />

            {/* Add-Value Modal for custom attributes — styled like AddCategory */}
            {addValueModal.open && (
                <div className="modal-overlay" onClick={() => !addValueModal.saving && setAddValueModal({ open: false, attribute: null, inputVal: '', saving: false })}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add {addValueModal.attribute?.labelName}</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setAddValueModal({ open: false, attribute: null, inputVal: '', saving: false })}
                                disabled={addValueModal.saving}
                            >&#x2715;</button>
                        </div>

                        <div className="modal-content">
                            <div className="modal-form-group">
                                <label className="modal-label">{addValueModal.attribute?.labelName}</label>
                                <input
                                    type="text"
                                    className="modal-input"
                                    placeholder={`Type your ${addValueModal.attribute?.labelName?.toLowerCase()}`}
                                    value={addValueModal.inputVal}
                                    autoFocus
                                    onChange={e => setAddValueModal(prev => ({ ...prev, inputVal: stripSpecialCharacters(e.target.value) }))}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveAttributeValue(); }}
                                    disabled={addValueModal.saving}
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="add-value-confirm-btn"
                                onClick={handleSaveAttributeValue}
                                disabled={addValueModal.saving || !addValueModal.inputVal.trim()}
                            >
                                {addValueModal.saving ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NewBarcode
                isOpen={barcodePopupOpen}
                onClose={() => {
                    setBarcodePopupOpen(false);
                    setPendingProduct(null);
                }}
                onAddBarcode={handleAddBarcode}
                onGenerateBarcode={handleGenerateBarcode}
                onOpenAddBarcode={handleOpenAddBarcode}
            />

            <AddBarcode
                isOpen={addBarcodePopupOpen}
                onClose={() => {
                    setAddBarcodePopupOpen(false);
                    setPendingProduct(null);
                }}
                onSave={handleAddBarcode}
                pendingProduct={pendingProduct}
            />
        </div>
    );
};

export default AddProduct;