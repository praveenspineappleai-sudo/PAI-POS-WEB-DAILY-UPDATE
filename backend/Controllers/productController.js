// // Developed by M.Vaishnavi | Start: 01/4 | End: 02/4

// const { Product, Category, Price, Barcode } = require("../models");
// const db = require("../config/db");
// const bwipjs = require("bwip-js");
// const fs = require("fs");
// const path = require("path");
// const { Op } = require("sequelize");

// // Get all products
// const getAllProducts = async (req, res) => {
//   try {
//     const products = await Product.findAll({
//       include: {
//         model: Category,
//         as: "categorys",
//       },
//     });

//     res.status(200).json(products);
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ error: "Failed to fetch products", details: error.message });
//   }
// };

// // Get product by ID
// const getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await Product.findByPk(id, {
//       include: [{ model: Price, as: "prices" }],
//     });

//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     res.status(200).json({ product });
//   } catch (error) {
//     console.error("Error retrieving product:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// // Create a product (original method)
// const createProduct = async (req, res) => {
//   const { name, description, categorys_id } = req.body;

//   try {
//     // Validate category existence
//     const category = await Category.findByPk(categorys_id);
//     if (!category) {
//       return res.status(404).json({ error: "Category not found" });
//     }

//     // Create product with explicit timestamp handling
//     const newProduct = await Product.create({
//       name,
//       description,
//       categorys_id,
//       created_at: new Date(),
//       updated_at: new Date(),
//     });

//     res.status(201).json(newProduct);
//   } catch (error) {
//     console.error("Product creation error:", error);
//     res.status(500).json({
//       error: "Failed to create product",
//       details: error.message,
//     });
//   }
// };

// // Function to generate barcode image
// const generateBarcode = async (barcode_no) => {
//   const barcodeDir = path.join(__dirname, "../public/barcodes");
//   const barcodePath = path.join(barcodeDir, `${barcode_no}.png`);

//   return new Promise((resolve, reject) => {
//     // Ensure the folder exists
//     fs.mkdir(barcodeDir, { recursive: true }, (err) => {
//       if (err) return reject(err);

//       bwipjs.toBuffer(
//         {
//           bcid: "code128",
//           text: barcode_no,
//           scale: 3,
//           height: 10,
//           includetext: true,
//           textxalign: "center",
//           backgroundcolor: "ffffff",
//         },
//         (err, buffer) => {
//           if (err) return reject(err);

//           fs.writeFile(barcodePath, buffer, (err) => {
//             if (err) return reject(err);
//             resolve(barcodePath);
//           });
//         }
//       );
//     });
//   });
// };

// // Update a product
// const updateProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, categorys_id } = req.body;

//     const product = await Product.findByPk(id);
//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     // Update with explicit timestamp
//     await product.update({
//       name,
//       description,
//       categorys_id,
//       updated_at: new Date()
//     });

//     res.status(200).json({ message: "Product updated successfully", product });
//   } catch (error) {
//     console.error("Error updating product:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// // Delete a product
// const deleteProduct = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await Product.findByPk(id);
//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     // Step 1: Retrieve barcode IDs from related price entries
//     const barcodeEntries = await Price.findAll({
//       attributes: ["barcode_id"],
//       where: { product_id: id },
//     });

//     // Extract barcode IDs into an array
//     const barcodeIdList = barcodeEntries.map((entry) => entry.barcode_id);

//     // Step 2: Retrieve barcode entries to delete their images
//     const barcodes = await Barcode.findAll({
//       where: { id: { [Op.in]: barcodeIdList } },
//     });

//     // Step 3: Delete related price entries first
//     await Price.destroy({ where: { product_id: id } });

//     // Step 4: Delete barcode images from the filesystem
//     barcodes.forEach((barcode) => {
//       if (barcode.barcode_image) {
//         const barcodeImagePath = path.join(
//           __dirname,
//           "../public/barcodes",
//           path.basename(barcode.barcode_image)
//         );

//         console.log(`Checking if file exists: ${barcodeImagePath}`);

//         if (fs.existsSync(barcodeImagePath)) {
//           fs.unlinkSync(barcodeImagePath);
//           console.log(`Deleted barcode image: ${barcodeImagePath}`);
//         } else {
//           console.warn(`Barcode image file not found: ${barcodeImagePath}`);
//         }
//       }
//     });

//     // Step 5: Delete barcode entries linked to deleted prices
//     await Barcode.destroy({
//       where: { id: { [Op.in]: barcodeIdList } },
//     });

//     // Step 6: Delete the product itself
//     await product.destroy();

//     res.status(200).json({
//       message:
//         "Product, related prices, barcodes, and barcode images deleted successfully",
//     });
//   } catch (error) {
//     console.error("Error deleting product:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// const addProductAttributes = async (req, res) => {
//   const {
//     product_id,
//     color_id,
//     size_id,
//     quantity,
//     cost_price,
//     selling_price,
//     barcode_id,
//   } = req.body;

//   console.log("Received product_id:", product_id, typeof product_id);

//   try {
//     if (!product_id || isNaN(product_id)) {
//       return res.status(400).json({ error: "Invalid product_id provided!" });
//     }

