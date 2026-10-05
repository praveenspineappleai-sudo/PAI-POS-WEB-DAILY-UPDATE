const { Size } = require("../models");

// Create a new size
exports.createSize = async (req, res) => {
    try {
        let { size } = req.body;

        // Validation
        if (!size || size.trim() === "") {
            return res.status(400).json({
                error: "Size is required."
            });
        }

        size = size.trim();

        if (/[^\p{L}\p{N} ]/u.test(size)) {
            return res.status(400).json({
                error: "Size may only contain letters, numbers and spaces."
            });
        }

        // Check duplicate
        const existingSize = await Size.findOne({
            where: { size }
        });

        if (existingSize) {
            return res.status(409).json({
                error: "Size already exists."
            });
        }

        // Create new size
        const newSize = await Size.create({ size });

        return res.status(201).json(newSize);

    } catch (error) {
        console.error("Create Size Error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};

// Get all sizes
exports.getSizes = async (req, res) => {
    try {
        const sizes = await Size.findAll({
            order: [["id", "ASC"]]
        });

        return res.status(200).json(sizes);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
};

// Get size by ID
exports.getSizeById = async (req, res) => {
    try {
        const size = await Size.findByPk(req.params.id);

        if (!size) {
            return res.status(404).json({
                message: "Size not found"
            });
        }

        return res.status(200).json(size);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
};

// Update size
exports.updateSize = async (req, res) => {
    try {
        let { size } = req.body;

        if (!size || size.trim() === "") {
            return res.status(400).json({
                error: "Size is required."
            });
        }

        size = size.trim();

        const sizeToUpdate = await Size.findByPk(req.params.id);

        if (!sizeToUpdate) {
            return res.status(404).json({
                message: "Size not found"
            });
        }

        // Check duplicate
        const duplicate = await Size.findOne({
            where: { size }
        });

        if (duplicate && duplicate.id !== sizeToUpdate.id) {
            return res.status(409).json({
                error: "Size already exists."
            });
        }

        sizeToUpdate.size = size;
        await sizeToUpdate.save();

        return res.status(200).json(sizeToUpdate);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
};

// Delete size
exports.deleteSize = async (req, res) => {
    try {
        const size = await Size.findByPk(req.params.id);

        if (!size) {
            return res.status(404).json({
                message: "Size not found"
            });
        }

        await size.destroy();

        return res.status(200).json({
            message: "Size deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
};