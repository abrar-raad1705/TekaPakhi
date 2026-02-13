const crypto = require('crypto');

/**
 * Generate a 6-digit OTP code
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate a unique transaction reference
 * Format: TP + timestamp(base36) + random(hex) → e.g. TP1M2K3A4B5C6D7E
 */
const generateTxRef = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `TP${timestamp}${random}`.toUpperCase();
};

/**
 * Hash a token using SHA-256 (for refresh token storage)
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Format balance as BDT currency
 */
const formatBDT = (amount) => {
  return `৳${parseFloat(amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
};

/**
 * Generate unique agent code: AGT-XXXXXX
 */
const generateAgentCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(0, chars.length)];
  return `AGT-${code}`;
};

/**
 * Generate unique merchant code: MRC-XXXXXX
 */
const generateMerchantCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(0, chars.length)];
  return `MRC-${code}`;
};

module.exports = {
  generateOTP,
  generateTxRef,
  hashToken,
  formatBDT,
  generateAgentCode,
  generateMerchantCode,
};