//     // Check if product exists
//     const product = await Product.findByPk(product_id);
//     if (!product) {
//       return res.status(404).json({
//         error: `Product ID ${product_id} does not exist in the database!`,
//       });
//     }

//     // Insert pricing details with explicit timestamps
//     await Price.create({
//       product_id,
//       color_id,
//       size_id,
//       quantity,
//       cost_price,
//       selling_price,
//       barcode_id,
//       created_at: new Date(),
//       updated_at: new Date(),
//     });

//     res.status(200).json({
//       message: "Attributes added successfully!",
//       product_id,
//       color_id,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Server error while adding attributes" });
//   }
// };

// // Add a new product (improved version)
// const addProduct = async (req, res) => {
//   try {
//     const { name, description, categorys_id } = req.body;

//     if (!name || !description || !categorys_id) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Validate category existence
//     const category = await Category.findByPk(categorys_id);
//     if (!category) {
//       return res.status(404).json({ error: "Category not found" });
//     }

//     // Check if the product already exists
//     const existingProduct = await Product.findOne({
//       where: { name, categorys_id },
//     });
//     if (existingProduct) {
//       return res.status(409).json({ error: "Product already exists" });
//     }

//     // Create product with explicit timestamps
//     const product = await Product.create({
//       name,
//       description,
//       categorys_id,
//       created_at: new Date(),
//       updated_at: new Date(),
//     });

//     res
//       .status(201)
//       .json({ message: "Product added successfully", product_id: product.id });
//   } catch (error) {
//     console.error("Unexpected error:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// // Add pricing details & generate barcode
// const addPricing = async (req, res) => {
//   try {
//     const { product_id, variations } = req.body;

//     if (!product_id || !variations.length) {
//       return res
//         .status(400)
//         .json({ error: "Product ID and variations are required" });
//     }

//     // Validate product exists
//     const product = await Product.findByPk(product_id);
//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     for (const variant of variations) {
//       const { color_id, size_id, quantity, cost_price, selling_price } =
//         variant;

//       // Generate barcode
//       const barcode_no = `${product_id} ${color_id} ${size_id}`;
//       const barcode_image = await generateBarcode(barcode_no);

//       // Insert into barcodes table with explicit timestamps
//       const barcode = await Barcode.create({
//         barcode_no,
//         barcode_image,
//         created_at: new Date(),
//         updated_at: new Date(),
//       });

//       // Insert into prices table with explicit timestamps
//       await Price.create({
//         cost_price,
//         selling_price,
//         quantity,
//         barcode_id: barcode.id,
//         product_id,
//         color_id,
//         size_id,
//         created_at: new Date(),
//         updated_at: new Date(),
//       });
//     }

//     res
//       .status(201)
//       .json({ success: true, message: "All variations saved successfully!" });
//   } catch (error) {
//     console.error("Unexpected error:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// const editPrice = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { color_id, size_id, quantity, cost_price, selling_price } = req.body;

//     console.log("URL Params:", req.params);
//     console.log("Incoming request data:", req.body);

//     // Step 1: Find the price entry using the ID from the URL
//     const price = await Price.findByPk(id);
//     if (!price) {
//       return res.status(404).json({ error: "Price entry not found" });
//     }

//     console.log("Existing price entry before update:", price);

//     // Step 2: Check if color_id or size_id has changed
//     const colorChanged = color_id !== undefined && color_id !== price.color_id;
//     const sizeChanged = size_id !== undefined && size_id !== price.size_id;

//     // Step 3: Update the price entry in the database
//     await price.update({
//       cost_price: cost_price !== undefined ? cost_price : price.cost_price,
//       selling_price:
//         selling_price !== undefined ? selling_price : price.selling_price,
//       quantity: quantity !== undefined ? quantity : price.quantity,
//       color_id: color_id !== undefined ? color_id : price.color_id,
//       size_id: size_id !== undefined ? size_id : price.size_id,
//       updated_at: new Date(), // Explicit timestamp update
//     });

//     await price.reload(); // Ensure latest data is retrieved

//     console.log("Updated price entry:", price);

//     // Step 4: Find the associated barcode entry
//     const barcode = await Barcode.findByPk(price.barcode_id);
//     if (!barcode) {
//       return res
//         .status(404)
//         .json({ error: "Barcode not found for this price entry" });
//     }

//     console.log("Existing barcode entry:", barcode);

//     // Step 5: Regenerate barcode image only if color_id or size_id has changed
//     if (colorChanged || sizeChanged) {
//       console.log(
//         `Regenerating barcode for ID ${price.barcode_id} due to color/size change.`
//       );
//       const newBarcodeNo = `${price.product_id} ${price.color_id} ${price.size_id}`;
//       const newBarcodePath = await generateBarcode(newBarcodeNo);

//       // Step 6: Update barcode record with new image
//       await barcode.update({
//         barcode_no: newBarcodeNo,
//         barcode_image: newBarcodePath,
//         updated_at: new Date(), // Explicit timestamp update
//       });

//       console.log("New barcode image path:", newBarcodePath);

