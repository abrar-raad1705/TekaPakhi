const pool = require('../config/db');
const env = require('../config/env');
const { generateOTP } = require('../utils/helpers');
const AppError = require('../utils/AppError');

const otpService = {
  /**
   * Generate and store an OTP for a phone number
   */
<<<<<<< Updated upstream
  async sendOTP(phoneNumber, purpose = 'VERIFY_PHONE', client = null) {
    // Invalidate any previous unused OTPs for this phone + purpose
    await (client || pool).query(
=======
  async sendOTP(phoneNumber, purpose = 'VERIFY_PHONE', client = pool) {
    // Invalidate any previous unused OTPs for this phone + purpose
    await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.otp_codes SET is_used = TRUE
       WHERE phone_number = $1 AND purpose = $2 AND is_used = FALSE`,
      [phoneNumber, purpose]
    );

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

<<<<<<< Updated upstream
    await (client || pool).query(
=======
    await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.otp_codes (phone_number, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [phoneNumber, otpCode, purpose, expiresAt]
    );

    // TODO: Integrate with SMS gateway (e.g., BulkSMSBD, SSL Wireless)
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV OTP] ${phoneNumber} → ${otpCode} (${purpose})`);
    }

    return {
      message: 'OTP sent successfully.',
      expiresInMinutes: env.OTP_EXPIRY_MINUTES,
<<<<<<< Updated upstream
      // Only expose OTP in development
=======
>>>>>>> Stashed changes
      ...(env.NODE_ENV === 'development' && { otp: otpCode }),
    };
  },

  /**
   * Verify an OTP code
   */
<<<<<<< Updated upstream
  async verifyOTP(phoneNumber, otpCode, purpose = 'VERIFY_PHONE', client = null) {
    const result = await (client || pool).query(
=======
  async verifyOTP(phoneNumber, otpCode, purpose = 'VERIFY_PHONE', client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    await (client || pool).query(
=======
    await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.otp_codes SET is_used = TRUE WHERE otp_id = $1`,
      [result.rows[0].otp_id]
    );

    return true;
  },
};

<<<<<<< Updated upstream
module.exports = otpService;
=======

export default otpService;
>>>>>>> Stashed changes
