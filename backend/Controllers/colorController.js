// Developed by M.Vaishnavi | Start: 01/4 | End: 02/4

const { Color, sequelize } = require("../models"); // Import the Color model and Sequelize instance

// Create a new color
// exports.createColor = async (req, res) => {
//   try {
//     const { colour_name } = req.body; // Extract the colour_name from the request body

//     if (!colour_name) {
//       // Check if colour_name is provided
//       return res.status(400).json({ error: "Colour name is required" }); // Return error if not provided
//     }

//     // Create a new color entry in the database
//     const newColor = await Color.create({ colour_name });

//     // Respond with the newly created color
//     res.status(201).json(newColor);
//   } catch (error) {
//     console.error(error); // Log the error for debugging
//     res.status(400).json({ error: error.message }); // Respond with error message
//   }
// };

exports.createColor = async (req, res) => {
  try {

    const colourName = String(req.body.colour_name ?? '').trim();

    if (!colourName || /[^\p{L}\p{N} ]/u.test(colourName)) {
      return res.status(400).json({
        error: 'Colour name may only contain letters, numbers and spaces'
      });
    }

    const existingColor = await Color.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('colour_name')),
        colourName.toLowerCase()
      )
    });

    if (existingColor) {
      return res.status(409).json({
        error: 'Colour already exists'
      });
    }

    // ✅ Use the trimmed color name from the request body
    const newColor = await Color.create({
      colour_name: colourName,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json(newColor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Get all colors
exports.getColors = async (req, res) => {
  try {
    // Fetch all colors from the database
    const colors = await Color.findAll();

    // Respond with the list of colors
    res.status(200).json(colors);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Handle errors
  }
};

// Get a specific color by ID
exports.getColorById = async (req, res) => {
  try {
    const color = await Color.findByPk(req.params.id); // Find color by primary key (ID)

    if (!color) {
      // If no color is found with the given ID
      return res.status(404).json({ message: "Color not found" }); // Respond with 404 if not found
    }

    // Respond with the found color
    res.status(200).json(color);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Handle errors
  }
};

// Update a color by ID
exports.updateColor = async (req, res) => {
  try {
    const { colour_name } = req.body; // Extract the colour_name from the request body
    const colorToUpdate = await Color.findByPk(req.params.id); // Find the color by ID

    if (!colorToUpdate) {
      // If no color is found with the given ID
      return res.status(404).json({ message: "Color not found" }); // Respond with 404 if not found
    }

    // Update the color's name
    colorToUpdate.colour_name = colour_name;
    await colorToUpdate.save(); // Save the updated color

    // Respond with the updated color
    res.status(200).json(colorToUpdate);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Handle errors
  }
};

// Delete a color by ID
exports.deleteColor = async (req, res) => {
  try {
    const color = await Color.findByPk(req.params.id); // Find color by ID

    if (!color) {
      // If no color is found with the given ID
      return res.status(404).json({ message: "Color not found" }); // Respond with 404 if not found
    }

    // Delete the color from the database
    await color.destroy();

    // Respond with success message
    res.status(200).json({ message: "Color deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message }); // Handle errors
  }
};