//       return res.status(200).json({
//         success: true,
//         message: "Price and barcode updated successfully!",
//         updated_price: price,
//         updated_barcode: barcode,
//         barcode_image: newBarcodePath,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Price updated successfully (Barcode unchanged)",
//       updated_price: price,
//     });
//   } catch (error) {
//     console.error("Error updating pricing variations:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// const deletePrice = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Step 1: Find the price entry
//     const price = await Price.findByPk(id);
//     if (!price) {
//       return res.status(404).json({ error: "Price entry not found" });
//     }

//     console.log("Existing price entry before deletion:", price);

//     // Step 2: Find the associated barcode entry
//     const barcode = await Barcode.findByPk(price.barcode_id);
//     if (barcode) {
//       console.log("Existing barcode entry before deletion:", barcode);

//       // Step 3: Delete barcode image from the filesystem
//       if (barcode.barcode_image) {
//         const barcodeImagePath = path.join(
//           __dirname,
//           "../public/barcodes",
//           path.basename(barcode.barcode_image)
//         );

//         console.log(`Checking if file exists: ${barcodeImagePath}`);

//         if (fs.existsSync(barcodeImagePath)) {
//           fs.unlinkSync(barcodeImagePath);
//           console.log(`Deleted barcode image: ${barcodeImagePath}`);
//         } else {
//           console.warn(`Barcode image file not found: ${barcodeImagePath}`);
//         }
//       }

//       // Step 4: Delete barcode entry from database
//       await barcode.destroy();
//     }

//     // Step 5: Delete the price entry itself
//     await price.destroy();

//     res.status(200).json({
//       success: true,
//       message: "Price and related barcode deleted successfully!",
//     });
//   } catch (error) {
//     console.error("Error deleting price entry:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// const getPrice = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const price = await Price.findByPk(id, {
//       include: [{ model: Barcode, as: "barcode" }],
//     });

//     if (!price) {
//       return res.status(404).json({ error: "Price entry not found" });
//     }

//     // Extract barcode details using the correct alias
//     const barcodeDetails = price.barcode
//       ? {
//           barcode_no: price.barcode.barcode_no,
//           barcode_image: `/public/barcodes/${path.basename(
//             price.barcode.barcode_image
//           )}`,
//         }
//       : null;

//     res.status(200).json({
//       success: true,
//       price,
//       barcode: barcodeDetails,
//     });
//   } catch (error) {
//     console.error("Error fetching price details:", error);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: error.message });
//   }
// };

// module.exports = {
//   getAllProducts,
//   getProductById,
//   updateProduct,
//   deleteProduct,
//   addProductAttributes,
//   createProduct,
//   addProduct,
//   addPricing,
//   editPrice,
//   deletePrice,
//   getPrice,
// };

// Developed by M.Vaishnavi | Start: 01/4 | End: 02/4

const {
  Product,
  Category,
  Price,
  Barcode,
  Order,
  Color,
  Size,
  BusinessDetail,
} = require("../models");
const db = require("../config/db");
const bwipjs = require("bwip-js");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { checkLowStock } = require("./notificationController");
// At the top of your productController.js file
const { sequelize } = require("../models"); // Adjust the path based on your project structure
const rawDb = require("../config/database");

// ✅ Fetch products for a business (only show readable names)
const getAllProducts = async (req, res) => {
  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    const business = await BusinessDetail.findByPk(business_id);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const businessPrefix = `${business.name}.`;

    const products = await Product.findAll({
      include: { model: Category, as: "categorys" },
      where: {
        name: {
          [Op.like]: `${businessPrefix}%`,
        },
      },
    });

    // Remove prefix before sending response
    const filteredProducts = products.map((p) => ({
      ...p.toJSON(),
      name: p.name.replace(`${businessPrefix}`, ""),
    }));

    res.status(200).json(filteredProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch products", details: error.message });
  }
};

