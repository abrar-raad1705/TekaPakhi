import crypto from 'crypto';

export const TX_REF_LENGTH = 10;
const MAX_ALLOCATION_ATTEMPTS = 16;

export function generateTxRef() {
  const chars = [];
  while (chars.length < TX_REF_LENGTH) {
    const chunk = crypto.randomBytes(24).toString('base64');
    for (let i = 0; i < chunk.length && chars.length < TX_REF_LENGTH; i++) {
      let c = chunk.charCodeAt(i);
      let ch = chunk[i];
      if (c >= 97 && c <= 122) {
        ch = String.fromCharCode(c - 32);
        c = ch.charCodeAt(0);
      }
      if ((c >= 65 && c <= 90) || (c >= 48 && c <= 57)) {
        chars.push(ch);
      }
    }
  }
  return chars.join('');
}

export function isTransactionRefUniqueViolation(err) {
  if (!err || err.code !== '23505') return false;
  const detail = String(err.detail || '');
  const constraint = String(err.constraint || '');
  return detail.includes('transaction_ref') || constraint.includes('transaction_ref');
}

export async function allocateUniqueTxRef(insert, { maxAttempts = MAX_ALLOCATION_ATTEMPTS } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const txRef = generateTxRef();
    try {
      const result = await insert(txRef);
      return { txRef, result };
    } catch (e) {
      if (isTransactionRefUniqueViolation(e)) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  const err = new Error(
    `Could not allocate a unique transaction ID after ${maxAttempts} attempts (collision on transaction_ref).`
  );
  err.code = 'TX_REF_EXHAUSTED';
  err.cause = lastErr;
  throw err;
}
