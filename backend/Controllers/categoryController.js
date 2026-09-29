// Developed by M.Vaishnavi | Start: 01/4 | End: 02/4

const { Category } = require('../models'); // Import the Category model

// GET all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll(); // Retrieve all categories from the database
        res.status(200).json(categories); // Respond with the categories
    } catch (error) {
        console.error(error); // Log any errors for debugging
        res.status(500).json({ message: 'Error retrieving categories', error }); // Return error response
    }
};

// GET category by ID
exports.getCategoryById = async (req, res) => {
    const { id } = req.params; // Extract category ID from request parameters
    try {
        const category = await Category.findByPk(id); // Find category by primary key (ID)
        if (category) {
            res.status(200).json(category); // Respond with category details if found
        } else {
            res.status(404).json({ message: 'Category not found' }); // Return error if category is missing
        }
    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(500).json({ message: 'Error retrieving category', error }); // Return error response
    }
};

// POST create a new category
exports.createCategory = async (req, res) => {
  try {

let { category_name } = req.body;

if (!category_name || !String(category_name).trim()) {
  return res.status(400).json({ message: "Category name is required" });
}

category_name = String(category_name).trim();

if (/[^\p{L}\p{N} ]/u.test(category_name)) {
  return res.status(400).json({
    message: "Category name may only contain letters, numbers and spaces"
  });
}

    category_name = category_name.trim();

    // Only insert category_name, ignore timestamps
    const category = await Category.create(
      { category_name },
      { fields: ["category_name"] } // <-- important: only send category_name
    );

    return res.status(201).json(category);

  } catch (error) {
    console.error("🔥 Category create error:", error.name, error.errors);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: `Category "${req.body.category_name}" already exists` });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: "Validation failed", errors: error.errors.map(e => e.message) });
    }

    return res.status(500).json({ message: "Error creating category", error: error.message });
  }
};




// PUT update category by ID
exports.updateCategory = async (req, res) => {
    const { id } = req.params; // Extract category ID from request parameters
    const { category_name } = req.body; // Extract new category name from request body
    try {
        const category = await Category.findByPk(id); // Find category by ID
        if (category) {
            category.category_name = category_name; // Update category name
            await category.save(); // Save changes to the database
            res.status(200).json(category); // Respond with updated category
        } else {
            res.status(404).json({ message: 'Category not found' }); // Return error if category doesn't exist
        }
    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(400).json({ message: 'Error updating category', error }); // Return error response
    }
};

// DELETE category by ID
exports.deleteCategory = async (req, res) => {
    const { id } = req.params; // Extract category ID from request parameters
    try {
        const category = await Category.findByPk(id); // Find category by ID
        if (category) {
            await category.destroy(); // Delete the category from the database
            res.status(200).json({ message: 'Category deleted successfully' }); // Respond with success message
        } else {
            res.status(404).json({ message: 'Category not found' }); // Return error if category doesn't exist
        }
    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(500).json({ message: 'Error deleting category', error }); // Return error response
    }
};