// Get product by ID
// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: Category,
          as: "Category",
        },
        {
          model: Price,
          as: "Prices",
          include: [
            { model: Color, as: "Color" },
            { model: Size, as: "Size" },
            {
              model: Barcode,
              as: "Barcode",
              attributes: ["id", "barcode_no", "barcode_image"],
            },
          ],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Helper to remove prefix
    const removePrefix = (name) => {
        if (!name || !name.includes('.')) return name;
        return name.substring(name.indexOf('.') + 1);
    };

    // Remove prefix from product name
    product.name = removePrefix(product.name);

    // Remove prefix from nested prices if applicable
    if (product.Prices && Array.isArray(product.Prices)) {
      product.Prices.forEach(price => {
          if (price.product_name) {
              price.product_name = removePrefix(price.product_name);
          }
      });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error retrieving product:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// ✅ NEW ENDPOINT - Add this function
const getBarcodeImage = async (req, res) => {
  try {
    const { barcodeId } = req.params;

    const barcode = await Barcode.findByPk(barcodeId);

    if (!barcode || !barcode.barcode_image) {
      return res.status(404).json({ error: "Barcode image not found" });
    }

    const fs = require('fs');
    const path = require('path');

    const imagePath = path.resolve(barcode.barcode_image);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Barcode image file not found on server" });
    }

    // Set proper content type for PNG images
    res.contentType('image/png');
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error retrieving barcode image:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

// Create a product (original method)
const createProduct = async (req, res) => {
  const { name, description, categorys_id } = req.body;

  try {
    const productName = String(name || '').trim();
    const MAX_PRODUCT_NAME_LENGTH = 255;
    
    if (productName.length > MAX_PRODUCT_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Product name cannot exceed ${MAX_PRODUCT_NAME_LENGTH} characters.`
      });
    }

    // Validate category existence
    const category = await Category.findByPk(categorys_id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Create product with explicit timestamp handling
    const newProduct = await Product.create({
      name,
      description,
      categorys_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({
      error: "Failed to create product",
      details: error.message,
    });
  }
};

// Function to generate barcode image
const generateBarcode = async (barcode_no) => {
  const barcodeDir = path.join(__dirname, "../public/barcodes");
  const barcodePath = path.join(barcodeDir, `${barcode_no}.png`);

  return new Promise((resolve, reject) => {
    // Ensure the folder exists
    fs.mkdir(barcodeDir, { recursive: true }, (err) => {
      if (err) return reject(err);

      bwipjs.toBuffer(
        {
          bcid: "code128",
          text: barcode_no,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: "center",
          backgroundcolor: "ffffff",
        },
        (err, buffer) => {
          if (err) return reject(err);

          fs.writeFile(barcodePath, buffer, (err) => {
            if (err) return reject(err);
            resolve(barcodePath);
          });
        }
      );
    });
  });
};

// Update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categorys_id, business_id } = req.body; // Added business_id

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

   // Fetch business details to get the correct prefix
   let prefixedName = name;
   if (business_id) {
       const business = await BusinessDetail.findByPk(business_id);
       if (business) {
           prefixedName = `${business.name}.${name}`;
       }
   } else {
       // Fallback: If no business_id, try to preserve existing prefix or just update name?
       // If we don't have business_id, we might overwrite the name without prefix if we are not careful.
       // However, typical flow implies we know the business.
       // Let's assume the frontend sends the raw name, and we MUST prefix it if we want to change it.
       // But if we don't know the business...
       // Best effort: Get prefix from existing name?
       const existingName = product.name;
       const dotIndex = existingName.indexOf('.');
       if (dotIndex !== -1) {
           const prefix = existingName.substring(0, dotIndex);
           prefixedName = `${prefix}.${name}`;
       }
   }

    const MAX_PRODUCT_NAME_LENGTH = 255;
    if (String(prefixedName).trim().length > MAX_PRODUCT_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Product name cannot exceed ${MAX_PRODUCT_NAME_LENGTH} characters.`
      });
    }

    // Update with explicit timestamp
    await product.update({
      name: prefixedName,
      description,
      categorys_id,
      updated_at: new Date(),
    });

    const responseProduct = product.toJSON();
     if (responseProduct.name.includes('.')) {
      responseProduct.name = responseProduct.name.substring(responseProduct.name.indexOf('.') + 1);
    }


    res.status(200).json({ message: "Product updated successfully", product: responseProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_id } = req.query; // Get business_id from query params

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Store product name before deletion for notification
    const productName = product.name.includes(".")
      ? product.name.split(".").slice(1).join(".")
      : product.name;

    // Step 1: Retrieve barcode IDs from related price entries
    const barcodeEntries = await Price.findAll({
      attributes: ["barcode_id"],
      where: { product_id: id },
    });

    // Extract barcode IDs into an array
    const barcodeIdList = barcodeEntries.map((entry) => entry.barcode_id);

    // Step 2: Retrieve barcode entries to delete their images
    const barcodes = await Barcode.findAll({
      where: { id: { [Op.in]: barcodeIdList } },
    });

    // Step 3: Delete related price entries first
    await Price.destroy({ where: { product_id: id } });

    // Step 4: Delete barcode images from the filesystem
    barcodes.forEach((barcode) => {
      if (barcode.barcode_image) {
        const barcodeImagePath = path.join(
          __dirname,
          "../public/barcodes",
          path.basename(barcode.barcode_image)
        );

        console.log(`Checking if file exists: ${barcodeImagePath}`);

        if (fs.existsSync(barcodeImagePath)) {
          fs.unlinkSync(barcodeImagePath);
          console.log(`Deleted barcode image: ${barcodeImagePath}`);
        } else {
          console.warn(`Barcode image file not found: ${barcodeImagePath}`);
        }
      }
    });

    // Step 5: Delete barcode entries linked to deleted prices
    await Barcode.destroy({
      where: { id: { [Op.in]: barcodeIdList } },
    });

    // Step 6: Delete the product itself
    await product.destroy();

    // Step 7: Create notification for product deletion
    if (business_id) {
      try {
        const { emitNotification, emitUnreadCount } = require("../config/socket");
        
        const notificationQuery = `
          INSERT INTO notifications (business_id, type, title, message, product_id, product_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await sequelize.query(notificationQuery, {
          replacements: [
            business_id,
            "product_deleted",
            "Product Deleted",
            `${productName} has been removed from inventory`,
            id,
            productName,
          ],
        });

        // Get the newly created notification
        const [notification] = await sequelize.query(
          "SELECT * FROM notifications WHERE id = LAST_INSERT_ID()",
          { replacements: [] }
        );

        const newNotification = notification[0];

        // Emit real-time events
        emitNotification(business_id, newNotification);

        // Update unread count
        const [result] = await sequelize.query(
          "SELECT COUNT(*) as count FROM notifications WHERE business_id = ? AND is_read = FALSE",
          { replacements: [business_id] }
        );
        const unreadCount = result[0].count;
        emitUnreadCount(business_id, unreadCount);

        console.log(`✅ Notification created for deleted product: ${productName}`);
      } catch (notifError) {
        console.error("❌ Error creating notification:", notifError);
        // Don't fail the deletion if notification fails
      }
    }

    res.status(200).json({
      message:
        "Product, related prices, barcodes, and barcode images deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const addProductAttributes = async (req, res) => {
  const {
    product_id,
    color_id,
    size_id,
    quantity,
    cost_price,
    selling_price,
    barcode_id,
  } = req.body;

  console.log("Received product_id:", product_id, typeof product_id);

  try {
    if (!product_id || isNaN(product_id)) {
      return res.status(400).json({ error: "Invalid product_id provided!" });
    }

    // Check if product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        error: `Product ID ${product_id} does not exist in the database!`,
      });
    }

    // Insert pricing details with correct column names
    await Price.create({
      product_id,
      color_id,
      size_id,
      quantity,
      cost_price: cost_price, // Match database column name
      selling_price: selling_price, // Match database column name
      barcode_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(200).json({
      message: "Attributes added successfully!",
      product_id,
      color_id,
    });

    // 🧩 Trigger low stock notifications
    try {
      if (product && product.name.includes('.')) {
        const businessName = product.name.split('.')[0];
        const business = await BusinessDetail.findOne({ where: { name: businessName } });
        if (business) {
          checkLowStock(business.id).catch(err => console.error("Low stock check failed", err));
        }
      }
    } catch (err) {
      console.error("Error triggering stock check:", err);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while adding attributes" });
  }
};

const addProduct = async (req, res) => {
  try {
    const { name, description, categorys_id } = req.body;
    const business_id = req.business_id;

    if (!name || !description || !categorys_id || !business_id) {
      return res.status(400).json({ error: "Missing required fields or business in token" });
    }

    // Validate business
    const business = await BusinessDetail.findByPk(business_id);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Validate category
    const category = await Category.findByPk(categorys_id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Add business prefix
    const prefixedName = `${business.name}.${name}`;

    // Check if product already exists for this business
    const existingProduct = await Product.findOne({
      where: { name: prefixedName, categorys_id },
    });

    if (existingProduct) {
      return res
        .status(409)
        .json({ error: "Product already exists for this business" });
    }

    // Create product
    const product = await Product.create({
      name: prefixedName,
      description,
      categorys_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json({
      message: "Product added successfully",
      product_id: product.id,
      stored_name: prefixedName,
      display_name: name,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Add pricing details & generate barcode
const addPricing = async (req, res) => {
  try {
    const { product_id, variations } = req.body;

    if (!product_id || !variations.length) {
      return res
        .status(400)
        .json({ error: "Product ID and variations are required" });
    }

    // Validate product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Retrieve category attributes to map keys back to DB attribute names
    const [dbAttrs] = await rawDb.query(
      'SELECT id, attribute_name FROM attributes WHERE category_id = ?',
      [product.categorys_id]
    );

    const attrMap = {};
    dbAttrs.forEach(attr => {
      const key = attr.attribute_name.toLowerCase().replace(/\s+/g, '_');
      attrMap[key] = attr;
    });

    for (const variant of variations) {
      const { color_id, size_id, quantity, unit, cost_price, selling_price } =
        variant;


const parsedQuantity = Number(quantity);
const parsedCostPrice = Number(cost_price);
const parsedSellingPrice = Number(selling_price);

if (
  !Number.isInteger(parsedQuantity) ||
  parsedQuantity < 0 ||
  !Number.isFinite(parsedCostPrice) ||
  parsedCostPrice < 0 ||
  !Number.isFinite(parsedSellingPrice) ||
  parsedSellingPrice < 0
) {
  return res.status(400).json({
    error: 'Quantity must be a whole number >= 0 and prices must be >= 0.'
  });
}

      if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cost price must be a non-negative number.'
        });
      }

      if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Selling price must be a non-negative number.'
        });
      }

      if (parsedQuantity < 0) {
        return res.status(400).json({ error: "Quantity cannot be negative." });
      }

      if (!decimalUnits.includes(unit || 'pcs') && !Number.isInteger(parsedQuantity)) {
        return res.status(400).json({ error: "Please enter a whole number for this unit." });
      }

      console.log("Processing variant:", {
        color_id,
        size_id,
        quantity: parsedQuantity,
        unit: unit || 'pcs',
        cost_price: parsedCostPrice,
        selling_price: parsedSellingPrice,
      });

      // Generate or use manual barcode
      let barcode_no;
      
      if (variant.barcode) {
        // DEF_021, DEF_023: Normalize and validate custom barcodes
        const normalizedBarcode = String(variant.barcode || '').trim();
        const BARCODE_PATTERN = /^[A-Za-z0-9]+$/;
        
        if (!BARCODE_PATTERN.test(normalizedBarcode)) {
          return res.status(400).json({
            success: false,
            message: 'Barcode can contain only letters and numbers.'
          });
        }
        
        barcode_no = normalizedBarcode;
        
        // Check if barcode already exists
        const existingBarcode = await Barcode.findOne({ where: { barcode_no } });
        if (existingBarcode) {
          return res.status(409).json({ 
            success: false,
            error: `Barcode '${barcode_no}' already exists. Please use a unique barcode.` 
          });
        }
      } else {
        barcode_no = `${product_id} ${color_id} ${size_id}`;
      }

      const barcode_image = await generateBarcode(barcode_no);

      console.log("Generated barcode:", { barcode_no, barcode_image });

      // Insert into barcodes table with explicit timestamps
      const barcode = await Barcode.create({
        barcode_no,
        barcode_image,
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log("Created barcode:", barcode.id);

      // Insert into prices table with correct column names
      const priceData = {
        cost_price: parsedCostPrice, // Match database column name
        selling_price: parsedSellingPrice, // Match database column name
        quantity: parsedQuantity,
        unit: unit || 'pcs',
        barcode_id: barcode.id,
        product_id,
        color_id: color_id ?? null,
        size_id: size_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log("About to create price with data:", priceData);

      const createdPrice = await Price.create(priceData);

      // Save custom attributes for this variant
      for (const [key, val] of Object.entries(variant)) {
        if (attrMap[key] && val !== undefined && val !== null && val !== '') {
          await rawDb.query(
            'INSERT INTO product_attribute_values (product_id, price_id, attribute_name, attribute_value) VALUES (?, ?, ?, ?)',
            [product_id, createdPrice.id, attrMap[key].attribute_name, String(val)]
          );
        }
      }
    }

    // 🧩 Trigger low stock notifications
    try {
      const productWithBusiness = await Product.findByPk(product_id);
      if (productWithBusiness && productWithBusiness.name.includes('.')) {
        const businessName = productWithBusiness.name.split('.')[0];
        const business = await BusinessDetail.findOne({ where: { name: businessName } });
        if (business) {
          checkLowStock(business.id).catch(err => console.error("Low stock check failed", err));
        }
      }
    } catch (err) {
      console.error("Error triggering stock check:", err);
    }

    res
      .status(201)
      .json({ success: true, message: "All variations saved successfully!" });
  } catch (error) {
    console.error("Unexpected error:", error);
    
    // DEF_025: Catch database unique constraint violations
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: "Barcode already exists. Please use a unique barcode."
      });
    }

    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const editPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { color_id, size_id, quantity, unit, cost_price, selling_price } = req.body;

    console.log("URL Params:", req.params);
    console.log("Incoming request data:", req.body);

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      if (parsedQuantity < 0) {
        return res.status(400).json({ error: "Quantity cannot be negative." });
      }
      const decimalUnits = ['kg', 'g', 'L', 'ml'];
      // if unit is in body use it, else if not we assume 'pcs' unless we fetch price first
    }

    if (cost_price !== undefined) {
      const parsedCostPrice = Number(cost_price);
      if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
        return res.status(400).json({
          success: false,
          error: 'Cost price must be a non-negative number.'
        });
      }
    }

    if (selling_price !== undefined) {
      const parsedSellingPrice = Number(selling_price);
      if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
        return res.status(400).json({
          success: false,
          error: 'Selling price must be a non-negative number.'
        });
      }
    }


    // Step 1: Find the price entry using the ID from the URL
    const price = await Price.findByPk(id);
    if (!price) {
      return res.status(404).json({ error: "Price entry not found" });
    }

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      const currentUnit = unit !== undefined ? unit : price.unit;
      const decimalUnits = ['kg', 'g', 'L', 'ml'];
      if (!decimalUnits.includes(currentUnit) && !Number.isInteger(parsedQuantity)) {
        return res.status(400).json({ error: "Please enter a whole number for this unit." });
      }
    }

    console.log("Existing price entry before update:", price);

    // Step 2: Check if color_id or size_id has changed
    const colorChanged = color_id !== undefined && color_id !== price.color_id;
    const sizeChanged = size_id !== undefined && size_id !== price.size_id;

    // Step 3: Update the price entry in the database with correct column names
    await price.update({
      cost_price: cost_price !== undefined ? cost_price : price.cost_price, // Match database column
      selling_price:
        selling_price !== undefined ? selling_price : price.selling_price, // Match database column
      quantity: quantity !== undefined ? quantity : price.quantity,
      unit: unit !== undefined ? unit : price.unit,
      color_id: color_id !== undefined ? color_id : price.color_id,
      size_id: size_id !== undefined ? size_id : price.size_id,
      updated_at: new Date(), // Explicit timestamp update
    });

    // 🧩 Trigger low stock notifications
    try {
      const product = await Product.findByPk(price.product_id);
      if (product && product.name.includes('.')) {
        const businessName = product.name.split('.')[0];
        const business = await BusinessDetail.findOne({ where: { name: businessName } });
        if (business) {
          checkLowStock(business.id).catch(err => console.error("Low stock check failed", err));
        }
      }
    } catch (err) {
      console.error("Error triggering stock check:", err);
    }

    await price.reload(); // Ensure latest data is retrieved

    console.log("Updated price entry:", price);

    // Step 4: Find the associated barcode entry
    const barcode = await Barcode.findByPk(price.barcode_id);
    if (!barcode) {
      return res
        .status(404)
        .json({ error: "Barcode not found for this price entry" });
    }

    console.log("Existing barcode entry:", barcode);

    // Step 5: Regenerate barcode image only if color_id or size_id has changed
    if (colorChanged || sizeChanged) {
      console.log(
        `Regenerating barcode for ID ${price.barcode_id} due to color/size change.`
      );
      const newBarcodeNo = `${price.product_id} ${price.color_id} ${price.size_id}`;
      const newBarcodePath = await generateBarcode(newBarcodeNo);

      // Step 6: Update barcode record with new image
      await barcode.update({
        barcode_no: newBarcodeNo,
        barcode_image: newBarcodePath,
        updated_at: new Date(), // Explicit timestamp update
      });

      console.log("New barcode image path:", newBarcodePath);

      return res.status(200).json({
        success: true,
        message: "Price and barcode updated successfully!",
        updated_price: price,
        updated_barcode: barcode,
        barcode_image: newBarcodePath,
      });
    }

    res.status(200).json({
      success: true,
      message: "Price updated successfully (Barcode unchanged)",
      updated_price: price,
    });
  } catch (error) {
    console.error("Error updating pricing variations:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const deletePrice = async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Find the price entry
    const price = await Price.findByPk(id);
    if (!price) {
      return res.status(404).json({ error: "Price entry not found" });
    }

    console.log("Existing price entry before deletion:", price);

    // Step 2: Check if any order references this price
    const orderCount = await Order.count({
      where: { price_id: id }, // check orders that have this price id
    });

    if (orderCount > 0) {
      return res.status(400).json({
        error:
          "Cannot delete this price entry because it is linked to existing orders.",
      });
    }

    // Step 3: Find the associated barcode entry
    const barcode = await Barcode.findByPk(price.barcode_id);

    // Step 4: Delete the price entry first (FK constraint cleared)
    await price.destroy();
    console.log("Deleted price entry successfully.");

    // Step 5: Delete barcode image and barcode entry if exists
    if (barcode) {
      console.log("Existing barcode entry before deletion:", barcode);

      if (barcode.barcode_image) {
        const barcodeImagePath = path.join(
          __dirname,
          "../public/barcodes",
          path.basename(barcode.barcode_image)
        );

        if (fs.existsSync(barcodeImagePath)) {
          fs.unlinkSync(barcodeImagePath);
          console.log(`Deleted barcode image: ${barcodeImagePath}`);
        }
      }

      await barcode.destroy();
      console.log("Deleted barcode entry successfully.");
    }

    res.status(200).json({
      success: true,
      message: "Price and related barcode deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting price entry:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const getPrice = async (req, res) => {
  try {
    const { id } = req.params;

    const price = await Price.findByPk(id, {
      include: [{ model: Barcode, as: "Barcode" }],
    });

    if (!price) {
      return res.status(404).json({ error: "Price entry not found" });
    }

    // Extract barcode details using the correct alias
    const barcodeDetails = price.barcode
      ? {
          barcode_no: price.barcode.barcode_no,
          barcode_image: `/public/barcodes/${path.basename(
            price.barcode.barcode_image
          )}`,
        }
      : null;

    // Fetch custom attributes
    const [customAttrs] = await rawDb.query(
      'SELECT attribute_name, attribute_value FROM product_attribute_values WHERE product_id = ? AND price_id = ?',
      [price.product_id, id]
    );

    const customAttributes = {};
    customAttrs.forEach(attr => {
      const key = attr.attribute_name.toLowerCase().replace(/\s+/g, '_');
      customAttributes[key] = attr.attribute_value;
    });

    res.status(200).json({
      success: true,
      price,
      barcode: barcodeDetails,
      customAttributes,
    });
  } catch (error) {
    console.error("Error fetching price details:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const updateProductWithPrice = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId, priceId } = req.params;
    const {
      name,
      description,
      categorys_id,
      color_id,
      size_id,
      quantity,
      unit,
      cost_price,
      selling_price,
      business_id,
    } = req.body;

    console.log("Updating product:", productId, "and price:", priceId);
    console.log("Request body:", req.body);

    // ✅ Validate required fields
    if (!business_id || !categorys_id) {
      await transaction.rollback();
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Validate business
    const business = await BusinessDetail.findByPk(business_id);
    if (!business) {
      await transaction.rollback();
      return res.status(404).json({ error: "Business not found" });
    }

    // ✅ Validate category
    const category = await Category.findByPk(categorys_id);
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ error: "Category not found" });
    }

    // ✅ Find product
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    // ✅ Find price
    const price = await Price.findByPk(priceId, { transaction });
    if (!price) {
      await transaction.rollback();
      return res.status(404).json({ error: "Price record not found" });
    }

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      if (parsedQuantity < 0) {
        await transaction.rollback();
        return res.status(400).json({ error: "Quantity cannot be negative." });
      }
      const currentUnit = unit !== undefined ? unit : price.unit;
      const decimalUnits = ['kg', 'g', 'L', 'ml'];
      if (!decimalUnits.includes(currentUnit) && !Number.isInteger(parsedQuantity)) {
        await transaction.rollback();
        return res.status(400).json({ error: "Please enter a whole number for this unit." });
      }
    }

    if (cost_price !== undefined) {
      const parsedCostPrice = Number(cost_price);
      if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cost price must be a non-negative number.'
        });
      }
    }

    if (selling_price !== undefined) {
      const parsedSellingPrice = Number(selling_price);
      if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Selling price must be a non-negative number.'
        });
      }
    }

    // ✅ Build new prefixed name
    const prefixedName = `${business.name}.${name}`;

    const MAX_PRODUCT_NAME_LENGTH = 255;
    if (String(prefixedName).trim().length > MAX_PRODUCT_NAME_LENGTH) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Product name cannot exceed ${MAX_PRODUCT_NAME_LENGTH} characters.`
      });
    }

    // ✅ Check for duplicate product name within same business
    const existingProduct = await Product.findOne({
      where: {
        name: prefixedName,
        categorys_id,
        id: { [Op.ne]: productId }, // exclude current product
      },
      transaction,
    });

    if (existingProduct) {
      await transaction.rollback();
      return res
        .status(409)
        .json({ error: "Another product already exists for this business" });
    }

    // ✅ Check if color or size changed (for barcode regeneration)
    const colorChanged = color_id !== undefined && color_id !== price.color_id;
    const sizeChanged = size_id !== undefined && size_id !== price.size_id;

    // ✅ Update product info
    await product.update(
      {
        name: prefixedName,
        description,
        categorys_id,
        updated_at: new Date(),
      },
      { transaction }
    );

    // ✅ Update price info
    await price.update(
      {
        color_id: color_id !== undefined ? color_id : price.color_id,
        size_id: size_id !== undefined ? size_id : price.size_id,
        quantity: quantity !== undefined ? quantity : price.quantity,
        unit: unit !== undefined ? unit : price.unit,
        cost_price: cost_price !== undefined ? cost_price : price.cost_price,
        selling_price:
          selling_price !== undefined ? selling_price : price.selling_price,
        updated_at: new Date(),
      },
      { transaction }
    );

    await price.reload({ transaction });

    // ✅ Regenerate barcode if color/size changed
    let barcodeInfo = null;
    if (colorChanged || sizeChanged) {
      console.log(
        `Regenerating barcode for ID ${price.barcode_id} due to color/size change.`
      );

      const barcode = await Barcode.findByPk(price.barcode_id, { transaction });
      if (barcode) {
        const newBarcodeNo = `${price.product_id} ${color_id} ${size_id}`;
        const newBarcodePath = await generateBarcode(newBarcodeNo);

        await barcode.update(
          {
            barcode_no: newBarcodeNo,
            barcode_image: newBarcodePath,
            updated_at: new Date(),
          },
          { transaction }
        );

        barcodeInfo = {
          barcode_no: newBarcodeNo,
          barcode_image: newBarcodePath,
        };
      }
    }

    // ✅ Update custom attributes
    const [dbAttrs] = await rawDb.query(
      'SELECT id, attribute_name FROM attributes WHERE category_id = ?',
      [categorys_id]
    );

    const attrMap = {};
    dbAttrs.forEach(attr => {
      const key = attr.attribute_name.toLowerCase().replace(/\s+/g, '_');
      attrMap[key] = attr;
    });

    // Delete existing custom attributes for this variant/price
    await rawDb.query(
      'DELETE FROM product_attribute_values WHERE product_id = ? AND price_id = ?',
      [productId, priceId]
    );

    // Save new custom attributes
    for (const [key, val] of Object.entries(req.body)) {
      if (attrMap[key] && val !== undefined && val !== null && val !== '') {
        await rawDb.query(
          'INSERT INTO product_attribute_values (product_id, price_id, attribute_name, attribute_value) VALUES (?, ?, ?, ?)',
          [productId, priceId, attrMap[key].attribute_name, String(val)]
        );
      }
    }

    await transaction.commit();

    // 🧩 Trigger low stock notifications
    if (business_id) {
       checkLowStock(business_id).catch(err => console.error("Low stock check failed", err));
    }

    res.status(200).json({
      success: true,
      message:
        colorChanged || sizeChanged
          ? "Product, price, and barcode updated successfully"
          : "Product and price updated successfully",
      product: {
        ...product.toJSON(),
        display_name: name,
        stored_name: prefixedName,
      },
      price,
      barcode_updated: !!barcodeInfo,
      barcode_info: barcodeInfo,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating product with price:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getBarcodeImage,
  updateProduct,
  deleteProduct,
  addProductAttributes,
  createProduct,
  addProduct,
  addPricing,
  editPrice,
  deletePrice,
  getPrice,
  updateProductWithPrice,
};
