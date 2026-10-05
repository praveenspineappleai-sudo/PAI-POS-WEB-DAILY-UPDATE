const {
  sequelize,
  User,
  OwnerDetail,
  BusinessDetail,
  CashierDetail,
  Otp,
} = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -------------------- LOGIN --------------------
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const identifier = (email || "").trim();

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Email or username and password are required" });
    }

    // Step 1: Find the user by email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { username: identifier }],
      },
    });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });
    if (user.status !== "active")
      return res.status(403).json({ message: "Account inactive" });

    // Step 2: Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid email or password" });

    let businessId = null;
    let businessName = null;

    const roleLower = (user.role || "").toLowerCase();

    if (
      roleLower === "owner" ||
      roleLower === "admin" ||
      roleLower === "superadmin" ||
      roleLower === "super_admin" ||
      roleLower === "super admin"
    ) {
      // 1. Try owner details
      const owner = await OwnerDetail.findOne({
        where: { user_id: user.id },
        include: [{ model: BusinessDetail, as: "businessDetail" }],
      });

      if (owner?.businessDetail) {
        businessId = owner.businessDetail.id;
        businessName = owner.businessDetail.name;
      } else {
        // 2. Try cashier details
        const cashier = await CashierDetail.findOne({
          where: { user_id: user.id },
        });
        if (cashier) {
          const business = await BusinessDetail.findOne({
            where: { owner_id: cashier.owner_id },
          });
          if (business) {
            businessId = business.id;
            businessName = business.name;
          }
        }
      }

      // 3. Fallback for superadmin / admin without specific business link
      if (!businessId && (roleLower.includes("admin") || roleLower.includes("super"))) {
        const defaultBusiness = await BusinessDetail.findOne();
        if (defaultBusiness) {
          businessId = defaultBusiness.id;
          businessName = defaultBusiness.name;
        }
      }

      if (!businessId && roleLower === "owner") {
        return res
          .status(400)
          .json({ message: "No business associated with this owner" });
      }
    } else if (roleLower === "cashier") {
      // Fetch cashier details to get owner_id
      const cashier = await CashierDetail.findOne({
        where: { user_id: user.id },
      });
      if (!cashier)
        return res.status(400).json({ message: "No cashier details found" });

      // Fetch business using owner_id
      const business = await BusinessDetail.findOne({
        where: { owner_id: cashier.owner_id },
      });
      if (!business)
        return res
          .status(400)
          .json({ message: "No business associated with this cashier" });

      businessId = business.id;
      businessName = business.name;
    }

    // Step 3: Create JWT tokens
    const payload = {
      userId: user.id,
      role: user.role,
      businessId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "1h",
      algorithm: "HS256",
    });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: rememberMe ? "30d" : "1d",
      algorithm: "HS256",
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId,
        businessName,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// -------------------- REFRESH TOKEN --------------------
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token required" });

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    });

    // Find user
    const user = await User.findOne({
      where: { id: decoded.userId },
      include: [
        {
          model: OwnerDetail,
          as: "ownerDetail",
          include: [
            {
              model: BusinessDetail,
              as: "businessDetail",
            },
          ],
        },
      ],
    });

    if (!user || user.status !== "active") {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const userData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ownerId: user.ownerDetail?.id,
      ownerName: user.ownerDetail?.name,
      businessId: user.ownerDetail?.businessDetail?.id,
      businessName: user.ownerDetail?.businessDetail?.name,
    };

    const newAccessToken = jwt.sign(userData, JWT_SECRET, {
      expiresIn: "1h",
      algorithm: "HS256",
    });

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    res.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// -------------------- LOGOUT --------------------
exports.logout = async (req, res) => {
  try {
    // If using cookies, clear them (optional)
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // Optionally, if you store refresh tokens in DB, invalidate it here
    // await RefreshToken.destroy({ where: { userId: req.user.id } });

    // Respond to client so it can remove tokens from storage
    res.json({
      message: "Logout successful",
      removeTokens: true, // hint for frontend to remove JWTs from AsyncStorage or localStorage
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Logout failed" });
  }
};

// -------------------- SEND OTP FOR PASSWORD RESET --------------------
exports.checkEmailRegistered = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        registered: false,
        message: "Unregistered Email, Cannot Proceed",
      });
    }

    return res.status(200).json({
      success: true,
      registered: true,
      message: "Email is registered",
    });
  } catch (error) {
    console.error("Check email registered error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify email. Please try again.",
    });
  }
};

