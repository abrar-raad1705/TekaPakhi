import pool from '../config/db.js';
import env from '../config/env.js';
import { generateOTP } from '../utils/helpers.js';
import AppError from '../utils/AppError.js';

const otpService = {
  /**
   * Generate and store an OTP for a phone number
   * In development mode, the OTP is returned in the response
   */
  async sendOTP(phoneNumber, purpose = 'VERIFY_PHONE') {
    // Invalidate any previous unused OTPs for this phone + purpose
    await pool.query(
      `UPDATE tp.otp_codes SET is_used = TRUE
       WHERE phone_number = $1 AND purpose = $2 AND is_used = FALSE`,
      [phoneNumber, purpose]
    );

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO tp.otp_codes (phone_number, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [phoneNumber, otpCode, purpose, expiresAt]
    );

    if (env.NODE_ENV === 'development') {
      console.log(`[DEV OTP] ${phoneNumber} → ${otpCode} (${purpose})`);
    }

    return {
      message: 'OTP sent successfully.',
      expiresInMinutes: env.OTP_EXPIRY_MINUTES,
      // Exposing OTP in development
      ...(env.NODE_ENV === 'development' && { otp: otpCode }),
    };
  },

  /**
   * Verify an OTP code
   * Throws AppError if OTP is invalid or expired
   */
  async verifyOTP(phoneNumber, otpCode, purpose = 'VERIFY_PHONE', markUsed = true) {
    const result = await pool.query(
      `SELECT * FROM tp.otp_codes
       WHERE phone_number = $1 AND otp_code = $2 AND purpose = $3
         AND is_used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber, otpCode, purpose]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired OTP.', 400);
    }

    // Mark OTP as used
    if (markUsed) {
      await pool.query(
        `UPDATE tp.otp_codes SET is_used = TRUE WHERE otp_id = $1`,
        [result.rows[0].otp_id]
      );
    }

    return true;
  },
};

export default otpService;
