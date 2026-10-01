// //Developed by M.Vaishnavi start 01/4 end 02/4

// module.exports = (sequelize, DataTypes) => {
//   // Define the Price model with attributes and associations
//   const Price = sequelize.define("Price", {

//     // id: A unique identifier for each price record.
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true, // Makes this field the primary key.
//       autoIncrement: true, // Automatically increments the ID for each new record.
//       allowNull: false, // Ensures this field cannot be null.
//     },

//     // quantity: Represents the quantity of the product associated with the price.
//     quantity: {
//       type: DataTypes.INTEGER, // Integer data type for quantity.
//       allowNull: false, // This field is mandatory.
//     },

//     // barcode_id: Reference to the Barcode model (barcode table) using the foreign key.
//     barcode_id: {
//       type: DataTypes.INTEGER, // Integer data type for the barcode ID.
//       allowNull: false, // This field is mandatory.
//       references: {
//         model: "barcodes", // Refers to the barcodes table.
//         key: "id", // Specifies the primary key of the referenced table (barcodes table).
//       },
//     },

//     // product_id: Reference to the Product model (product table) using the foreign key.
//     product_id: {
//       type: DataTypes.INTEGER, // Integer data type for product ID.
//       allowNull: false, // This field is mandatory.
//       references: {
//         model: "products", // Refers to the products table.
//         key: "id", // Specifies the primary key of the referenced table (products table).
//       },
//     },

//     // color_id: Reference to the Color model (colors table) using the foreign key.
//     color_id: {
//       type: DataTypes.INTEGER, // Integer data type for color ID.
//       allowNull: false, // This field is mandatory.
//       references: {
//         model: "colors", // Refers to the colors table.
//         key: "id", // Specifies the primary key of the referenced table (colors table).
//       },
//     },

//     // size_id: Reference to the Size model (sizes table) using the foreign key.
//     size_id: {
//       type: DataTypes.INTEGER, // Integer data type for size ID.
//       allowNull: false, // This field is mandatory.
//       references: {
//         model: "sizes", // Refers to the sizes table.
//         key: "id", // Specifies the primary key of the referenced table (sizes table).
//       },
//     },

//     // cost_price: The cost price of the product, represented as a decimal value.
//     cost_price: {
//       type: DataTypes.DECIMAL(10, 2), // Decimal type with a total of 10 digits and 2 decimal places.
//       allowNull: false, // This field is mandatory.
//     },

//     // selling_price: The selling price of the product, represented as a decimal value.
//     selling_price: {
//       type: DataTypes.DECIMAL(10, 2), // Decimal type with a total of 10 digits and 2 decimal places.
//       allowNull: false, // This field is mandatory.
//     },

//   }, {

//     // tableName: Specifies the table name in the database.
//     tableName: "prices", // The table for this model is 'prices'.

//     // timestamps: Enables automatic tracking of created and updated timestamps.
//     timestamps: true,
//     createdAt: "created_at", // Custom field name for the created timestamp.
//     updatedAt: "updated_at", // Custom field name for the updated timestamp.
//   });

//   // Defining associations for the Price model.
//   Price.associate = (models) => {

//     // Price belongs to Barcode, Product, Color, and Size models, linking via foreign keys.
//     Price.belongsTo(models.Barcode, { foreignKey: "barcode_id", as: "barcode" });
//     Price.belongsTo(models.Product, { foreignKey: "product_id", as: "product", onDelete: "CASCADE"  });
//     Price.belongsTo(models.Color, { foreignKey: "color_id", as: "color" });
//     Price.belongsTo(models.Size, { foreignKey: "size_id", as: "size" });
//   };

//   // Return the Price model.
//   return Price;
// };

// Developed by M.Vaishnavi start 01/4 end 02/4

module.exports = (sequelize, DataTypes) => {
  // Define the Price model
  const Price = sequelize.define(
    "Price",
    {
      // Unique ID for each price record
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      // Quantity associated with the price entry
      quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
      },

      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pcs'
      },

      // Foreign key referencing the Barcode model
      barcode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "barcodes", // Reference to the 'barcodes' table
          key: "id",
        },
        onDelete: "CASCADE", // Ensure deletion cascades from Barcode
      },

      // Foreign key referencing the Product model
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "products", // Reference to the 'products' table
          key: "id",
        },
        onDelete: "CASCADE", // Ensure deletion cascades from Product
      },

      // Foreign key referencing the Color model
      color_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "colors", // Reference to the 'colors' table
          key: "id",
        },
      },

      // Foreign key referencing the Size model
      size_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "sizes", // Reference to the 'sizes' table
          key: "id",
        },
      },

      // Cost price of the product
      cost_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      // Selling price of the product
      selling_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      tableName: "prices", // Table name in the database
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // Defining associations for the Price model
  Price.associate = function (models) {
    Price.belongsTo(models.Barcode, {
      foreignKey: "barcode_id",
      as: "Barcode",
      onDelete: "CASCADE",
    });
    Price.belongsTo(models.Product, {
      foreignKey: "product_id",
      as: "product",
      onDelete: "CASCADE",
    });
    Price.belongsTo(models.Color, { foreignKey: "color_id", as: "Color" });
    Price.belongsTo(models.Size, { foreignKey: "size_id", as: "Size" });
  };

  return Price;
};
