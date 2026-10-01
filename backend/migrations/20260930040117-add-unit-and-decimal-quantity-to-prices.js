'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Alter quantity to DECIMAL(10,3)
    await queryInterface.changeColumn('prices', 'quantity', {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: false,
    });

    // 2. Add unit column if it doesn't exist
    const tableInfo = await queryInterface.describeTable('prices');
    if (!tableInfo.unit) {
      await queryInterface.addColumn('prices', 'unit', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pcs'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Revert quantity to INTEGER (lossy, but standard rollback)
    // Note: Reverting may fail or truncate decimals if they exist.
    await queryInterface.changeColumn('prices', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 2. Remove unit column
    const tableInfo = await queryInterface.describeTable('prices');
    if (tableInfo.unit) {
      await queryInterface.removeColumn('prices', 'unit');
    }
  }
};
