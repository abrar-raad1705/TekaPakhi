const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const profileModel = require('../models/profileModel');
const otpService = require('./otpService');
const { hashToken, generateAgentCode, generateMerchantCode } = require('../utils/helpers');
const { PROFILE_TYPES } = require('../utils/constants');

const SALT_ROUNDS = 12;

const authService = {
  /**
   * Generate a JWT access token
   */
  generateAccessToken(profile) {
    return jwt.sign(
      {
        profileId: profile.profile_id,
        phoneNumber: profile.phone_number,
        typeId: profile.type_id,
        typeName: profile.type_name,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );
  },

  /**
   * Generate a random refresh token (raw string)
   */
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  },

  /**
   * Store a refresh token hash in the database
   */
  async storeRefreshToken(profileId, refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO tp.refresh_tokens (profile_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [profileId, tokenHash, expiresAt]
    );
  },

  /**
   * Register a new account (Customer, Agent, or Merchant)
   * Flow: validate → hash PIN → create profile → create subtype → send OTP
   *
   * - Customers are set to ACTIVE immediately
   * - Agents & Merchants are set to PENDING_KYC (need admin approval to transact)
   */
  async register({ phoneNumber, fullName, securityPin, accountType = 'CUSTOMER', ...subtypeFields }) {
    // Check if phone already registered
    const existing = await profileModel.findByPhone(phoneNumber);
    if (existing) {
      throw new AppError('An account with this phone number already exists.', 409);
    }

    // Map account type string to type ID
    const typeId = PROFILE_TYPES[accountType];
    if (!typeId || !['CUSTOMER', 'AGENT', 'MERCHANT'].includes(accountType)) {
      throw new AppError('Invalid account type for self-registration.', 400);
    }

    // Hash the security PIN
    const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);

    // Create profile (DB trigger auto-creates wallet)
    const profile = await profileModel.create({ phoneNumber, fullName, pinHash, typeId });

    // Create the appropriate subtype profile
    let accountStatus;
    if (accountType === 'CUSTOMER') {
      await profileModel.createCustomerSubtype(profile.profile_id);
      accountStatus = 'ACTIVE';
    } else if (accountType === 'AGENT') {
      // Auto-generate agent code
      const agentCode = generateAgentCode();
      await profileModel.createAgentSubtype(profile.profile_id, {
        ...subtypeFields,
        agentCode,
      });
      accountStatus = 'PENDING_KYC';
    } else if (accountType === 'MERCHANT') {
      // Auto-generate merchant code
      const merchantCode = generateMerchantCode();
      await profileModel.createMerchantSubtype(profile.profile_id, {
        ...subtypeFields,
        merchantCode,
      });
      accountStatus = 'PENDING_KYC';
    }

    // Send OTP for phone verification
    const otpResult = await otpService.sendOTP(phoneNumber, 'VERIFY_PHONE');

    const pendingMsg = accountStatus === 'PENDING_KYC'
      ? ' Your account is pending verification by admin.'
      : '';

    return {
      message: `Registration successful. Please verify your phone number.${pendingMsg}`,
      profileId: profile.profile_id,
      phoneNumber: profile.phone_number,
      fullName: profile.full_name,
      accountType,
      accountStatus,
      ...otpResult,
    };
  },

  /**
   * Login with phone + PIN
   * Flow: find profile → check lock → verify PIN → generate tokens
   */
  async login({ phoneNumber, securityPin }) {
    const profile = await profileModel.findByPhone(phoneNumber);
    if (!profile) {
      throw new AppError('Invalid phone number or PIN.', 401);
    }

    // Check if account is locked
    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(profile.locked_until) - new Date()) / 60000
      );
      throw new AppError(
        `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
        423
      );
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(securityPin, profile.security_pin_hash);

    if (!isPinValid) {
      const { failed_pin_attempts } = await profileModel.incrementFailedAttempts(
        profile.profile_id
      );

      if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
        const lockUntil = new Date(
          Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000
        );
        await profileModel.lockAccount(profile.profile_id, lockUntil);
        throw new AppError(
          `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
          423
        );
      }

      throw new AppError(
        `Invalid phone number or PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
        401
      );
    }

    // Reset failed attempts on successful login
    await profileModel.resetFailedAttempts(profile.profile_id);

    // Get account status from subtype table
    const accountStatus = await profileModel.getAccountStatus(profile.profile_id, profile.type_name);

    // Generate token pair
    const accessToken = this.generateAccessToken(profile);
    const refreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(profile.profile_id, refreshToken);

    return {
      accessToken,
      refreshToken,
      profile: {
        profileId: profile.profile_id,
        phoneNumber: profile.phone_number,
        fullName: profile.full_name,
        typeId: profile.type_id,
        typeName: profile.type_name,
        isPhoneVerified: profile.is_phone_verified,
        accountStatus,
      },
    };
  },

  /**
   * Refresh an expired access token using a valid refresh token
   */
  async refreshToken(refreshToken) {
    const tokenHash = hashToken(refreshToken);

    // Look up the refresh token directly by hash
    const result = await pool.query(
      `SELECT rt.*, p.phone_number, p.type_id, p.full_name, pt.type_name
       FROM tp.refresh_tokens rt
       JOIN tp.profiles p ON rt.profile_id = p.profile_id
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE rt.token_hash = $1 AND rt.is_revoked = FALSE AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    const matchedToken = result.rows[0];

    // Revoke the old refresh token (rotate)
    await pool.query(
      `UPDATE tp.refresh_tokens SET is_revoked = TRUE WHERE token_id = $1`,
      [matchedToken.token_id]
    );

    // Generate new token pair
    const profile = {
      profile_id: matchedToken.profile_id,
      phone_number: matchedToken.phone_number,
      type_id: matchedToken.type_id,
      type_name: matchedToken.type_name,
    };

    const newAccessToken = this.generateAccessToken(profile);
    const newRefreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(matchedToken.profile_id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },

  /**
   * Verify phone number with OTP
   */
  async verifyPhone({ phoneNumber, otpCode }) {
    await otpService.verifyOTP(phoneNumber, otpCode, 'VERIFY_PHONE');
    await profileModel.setPhoneVerified(phoneNumber);
    return { message: 'Phone number verified successfully.' };
  },

  /**
   * Request OTP for PIN reset
   */
  async forgotPin(phoneNumber) {
    const profile = await profileModel.findByPhone(phoneNumber);
    if (!profile) {
      // Don't reveal whether the phone is registered
      return { message: 'If this phone number is registered, you will receive an OTP.' };
    }

    const otpResult = await otpService.sendOTP(phoneNumber, 'RESET_PIN');
    return {
      message: 'If this phone number is registered, you will receive an OTP.',
      ...otpResult,
    };
  },

  /**
   * Reset PIN with OTP verification
   */
  async resetPin({ phoneNumber, otpCode, newPin }) {
    await otpService.verifyOTP(phoneNumber, otpCode, 'RESET_PIN');

    const profile = await profileModel.findByPhone(phoneNumber);
    if (!profile) {
      throw new AppError('Profile not found.', 404);
    }

    // Hash new PIN and update
    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);
    await profileModel.updatePin(profile.profile_id, pinHash);

    // Reset failed attempts and unlock
    await profileModel.resetFailedAttempts(profile.profile_id);

    // Revoke all refresh tokens (security measure)
    await pool.query(
      `UPDATE tp.refresh_tokens SET is_revoked = TRUE WHERE profile_id = $1`,
      [profile.profile_id]
    );

    return { message: 'PIN reset successful. Please login with your new PIN.' };
  },

  /**
   * Change PIN (authenticated user, requires old PIN)
   */
  async changePin({ profileId, oldPin, newPin }) {
    const profile = await profileModel.findById(profileId);
    if (!profile) {
      throw new AppError('Profile not found.', 404);
    }

    // Verify old PIN
    const isPinValid = await bcrypt.compare(oldPin, profile.security_pin_hash);
    if (!isPinValid) {
      throw new AppError('Current PIN is incorrect.', 401);
    }

    // Hash and update new PIN
    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);
    await profileModel.updatePin(profileId, pinHash);

    return { message: 'PIN changed successfully.' };
  },

  /**
   * Verify transaction PIN (reusable for any PIN-gated action)
   * Includes brute force protection (lock after MAX_PIN_ATTEMPTS)
   */
  async verifyTransactionPin(profileId, pin) {
    const profile = await profileModel.findById(profileId);
    if (!profile) {
      throw new AppError('Profile not found.', 404);
    }

    // Check if account is locked
    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(profile.locked_until) - new Date()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutesLeft} minute(s).`, 423);
    }

    const isPinValid = await bcrypt.compare(pin, profile.security_pin_hash);

    if (!isPinValid) {
      const { failed_pin_attempts } = await profileModel.incrementFailedAttempts(profileId);

      if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000);
        await profileModel.lockAccount(profileId, lockUntil);
        throw new AppError(
          `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
          423
        );
      }

      throw new AppError(
        `Invalid PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
        401
      );
    }

    // Reset on success
    await profileModel.resetFailedAttempts(profileId);
    return true;
  },

  /**
   * Logout — revoke the specific refresh token
   */
  async logout(profileId, refreshToken) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await pool.query(
        `UPDATE tp.refresh_tokens SET is_revoked = TRUE
         WHERE profile_id = $1 AND token_hash = $2`,
        [profileId, tokenHash]
      );
    }

    return { message: 'Logged out successfully.' };
  },
};

module.exports = authService;
