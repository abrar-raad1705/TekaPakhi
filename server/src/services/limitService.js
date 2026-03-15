import limitModel from '../models/limitModel.js';
import transactionModel from '../models/transactionModel.js';
import AppError from '../utils/AppError.js';

const limitService = {
  /**
   * Check all transaction limits for a sender
   * Throws AppError if any limit is exceeded
   *
   * @param {Object} client - DB client (within transaction)
   * @param {number} profileTypeId - Sender's profile type ID
   * @param {number} txTypeId - Transaction type ID
   * @param {number} senderProfileId - Sender's profile ID
   * @param {number} amount - Transaction amount
   */
  async check(client, profileTypeId, txTypeId, senderProfileId, amount) {
    const limits = await limitModel.findByTypes(profileTypeId, txTypeId);

    // If no limits are configured, allow the transaction
    if (!limits) return;

    // 1. Per-transaction minimum
    if (limits.min_per_transaction && amount < parseFloat(limits.min_per_transaction)) {
      throw new AppError(
        `Minimum transaction amount is ৳${parseFloat(limits.min_per_transaction).toFixed(2)}.`,
        400
      );
    }

    // 2. Per-transaction maximum
    if (limits.max_per_transaction && amount > parseFloat(limits.max_per_transaction)) {
      throw new AppError(
        `Maximum transaction amount is ৳${parseFloat(limits.max_per_transaction).toFixed(2)}.`,
        400
      );
    }

    // 3. Daily limits
    const daily = await transactionModel.countToday(client, senderProfileId, txTypeId);

    if (limits.max_count_daily && daily.count >= limits.max_count_daily) {
      throw new AppError(
        `Daily transaction limit reached (${limits.max_count_daily} transactions).`,
        400
      );
    }

    if (limits.daily_limit && (parseFloat(daily.total_amount) + amount) > parseFloat(limits.daily_limit)) {
      throw new AppError(
        `Daily amount limit exceeded. Remaining: ৳${(parseFloat(limits.daily_limit) - parseFloat(daily.total_amount)).toFixed(2)}.`,
        400
      );
    }

    // 4. Monthly limits
    const monthly = await transactionModel.countThisMonth(client, senderProfileId, txTypeId);

    if (limits.max_count_monthly && monthly.count >= limits.max_count_monthly) {
      throw new AppError(
        `Monthly transaction limit reached (${limits.max_count_monthly} transactions).`,
        400
      );
    }

    if (limits.monthly_limit && (parseFloat(monthly.total_amount) + amount) > parseFloat(limits.monthly_limit)) {
      throw new AppError(
        `Monthly amount limit exceeded. Remaining: ৳${(parseFloat(limits.monthly_limit) - parseFloat(monthly.total_amount)).toFixed(2)}.`,
        400
      );
    }
  },
};

export default limitService;
