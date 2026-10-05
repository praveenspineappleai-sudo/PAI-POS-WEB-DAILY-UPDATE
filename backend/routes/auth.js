const express = require("express");
const router = express.Router();
const authController = require("../Controllers/authController");

// router.post('/register', authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

router.post("/check-email-registered", authController.checkEmailRegistered);
router.post("/send-password-reset-otp", authController.sendPasswordResetOTP);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password-otp", authController.resetPasswordWithOTP);
router.post("/resend-otp", authController.resendOTP);
router.post("/google/verify", authController.verifyGoogleToken);

module.exports = router;
