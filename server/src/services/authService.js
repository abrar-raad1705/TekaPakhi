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
   * Register a new account (Customer, Agent, or Merchant)
   * Flow: validate → hash PIN → create profile → create subtype → send OTP
   *
   * - Customers are set to ACTIVE immediately
   * - Agents & Merchants are set to PENDING_KYC (need admin approval to transact)
   */
  async register({ phoneNumber, fullName, securityPin, accountType = 'CUSTOMER', ...subtypeFields }) {
    const existing = await profileModel.findByPhone(phoneNumber);
    if (existing) {
      throw new AppError('An account with this phone number already exists.', 409);
    }

    const typeId = PROFILE_TYPES[accountType];
    if (!typeId || !['CUSTOMER', 'AGENT', 'MERCHANT'].includes(accountType)) {
      throw new AppError('Invalid account type for self-registration.', 400);
    }

    const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create profile
      const profile = await profileModel.create({ phoneNumber, fullName, pinHash, typeId }, client);

      // Create subtype
      let accountStatus;
      if (accountType === 'CUSTOMER') {
        await profileModel.createCustomerSubtype(profile.profile_id, client);
        accountStatus = 'ACTIVE';
      } else if (accountType === 'AGENT') {
        const agentCode = generateAgentCode();
        await profileModel.createAgentSubtype(profile.profile_id, {
          ...subtypeFields,
          agentCode,
        }, client);
        accountStatus = 'PENDING_KYC';
      } else if (accountType === 'MERCHANT') {
        const merchantCode = generateMerchantCode();
        await profileModel.createMerchantSubtype(profile.profile_id, {
          ...subtypeFields,
          merchantCode,
        }, client);
        accountStatus = 'PENDING_KYC';
      }

      // Send OTP
      const otpResult = await otpService.sendOTP(phoneNumber, 'VERIFY_PHONE', client);

      await client.query('COMMIT');

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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(profile.locked_until) - new Date()) / 60000);
      throw new AppError(`Account is temporarily locked. Try again in ${minutesLeft} minute(s).`, 423);
    }

    const isPinValid = await bcrypt.compare(securityPin, profile.security_pin_hash);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!isPinValid) {
        const { failed_pin_attempts } = await profileModel.incrementFailedAttempts(profile.profile_id, client);

        if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000);
          await profileModel.lockAccount(profile.profile_id, lockUntil, client);
          await client.query('COMMIT');
          throw new AppError(`Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`, 423);
        }

        await client.query('COMMIT');
        throw new AppError(`Invalid phone number or PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`, 401);
      }

      // Reset attempts
      await profileModel.resetFailedAttempts(profile.profile_id, client);

      // Status
      const accountStatus = await profileModel.getAccountStatus(profile.profile_id, profile.type_name, client);

      // Tokens
      const accessToken = this.generateAccessToken(profile);

      await client.query('COMMIT');

      return {
        accessToken,
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  /**
   * Verify phone number with OTP
   */
  async verifyOtp({ phoneNumber, otpCode, purpose = 'VERIFY_PHONE' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await otpService.verifyOTP(phoneNumber, otpCode, purpose, client);
      if (purpose === 'VERIFY_PHONE') {
        await profileModel.setPhoneVerified(phoneNumber, client);
      }

      await client.query('COMMIT');
      return { message: 'OTP verified successfully.' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
    const profile = await profileModel.findByPhone(phoneNumber);
    if (!profile) {
      throw new AppError('Profile not found.', 404);
    }

    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify OTP
      await otpService.verifyOTP(phoneNumber, otpCode, 'RESET_PIN', client);

      // Update PIN
      await profileModel.updatePin(profile.profile_id, pinHash, client);

      // Reset attempts
      await profileModel.resetFailedAttempts(profile.profile_id, client);


      await client.query('COMMIT');
      return { message: 'PIN reset successful. Please login with your new PIN.' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
  async verifyTransactionPin(profileId, pin, client = null) {
    const db = client || await pool.connect();
    const isInternalClient = !client;

    try {
      if (isInternalClient) await db.query('BEGIN');

      const profile = await profileModel.findById(profileId, db);
      if (!profile) {
        throw new AppError('Profile not found.', 404);
      }

      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(profile.locked_until) - new Date()) / 60000);
        throw new AppError(`Account locked. Try again in ${minutesLeft} minute(s).`, 423);
      }

      const isPinValid = await bcrypt.compare(pin, profile.security_pin_hash);

      if (!isPinValid) {
        const { failed_pin_attempts } = await profileModel.incrementFailedAttempts(profileId, db);

        if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000);
          await profileModel.lockAccount(profileId, lockUntil, db);

          if (isInternalClient) await db.query('COMMIT');
          throw new AppError(
            `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
            423
          );
        }

        if (isInternalClient) await db.query('COMMIT');
        throw new AppError(
          `Invalid PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
          401
        );
      }

      await profileModel.resetFailedAttempts(profileId, db);

      if (isInternalClient) await db.query('COMMIT');
      return true;
    } catch (error) {
      if (isInternalClient) await db.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternalClient) db.release();
    }
  },

  /**
   * Logout — revoke the specific refresh token
   */
  async logout() {
    return { message: 'Logged out successfully.' };
  },
};

module.exports = authService;
