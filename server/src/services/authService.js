import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool, { DB_SCHEMA } from '../config/db.js';
import env from "../config/env.js";
import AppError from "../utils/AppError.js";
import profileModel from "../models/profileModel.js";
import otpService from "./otpService.js";
import { generateAgentCode, generateMerchantCode } from "../utils/helpers.js";
import { PROFILE_TYPES, PIN_RESET_RESTRICTED_TYPE_NAMES } from "../utils/constants.js";
import securityLogService from "./securityLogService.js";

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
      { expiresIn: env.JWT_ACCESS_EXPIRY },
    );
  },

  /**
   * Register a new account (Customer, Agent, or Merchant)
   * Flow: validate → hash PIN → create profile → create subtype → send OTP
   *
   * - Customers are set to ACTIVE immediately
   * - Agents & Merchants are set to PENDING_KYC (need admin approval to transact)
   */
  async register({
    phoneNumber,
    fullName,
    securityPin,
    accountType = "CUSTOMER",
    otpCode,
    ...subtypeFields
  }) {
    // Verify OTP first
    await otpService.verifyOTP(phoneNumber, otpCode, "VERIFY_PHONE");

    // Check if phone already registered
    const existing = await profileModel.findByPhone(phoneNumber);
    if (existing) {
      throw new AppError(
        "An account with this phone number already exists.",
        409,
      );
    }

    // Map account type string to type ID
    const typeId = PROFILE_TYPES[accountType];
    if (!typeId || !["CUSTOMER", "AGENT", "MERCHANT"].includes(accountType)) {
      throw new AppError("Invalid account type for self-registration.", 400);
    }

    const client = await pool.connect();
    let accountStatus;
    let profile;

    try {
      await client.query("BEGIN");

      // Hash the security PIN
      const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);

      // Create profile (DB trigger auto-creates wallet)
      profile = await profileModel.create(
        {
          phoneNumber,
          fullName,
          pinHash,
          typeId,
        },
        client
      );

      // Create the appropriate subtype profile
      if (accountType === "CUSTOMER") {
        await profileModel.createCustomerSubtype(profile.profile_id, client);
        accountStatus = "ACTIVE";
      } else if (accountType === "AGENT") {
        // Auto-generate agent code
        const agentCode = generateAgentCode();
        await profileModel.createAgentSubtype(
          profile.profile_id,
          {
            ...subtypeFields,
            agentCode,
          },
          client
        );
        accountStatus = "PENDING_KYC";
      } else if (accountType === "MERCHANT") {
        // Auto-generate merchant code
        const merchantCode = generateMerchantCode();
        await profileModel.createMerchantSubtype(
          profile.profile_id,
          {
            ...subtypeFields,
            merchantCode,
          },
          client
        );
        accountStatus = "PENDING_KYC";
      }

      // Mark phone as verified!
      await profileModel.setPhoneVerified(phoneNumber, client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const pendingMsg =
      accountStatus === "PENDING_KYC"
        ? " Your account is pending verification by admin."
        : "";

    return {
      message: `Registration successful. You can now log in.${pendingMsg}`,
      profileId: profile.profile_id,
      phoneNumber: profile.phone_number,
      fullName: profile.full_name,
      accountType,
      accountStatus,
    };
  },

  /**
   * Login with phone + PIN
   * Flow: find profile → check lock → verify PIN → generate access token
   */
  async login({ phoneNumber, securityPin, meta }) {
    const profile = await profileModel.findByPhone(phoneNumber);
    if (!profile) {
      securityLogService.logEvent({ profileId: null, eventType: 'LOGIN_FAILURE', ...meta, metadata: { phoneNumber, reason: 'unknown_phone' } });
      throw new AppError("Invalid phone number or PIN.", 401);
    }

    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(profile.locked_until) - new Date()) / 60000,
      );
      securityLogService.logEvent({ profileId: profile.profile_id, eventType: 'LOGIN_FAILURE', ...meta, metadata: { reason: 'account_locked', minutesLeft } });
      throw new AppError(
        `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
        423,
      );
    }

    const isPinValid = await bcrypt.compare(
      securityPin,
      profile.security_pin_hash,
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (!isPinValid) {
        const { failed_pin_attempts } =
          await profileModel.incrementFailedAttempts(profile.profile_id, client);

        if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date(
            Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000,
          );
          await profileModel.lockAccount(profile.profile_id, lockUntil, client);
          await client.query("COMMIT");
          securityLogService.logEvent({ profileId: profile.profile_id, eventType: 'ACCOUNT_LOCK', ...meta, metadata: { reason: 'max_pin_attempts', lockUntil } });
          throw new AppError(
            `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
            423,
          );
        }

        await client.query("COMMIT");
        securityLogService.logEvent({ profileId: profile.profile_id, eventType: 'LOGIN_FAILURE', ...meta, metadata: { failedAttempts: failed_pin_attempts } });
        throw new AppError(
          `Invalid phone number or PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
          401,
        );
      }

      await profileModel.resetFailedAttempts(profile.profile_id, client);

      // Get account status from subtype table
      const accountStatus = await profileModel.getAccountStatus(
        profile.profile_id,
        profile.type_name,
      );

      let isPhoneVerified = profile.is_phone_verified;
      let requiresPinSetup = false;
      if (profile.type_name === "DISTRIBUTOR" || profile.type_name === "BILLER") {
        await client.query(
          `UPDATE ${DB_SCHEMA}.profiles SET is_phone_verified = TRUE WHERE profile_id = $1`,
          [profile.profile_id],
        );
        isPhoneVerified = true;
        const subtypeTable =
          profile.type_name === "DISTRIBUTOR"
            ? "distributor_profiles"
            : "biller_profiles";
        const dp = await client.query(
          `SELECT pending_pin_setup FROM ${DB_SCHEMA}.${subtypeTable} WHERE profile_id = $1`,
          [profile.profile_id],
        );
        requiresPinSetup = dp.rows[0]?.pending_pin_setup === true;
      }

      await client.query("COMMIT");

      securityLogService.logEvent({ profileId: profile.profile_id, eventType: 'LOGIN_SUCCESS', ...meta });

      const accessToken = this.generateAccessToken(profile);

      return {
        accessToken,
        profile: {
          profileId: profile.profile_id,
          phoneNumber: profile.phone_number,
          fullName: profile.full_name,
          typeId: profile.type_id,
          typeName: profile.type_name,
          isPhoneVerified,
          requiresPinSetup,
          accountStatus,
        },
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Distributor/Biller first login: replace temporary PIN with a permanent PIN (mandatory once).
   */
  async finalizeAccountPin(profileId, newPin) {
    const profile = await profileModel.findById(profileId);
    if (
      !profile ||
      (profile.type_name !== "DISTRIBUTOR" && profile.type_name !== "BILLER")
    ) {
      throw new AppError(
        "This action is only for distributor or biller accounts.",
        403,
      );
    }
    const subtypeTable =
      profile.type_name === "DISTRIBUTOR"
        ? "distributor_profiles"
        : "biller_profiles";
    const r = await pool.query(
      `SELECT pending_pin_setup FROM ${DB_SCHEMA}.${subtypeTable} WHERE profile_id = $1`,
      [profileId],
    );
    if (!r.rows[0]?.pending_pin_setup) {
      throw new AppError("PIN setup already completed.", 400);
    }
    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await profileModel.updatePin(profileId, pinHash, client);
      await client.query(
        `UPDATE ${DB_SCHEMA}.${subtypeTable} SET pending_pin_setup = FALSE WHERE profile_id = $1`,
        [profileId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { message: "Your PIN has been set. You can now use the app." };
  },

  /**
   * Verify phone number with OTP
   */
  async verifyOtp({ phoneNumber, otpCode, purpose = "VERIFY_PHONE", isCheckOnly = false, meta }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await otpService.verifyOTP(phoneNumber, otpCode, purpose, !isCheckOnly, client);
      const profile = await profileModel.findByPhone(phoneNumber);
      if (!isCheckOnly && purpose === "VERIFY_PHONE" && profile) {
        await profileModel.setPhoneVerified(phoneNumber, client);
      }
      await client.query("COMMIT");
      securityLogService.logEvent({ profileId: profile?.profile_id ?? null, eventType: 'OTP_VERIFY', ...meta, metadata: { purpose, phoneNumber } });
      return { message: "OTP verified successfully." };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Request OTP for PIN reset or phone verification
   */
  async requestOtp(phoneNumber, purpose = "RESET_PIN", meta) {
    const profile = await profileModel.findByPhone(phoneNumber);

    if (purpose === "VERIFY_PHONE") {
      if (profile) {
        throw new AppError(
          "An account with this phone number already exists.",
          409,
        );
      }
    } else {
      if (!profile) {
        return { message: "OTP sent successfully." };
      }
      if (
        purpose === "RESET_PIN" &&
        PIN_RESET_RESTRICTED_TYPE_NAMES.includes(profile.type_name) &&
        !profile.pin_reset_granted
      ) {
        throw new AppError(
          "This number is not eligible for Forgot PIN. Please contact admin.",
          403,
        );
      }
    }

    const otpResult = await otpService.sendOTP(phoneNumber, purpose);
    securityLogService.logEvent({ profileId: profile?.profile_id ?? null, eventType: 'OTP_REQUEST', ...meta, metadata: { purpose, phoneNumber } });
    return {
      message: "OTP sent successfully.",
      ...otpResult,
    };
  },

  /**
   * Reset PIN with OTP verification
   */
  async resetPin({ phoneNumber, otpCode, newPin, meta }) {
    const profile = await profileModel.findByPhone(phoneNumber);
    if (!profile) {
      throw new AppError("Profile not found.", 404);
    }

    const wasAdminGranted = PIN_RESET_RESTRICTED_TYPE_NAMES.includes(profile.type_name) && profile.pin_reset_granted;

    if (
      PIN_RESET_RESTRICTED_TYPE_NAMES.includes(profile.type_name) &&
      !profile.pin_reset_granted
    ) {
      throw new AppError(
        "PIN reset is not authorized. Please contact admin.",
        403,
      );
    }

    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await profileModel.updatePin(profile.profile_id, pinHash, client);
      await profileModel.resetFailedAttempts(profile.profile_id, client);
      if (PIN_RESET_RESTRICTED_TYPE_NAMES.includes(profile.type_name)) {
        await profileModel.setPinResetGranted(profile.profile_id, false, client);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    securityLogService.logEvent({ profileId: profile.profile_id, eventType: 'PIN_RESET', ...meta, metadata: { adminGranted: wasAdminGranted } });
    return { message: "PIN reset successful. Please login with your new PIN." };
  },

  /**
   * Change PIN (authenticated user, requires old PIN)
   */
  async changePin({ profileId, oldPin, newPin, meta }) {
    const profile = await profileModel.findById(profileId);
    if (!profile) {
      throw new AppError("Profile not found.", 404);
    }

    const isPinValid = await bcrypt.compare(oldPin, profile.security_pin_hash);
    if (!isPinValid) {
      throw new AppError("Current PIN is incorrect.", 403);
    }

    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await profileModel.updatePin(profileId, pinHash, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    securityLogService.logEvent({ profileId, eventType: 'PIN_CHANGE', ...meta });
    return { message: "PIN changed successfully." };
  },

  /**
   * Verify transaction PIN (reusable for any PIN-gated action)
   * Includes brute force protection (lock after MAX_PIN_ATTEMPTS)
   */
  async verifyTransactionPin(profileId, pin, meta) {
    const profile = await profileModel.findById(profileId);
    if (!profile) {
      throw new AppError("Profile not found.", 404);
    }

    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(profile.locked_until) - new Date()) / 60000,
      );
      throw new AppError(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
        423,
      );
    }

    const isPinValid = await bcrypt.compare(pin, profile.security_pin_hash);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (!isPinValid) {
        const { failed_pin_attempts } =
          await profileModel.incrementFailedAttempts(profileId, client);

        if (failed_pin_attempts >= env.MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date(
            Date.now() + env.PIN_LOCK_DURATION_MINUTES * 60 * 1000,
          );
          await profileModel.lockAccount(profileId, lockUntil, client);
          await client.query("COMMIT");
          securityLogService.logEvent({ profileId, eventType: 'ACCOUNT_LOCK', ...meta, metadata: { reason: 'max_txn_pin_attempts', lockUntil } });
          throw new AppError(
            `Too many failed attempts. Account locked for ${env.PIN_LOCK_DURATION_MINUTES} minutes.`,
            423,
          );
        }

        await client.query("COMMIT");
        securityLogService.logEvent({ profileId, eventType: 'TXN_PIN_FAILURE', ...meta, metadata: { failedAttempts: failed_pin_attempts } });
        throw new AppError(
          `Invalid PIN. ${env.MAX_PIN_ATTEMPTS - failed_pin_attempts} attempt(s) remaining.`,
          403,
        );
      }

      await profileModel.resetFailedAttempts(profileId, client);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Logout (client discards JWT)
   */
  async logout() {
    return { message: "Logged out successfully." };
  },
  /**
   * Check if a phone number already exists
   */
  async checkPhone(phoneNumber) {
    const existing = await profileModel.findByPhone(phoneNumber);
    return { exists: !!existing };
  },
};

export default authService;
