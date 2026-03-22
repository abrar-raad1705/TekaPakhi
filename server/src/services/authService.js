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

<<<<<<< Updated upstream


=======
>>>>>>> Stashed changes
  /**
   * Register a new account (Customer, Agent, or Merchant)
   * Flow: validate → hash PIN → create profile → create subtype → send OTP
   */
<<<<<<< Updated upstream
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
=======
  async register({ phoneNumber, fullName, securityPin, accountType = 'CUSTOMER', ...subtypeFields }, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

      // Check if phone already registered
      const existing = await profileModel.findByPhone(phoneNumber, client);
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
      const profile = await profileModel.create({ phoneNumber, fullName, pinHash, typeId }, client);

      // Create the appropriate subtype profile
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

      // Send OTP for phone verification
      const otpResult = await otpService.sendOTP(phoneNumber, 'VERIFY_PHONE', client);

      if (isInternallyManaged) await client.query('COMMIT');

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
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
    }
>>>>>>> Stashed changes
  },


  /**
   * Login with phone + PIN
   * Flow: find profile → check lock → verify PIN → generate token
   */
  async login({ phoneNumber, securityPin }, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

<<<<<<< Updated upstream
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
=======
      const profile = await profileModel.findByPhone(phoneNumber, client);
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
          profile.profile_id,
          client
        );

        if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date(
            Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000
          );
          await profileModel.lockAccount(profile.profile_id, lockUntil, client);

          if (isInternallyManaged) await client.query('COMMIT'); // Commit the lock

          throw new AppError(
            `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
            423
          );
        }

        if (isInternallyManaged) await client.query('COMMIT'); // Commit the increment
        throw new AppError(
          `Invalid phone number or PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
          403
        );
      }

      // Reset failed attempts on successful login
      await profileModel.resetFailedAttempts(profile.profile_id, client);

      // Get account status from subtype table
      const accountStatus = await profileModel.getAccountStatus(profile.profile_id, profile.type_name, client);

      // Generate access token
      const accessToken = this.generateAccessToken(profile);

      if (isInternallyManaged) await client.query('COMMIT');
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
=======
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
>>>>>>> Stashed changes
    }
  },


  /**
   * Verify phone number with OTP
   */
<<<<<<< Updated upstream
  async verifyOtp({ phoneNumber, otpCode, purpose = 'VERIFY_PHONE' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
=======
  async verifyOtp({ phoneNumber, otpCode, purpose = 'VERIFY_PHONE' }, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');
>>>>>>> Stashed changes

      await otpService.verifyOTP(phoneNumber, otpCode, purpose, client);
      if (purpose === 'VERIFY_PHONE') {
        await profileModel.setPhoneVerified(phoneNumber, client);
      }

<<<<<<< Updated upstream
      await client.query('COMMIT');
      return { message: 'OTP verified successfully.' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
=======
      if (isInternallyManaged) await client.query('COMMIT');
      return { message: 'OTP verified successfully.' };
    } catch (error) {
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
>>>>>>> Stashed changes
    }
  },


  /**
   * Request OTP for PIN reset
   */
<<<<<<< Updated upstream
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
=======
  async requestOtp(phoneNumber, purpose = 'RESET_PIN', clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

      const profile = await profileModel.findByPhone(phoneNumber, client);
      if (!profile) {
        if (isInternallyManaged) await client.query('COMMIT');
        return { message: 'OTP sent successfully.' };
      }

      const otpResult = await otpService.sendOTP(phoneNumber, purpose, client);

      if (isInternallyManaged) await client.query('COMMIT');
      return {
        message: 'OTP sent successfully.',
        ...otpResult,
      };
    } catch (error) {
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
    }
>>>>>>> Stashed changes
  },


  /**
   * Reset PIN with OTP verification
   */
<<<<<<< Updated upstream
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
=======
  async resetPin({ phoneNumber, otpCode, newPin }, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

      const profile = await profileModel.findByPhone(phoneNumber, client);
      if (!profile) {
        throw new AppError('Profile not found.', 404);
      }

      // Hash new PIN and update
      const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);
      await profileModel.updatePin(profile.profile_id, pinHash, client);

      // Reset failed attempts and unlock
      await profileModel.resetFailedAttempts(profile.profile_id, client);

      if (isInternallyManaged) await client.query('COMMIT');
      return { message: 'PIN reset successful. Please login with your new PIN.' };
    } catch (error) {
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
    }
>>>>>>> Stashed changes
  },


  /**
   * Change PIN (authenticated user, requires old PIN)
   */
  async changePin({ profileId, oldPin, newPin }, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

      const profile = await profileModel.findById(profileId, client);
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
      await profileModel.updatePin(profileId, pinHash, client);

      if (isInternallyManaged) await client.query('COMMIT');
      return { message: 'PIN changed successfully.' };
    } catch (error) {
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
    }
  },


  /**
   * Verify transaction PIN (reusable for any PIN-gated action)
   * Includes brute force protection (lock after MAX_PIN_ATTEMPTS)
   */
<<<<<<< Updated upstream
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
=======
  async verifyTransactionPin(profileId, pin, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

      const profile = await profileModel.findById(profileId, client);
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
        const { failed_pin_attempts } = await profileModel.incrementFailedAttempts(profileId, client);

        if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000);
          await profileModel.lockAccount(profileId, lockUntil, client);

          if (isInternallyManaged) await client.query('COMMIT'); // Commit the lock
>>>>>>> Stashed changes
          throw new AppError(
            `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
            423
          );
        }

<<<<<<< Updated upstream
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
=======
        if (isInternallyManaged) await client.query('COMMIT'); // Commit increment
        throw new AppError(
          `Invalid PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
          403
        );
      }


      // Reset on success
      await profileModel.resetFailedAttempts(profileId, client);

      if (isInternallyManaged) await client.query('COMMIT');
      return true;
    } catch (error) {
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
>>>>>>> Stashed changes
    }
  },


  /**
   * Logout (clears session on client side)
   */
<<<<<<< Updated upstream
  async logout() {
    return { message: 'Logged out successfully.' };
  },
};

module.exports = authService;
=======
  async logout(profileId, clientArg) {
    const isInternallyManaged = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (isInternallyManaged) await client.query('BEGIN');

      if (isInternallyManaged) await client.query('COMMIT');
      return { message: 'Logged out successfully.' };
    } catch (error) {
      if (isInternallyManaged) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (isInternallyManaged) client.release();
    }
  },

  /**
   * Check if a phone number already exists
   */
  async checkPhone(phoneNumber, clientArg) {
    const client = clientArg || pool;
    const existing = await profileModel.findByPhone(phoneNumber, client);
    return { exists: !!existing };
  },

};


export default authService;

>>>>>>> Stashed changes
