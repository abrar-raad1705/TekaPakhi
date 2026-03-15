import crypto from 'crypto';

// Generate a 6-digit OTP code
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate a unique transaction reference
// Format: TP + timestamp(base36) + random(hex)
export const generateTxRef = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `TP${timestamp}${random}`.toUpperCase();
};

// Hash a token using SHA-256 (for refresh token storage)
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};


// Format balance as BDT currency
export const formatBDT = (amount) => {
  return `৳${parseFloat(amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
};


// Generate unique agent code: AGT-XXXXXX
export const generateAgentCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(0, chars.length)];
  return `AGT-${code}`;
};


// Generate unique merchant code: MRC-XXXXXX
export const generateMerchantCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(0, chars.length)];
  return `MRC-${code}`;
};
