/**
 * Fee calculation engine
 * Calculates transaction fees based on transaction type configuration
 */
const feeService = {
  /**
   * Standard fee calculation (percentage + flat, with min/max clamp)
   * Used for: CASH_OUT, PAYMENT, PAY_BILL, etc.
   *
   * @param {Object} txType - Transaction type row from DB
   * @param {number} amount - Transaction amount
   * @returns {number} Calculated fee
   */
  calculate(txType, amount) {
    const percentage = parseFloat(txType.fee_percentage) || 0;
    const flat = parseFloat(txType.fee_flat_amount) || 0;
    const minFee = txType.fee_min_amount ? parseFloat(txType.fee_min_amount) : null;
    const maxFee = txType.fee_max_amount ? parseFloat(txType.fee_max_amount) : null;

    let fee = (amount * percentage / 100) + flat;

    // Clamp between min and max
    if (minFee !== null && fee < minFee) fee = minFee;
    if (maxFee !== null && fee > maxFee) fee = maxFee;

    // Round to 2 decimal places
    return Math.round(fee * 100) / 100;
  },

  /**
   * Tiered fee calculation for SEND_MONEY
   *
   * Fee tiers are based on the sender's cumulative monthly Send Money total:
   *   - Monthly total ≤ ৳50         → Free (৳0)
   *   - Monthly total ৳50.01–৳25,000 → ৳5 per transaction
   *   - Monthly total > ৳25,000      → ৳10 per transaction
   *
   * "If a transaction exceeds a limit, charges will be applicable as per next limit."
   * → The fee is determined by where (monthlyTotalSoFar + amount) lands.
   *
   * @param {number} amount - This transaction's amount
   * @param {number} monthlyTotalSoFar - Sum of completed SEND_MONEY amounts this month
   * @returns {number} Fee for this transaction
   */
  calculateSendMoneyFee(amount, monthlyTotalSoFar) {
    const newCumulativeTotal = parseFloat(monthlyTotalSoFar) + amount;

    // Tier 1: cumulative total still within ৳50 → Free
    if (newCumulativeTotal <= 50) return 0;

    // Tier 2: cumulative total within ৳50.01 – ৳25,000 → ৳5
    if (newCumulativeTotal <= 25000) return 5;

    // Tier 3: cumulative total exceeds ৳25,000 → ৳10
    return 10;
  },

  /**
   * Determine debit/credit amounts based on fee bearer
   * @returns {{ senderDebit, receiverCredit }}
   */
  applyFeeBearer(amount, fee, feeBearer) {
    if (feeBearer === 'SENDER') {
      return {
        senderDebit: amount + fee,
        receiverCredit: amount,
      };
    } else {
      // RECEIVER bears the fee
      return {
        senderDebit: amount,
        receiverCredit: amount - fee,
      };
    }
  },
};

module.exports = feeService;