exports.sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, an OTP has been sent",
      });
    }

    // Delete any existing password reset OTPs for this email
    // await Otp.destroy({
    //   where: {
    //     target: email,
    //     type: "password_reset",
    //   },
    // });

    // Generate OTP
    const code = generateOtp();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await Otp.create({
      target: email,
      code: code,
      type: "password_reset",
      expires_at: expires_at,
      attempts: 0,
      verified: false,
    });

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.log(`🔐 Password Reset OTP for ${email}: ${code}`);
    }

    // Send email
    const mailOptions = {
      from: `"PAIPOS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested to reset your password. Use the OTP below to proceed:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p><strong>This OTP will expire in 10 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "If the email exists, an OTP has been sent to your email",
      ...(process.env.NODE_ENV === "development" && { devCode: code }),
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// -------------------- VERIFY OTP --------------------
exports.verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({
      where: {
        target: email, // <--- use 'target' here
        type: "password_reset",
        code: code, // also make sure 'otp' column is actually 'code'
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new one.",
      });
    }

  

    // Check attempts (prevent brute force)
    if (otpRecord.attempts >= 5) {
      await otpRecord.destroy();
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (otpRecord.code !== code.toString()) {
      await otpRecord.update({
        attempts: otpRecord.attempts + 1,
      });
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${
          5 - (otpRecord.attempts + 1)
        } attempts remaining.`,
      });
    }

    // Mark as verified
    await otpRecord.update({
      verified: true,
      verified_at: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// -------------------- RESET PASSWORD WITH OTP --------------------
exports.resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Find verified OTP
    const otpRecord = await Otp.findOne({
      where: {
        target: email,
        code: code,
        type: "password_reset",
        verified: true,
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP. Please verify OTP first.",
      });
    }

   

    // Find user
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({
      password: hashedPassword,
    });

    // Delete OTP after successful password reset
    await otpRecord.destroy();

    // Send confirmation email
    const mailOptions = {
      from: `"PAIPOS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Successfully Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">Password Reset Successful</h2>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in with your new password.</p>
          <p><strong>If you didn't make this change, please contact support immediately.</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// -------------------- RESEND OTP --------------------
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find the most recent OTP
    const existingOTP = await Otp.findOne({
      where: {
        target: email,
        type: "password_reset",
      },
      order: [["created_at", "DESC"]],
    });

    // Rate limiting: prevent resend within 60 seconds
    if (existingOTP) {
      const timeSinceCreation = Date.now() - existingOTP.createdAt.getTime();
      if (timeSinceCreation < 60000) {
        return res.status(429).json({
          success: false,
          message: "Please wait 60 seconds before requesting a new OTP",
        });
      }
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, an OTP has been sent",
      });
    }

    // // Delete old OTPs
    // await Otp.destroy({
    //   where: {
    //     target: email,
    //     type: 'password_reset'
    //   }
    // });

    // Generate new OTP
    const code = generateOtp();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      target: email,
      code: code,
      type: "password_reset",
      expires_at: expires_at,
      attempts: 0,
      verified: false,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`🔐 Resent OTP for ${email}: ${code}`);
    }

    // Send email
    const mailOptions = {
      from: `"PAIPOS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP - Resent",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Password Reset OTP</h2>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p><strong>This OTP will expire in 10 minutes.</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "New OTP has been sent to your email",
      ...(process.env.NODE_ENV === "development" && { devCode: code }),
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// -------------------- GOOGLE SIGN-IN TOKEN VERIFICATION --------------------
exports.verifyGoogleToken = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential token is required",
      });
    }

    // Verify the Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      console.error("Google token verification failed:", verifyError);
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not provided by Google",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      // Existing user - check if they're a cashier (not allowed for Google sign-in)
      if (user.role === "cashier") {
        return res.status(403).json({
          success: false,
          message: "Google Sign-In is only available for owner accounts. Please use email/password to login.",
        });
      }

      // Existing owner - get business details
      let businessId = null;
      let businessName = null;

      const owner = await OwnerDetail.findOne({
        where: { user_id: user.id },
        include: [{ model: BusinessDetail, as: "businessDetail" }],
      });

      if (owner?.businessDetail) {
        businessId = owner.businessDetail.id;
        businessName = owner.businessDetail.name;
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role, businessId },
        JWT_SECRET,
        { expiresIn: "1h", algorithm: "HS256" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: "30d", algorithm: "HS256" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          businessId,
          businessName,
        },
        accessToken,
        refreshToken,
      });
    }

    // New user - create account with transaction
    const transaction = await sequelize.transaction();

    try {
      // Generate random secure password (user will never use it)
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Create User record with role 'owner'
      user = await User.create(
        {
          email: email,
          username: email.split("@")[0], // Use email prefix as username
          password: hashedPassword,
          role: "owner",
          status: "active",
        },
        { transaction }
      );

      // Create OwnerDetail record
      await OwnerDetail.create(
        {
          user_id: user.id,
          name: name || email.split("@")[0],
          phone_number: "", // Can be filled later
          gender: null,
          dob: null,
        },
        { transaction }
      );

      await transaction.commit();

      // Generate tokens for new user
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role, businessId: null },
        JWT_SECRET,
        { expiresIn: "1h", algorithm: "HS256" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: "30d", algorithm: "HS256" }
      );

      return res.json({
        success: true,
        message: "Account created successfully. Please complete your business setup.",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          businessId: null, // New users don't have business yet
          businessName: null,
        },
        accessToken,
        refreshToken,
        isNewUser: true, // Flag to indicate business setup needed
      });
    } catch (createError) {
      await transaction.rollback();
      console.error("User creation error:", createError);
      return res.status(500).json({
        success: false,
        message: "Failed to create user account",
      });
    }
  } catch (error) {
    console.error("Google Sign-In error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during Google Sign-In",
    });
  }
};
