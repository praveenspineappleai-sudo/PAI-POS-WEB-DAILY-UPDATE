const { sequelize, User, CashierDetail, OwnerDetail, BusinessDetail } = require('../models');
const bcrypt = require('bcrypt');

exports.createCashier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { fullname, email, password, business_id } = req.body;

    // Validate cashier name
    const cashierName = String(fullname ?? '').trim();

    if (!cashierName || !/[A-Za-z]/.test(cashierName)) {
      return res.status(400).json({
        message: 'Name must contain valid alphabetic characters.'
      });
    }

    // Validate required fields
    if (!email || !password || !business_id) {
      return res.status(400).json({
        message: 'All fields are required.'
      });
    }

    // 🧩 Find business to get owner_id
    const business = await BusinessDetail.findByPk(business_id);
    if (!business) {
      return res.status(404).json({ message: 'Business not found.' });
    }

    const owner_id = business.owner_id;

    // 🧩 Check if owner exists
    const owner = await OwnerDetail.findByPk(owner_id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found for this business.' });
    }

    // 🧩 Check for duplicate email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!strongPassword.test(password)) {
      await t.rollback();

      return res.status(400).json({
        message:
          'Password must be 8+ characters with uppercase, lowercase, number and special character.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    // 🧩 Create new user
    const user = await User.create(
      {
        email,
        password: hashedPassword,
        role: 'cashier',
        status: 'active',
        email_verified_at: new Date(),
      },
      { transaction: t }
    );

    // 🧩 Create cashier detail linked to owner
    const cashier = await CashierDetail.create(
      {
        fullname: cashierName,
        user_id: user.id,
        owner_id,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      message: 'Cashier created successfully',
      user_id: user.id,
      cashier_id: cashier.id,
      owner_id,
      business_id,
    });
  } catch (err) {
    await t.rollback();
    console.error('❌ Error creating cashier:', err);
    return res.status(500).json({
      message: 'Failed to create cashier',
      error: err.message,
    });
  }
};




exports.getCashiers = async (req, res) => {
  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    // Get owner_id from business
    const business = await BusinessDetail.findOne({
      where: { id: business_id },
      attributes: ['owner_id']
    });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Fetch cashiers - don't specify attributes first, let's see what's available
    const cashiers = await CashierDetail.findAll({
      where: { owner_id: business.owner_id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
      // Remove the attributes array temporarily to get all columns
    });

    console.log('Cashier data:', JSON.stringify(cashiers[0], null, 2)); // Log first cashier to see structure

    // Format the response based on actual column names
    const formattedCashiers = cashiers.map(cashier => ({
      id: cashier.id,
      fullname: cashier.fullname || cashier.full_name || cashier.cashier_name || 'Unknown', // Try different possible column names
      username: cashier.user?.username || '',
      email: cashier.user?.email || '',
      phone_number: cashier.phone_number,
      gender: cashier.gender,
      dob: cashier.dob
    }));

    return res.status(200).json({
      success: true,
      cashiers: formattedCashiers
    });

  } catch (error) {
    console.error("Error fetching cashiers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cashiers",
      error: error.message
    });
  }
};
// NEW: Delete a cashier
exports.deleteCashier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cashier_id } = req.params;

    if (!cashier_id) {
      await t.rollback();
      return res.status(400).json({ message: 'Cashier ID is required' });
    }

    // Find the cashier detail
    const cashier = await CashierDetail.findByPk(cashier_id);

    if (!cashier) {
      await t.rollback();
      return res.status(404).json({ message: 'Cashier not found' });
    }

    const userId = cashier.user_id;

    // Delete cashier detail first (foreign key constraint)
    await CashierDetail.destroy({
      where: { id: cashier_id },
      transaction: t
    });

    // Then delete the user account
    await User.destroy({
      where: { id: userId },
      transaction: t
    });

    await t.commit();

    res.json({
      success: true,
      message: 'Cashier deleted successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting cashier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cashier',
      error: error.message
    });
  }
};

// NEW: Get business details by business_id (to fetch owner_id)
exports.getBusinessDetails = async (req, res) => {
  try {
    const { business_id } = req.params;

    if (!business_id) {
      return res.status(400).json({ message: 'Business ID is required' });
    }

    const business = await BusinessDetail.findOne({
      where: { id: business_id },
      attributes: ['id', 'owner_id', 'business_name', 'address', 'phone', 'email']
    });

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json({
      success: true,
      id: business.id,
      owner_id: business.owner_id,
      business_name: business.business_name,
      address: business.address,
      phone: business.phone,
      email: business.email
    });
  } catch (error) {
    console.error('Error fetching business details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business details',
      error: error.message
    });
  }
};