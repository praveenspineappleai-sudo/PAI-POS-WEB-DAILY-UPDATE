// Developed by M.Vaishnavi | Start: 01/4 | End: 02/4

const { createCanvas } = require("canvas"); // Import canvas to generate barcode images
const fs = require("fs"); // Import file system module to handle files
const path = require("path"); // Import path module for file paths
const JsBarcode = require("jsbarcode"); // Import JsBarcode for barcode generation

const { Barcode } = require("../models"); // Import Barcode model from database

// Directory to store barcode images
const IMAGE_DIR = path.join(__dirname, "../public/barcodes/"); // Define barcode image storage path
if (!fs.existsSync(IMAGE_DIR)) {
  // Check if directory exists
  fs.mkdirSync(IMAGE_DIR, { recursive: true }); // Create directory if not exists
}

// Generate barcode image
const generateBarcodeImage = async (barcode_no) => {
  const canvas = createCanvas(300, 100); // Create canvas with width 300px and height 100px
  JsBarcode(canvas, barcode_no, { format: "CODE128" }); // Generate barcode using CODE128 format

  const imagePath = path.join(IMAGE_DIR, `${barcode_no}.png`); // Define file path for barcode image
  const out = fs.createWriteStream(imagePath); // Create write stream for the image
  const stream = canvas.createPNGStream(); // Convert canvas to PNG stream

  return new Promise((resolve, reject) => {
    stream.pipe(out); // Pipe PNG stream to file
    out.on("finish", () => resolve(`/public/barcodes/${barcode_no}.png`)); // Resolve with image path on success
    out.on("error", (err) => reject(err)); // Reject with error on failure
  });
};

// Create barcode
const createBarcode = async (req, res) => {
  try {
    let { barcode_no } = req.body; // Extract barcode number from request body
    barcode_no = String(barcode_no || '').trim(); // DEF_024: Normalize leading/trailing spaces
    if (!barcode_no)
      return res.status(400).json({ error: "Barcode number is required" }); // Validate input

    // Check if barcode already exists in database
    const existingBarcode = await Barcode.findOne({ where: { barcode_no } });
    if (existingBarcode)
      return res.status(400).json({ error: "Barcode already exists" });

    // Generate barcode image
    const barcode_image = await generateBarcodeImage(barcode_no);

    // Save barcode details to database
    const barcode = await Barcode.create({ barcode_no, barcode_image });

    res.status(201).json(barcode); // Respond with created barcode data
  } catch (error) {
    console.error("Error creating barcode:", error); // Log error for debugging
    res
      .status(500)
      .json({ error: "Failed to create barcode", details: error.message }); // Return error response
  }
};

// Fetch all barcodes
const getBarcodes = async (req, res) => {
  try {
    const barcodes = await Barcode.findAll(); // Retrieve all barcode records from database
    res.json(barcodes); // Return barcode data as JSON response
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch barcodes", details: error.message }); // Return error response
  }
};

// Delete barcode
const deleteBarcode = async (req, res) => {
  try {
    const { id } = req.params; // Extract barcode ID from request parameters
    console.log(`Deleting barcode with ID: ${id}`); // Log deletion request

    const barcode = await Barcode.findByPk(id); // Find barcode by primary key (ID)
    if (!barcode) {
      console.log("Barcode not found"); // Log barcode not found
      return res.status(404).json({ error: "Barcode not found" }); // Return error response
    }

    // Delete barcode image
    const imagePath = path.join(__dirname, "..", barcode.barcode_image); // Define image file path
    if (fs.existsSync(imagePath)) {
      // Check if file exists
      fs.unlinkSync(imagePath); // Delete image file
      console.log("Barcode image deleted:", imagePath); // Log deletion success
    } else {
      console.log("Barcode image not found:", imagePath); // Log missing image
    }

    await Barcode.destroy({ where: { id } }); // Delete barcode record from database
    console.log("Barcode deleted successfully"); // Log deletion success

    res.json({ message: "Barcode deleted successfully" }); // Respond with success message
  } catch (error) {
    console.error("Error deleting barcode:", error); // Log error for debugging
    res
      .status(500)
      .json({ error: "Failed to delete barcode", details: error.message }); // Return error response
  }
};

// Get barcode by ID
const getBarcodeById = async (req, res) => {
  try {
    const { id } = req.params;

    const barcode = await Barcode.findByPk(id);

    if (!barcode) {
      return res.status(404).json({ error: "Barcode not found" });
    }

    res.status(200).json(barcode);
  } catch (error) {
    console.error("Error retrieving barcode:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = { createBarcode, getBarcodes, deleteBarcode, getBarcodeById }; // Export controller functions
