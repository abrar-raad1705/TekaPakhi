import crypto from 'crypto';

export { generateTxRef, TX_REF_LENGTH, allocateUniqueTxRef, isTransactionRefUniqueViolation } from './txRef.js';

// Generate a 6-digit OTP code
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
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
