import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../config/db.js";
import AppError from "../utils/AppError.js";
import { allocateUniqueTxRef } from "../utils/txRef.js";
import { PROFILE_TYPES, WALLET_ROLES } from "../utils/constants.js";
import adminModel from "../models/adminModel.js";
import profileModel from "../models/profileModel.js";
import walletModel from "../models/walletModel.js";
import ledgerModel from "../models/ledgerModel.js";
import ledgerService from "./ledgerService.js";
import locationModel from "../models/locationModel.js";

const SALT_ROUNDS = 12;

function generateTempPin() {
  return String(crypto.randomInt(10000, 100000));
}

const adminService = {
  // ── Dashboard ────────────────────────────────────────────────

  async getDashboard() {
    const [
      userCounts,
      txStats,
      todayStats,
      monthStats,
      monthlyTrend,
      recentUsers,
      platformFinancials,
    ] = await Promise.all([
      adminModel.getUserCountsByType(),
      adminModel.getTransactionStats(),
      adminModel.getTodayStats(),
      adminModel.getThisMonthStats(),
      adminModel.getMonthlyTrend(6),
      adminModel.getRecentRegistrations(5),
      adminModel.getPlatformFinancials(),
    ]);

    const totalUsers = userCounts.reduce((sum, r) => sum + r.count, 0);

    return {
      users: {
        total: totalUsers,
        byType: userCounts,
      },
      platform: platformFinancials,
      transactions: {
        allTime: {
          count: txStats.total_count,
          volume: parseFloat(txStats.total_volume),
          revenue: parseFloat(txStats.total_revenue),
        },
        today: {
          count: todayStats.count,
          volume: parseFloat(todayStats.volume),
          revenue: parseFloat(todayStats.revenue),
        },
        thisMonth: {
          count: monthStats.count,
          volume: parseFloat(monthStats.volume),
          revenue: parseFloat(monthStats.revenue),
        },
        monthlyTrend: monthlyTrend.map((r) => ({
          month: r.month,
          count: r.count,
          volume: parseFloat(r.volume),
          revenue: parseFloat(r.revenue),
        })),
      },
      recentRegistrations: recentUsers,
    };
  },

  // ── User Management ──────────────────────────────────────────

  async listUsers(filters) {
    return adminModel.getUsers(filters);
  },

  async getUserDetail(profileId) {
    const detail = await adminModel.getUserDetail(profileId);
    if (!detail) throw new AppError("User not found.", 404);
    return detail;
  },

  /**
   * Create a Distributor or Biller profile (admin-only).
   * Distributor: random temporary PIN (returned once), areas from locations, contact person → full_name.
   */
  async createProfile(body) {
    const {
      phoneNumber,
      fullName,
      securityPin,
      accountType,
      businessName,
      contactPersonName,
      email,
      additionalInfo,
      areas,
      ...subtypeFields
    } = body;

    const existing = await profileModel.findByPhone(phoneNumber);
    if (existing)
      throw new AppError(
        "An account with this phone number already exists.",
        409,
      );

    const typeId = PROFILE_TYPES[accountType];
    if (!typeId) throw new AppError("Invalid account type.", 400);

    if (accountType === "DISTRIBUTOR") {
      if (!businessName?.trim() || !contactPersonName?.trim()) {
        throw new AppError(
          "Business name and contact person are required.",
          400,
        );
      }
      if (!areas?.length) {
        throw new AppError("Select at least one area.", 400);
      }

      for (const pair of areas) {
        const ok = await locationModel.isValidPair(pair.district, pair.area);
        if (!ok) {
          throw new AppError(
            `Invalid location: ${pair.district} / ${pair.area}`,
            400,
          );
        }
        const taken = await locationModel.isAreaTaken(pair.district, pair.area);
        if (taken) {
          throw new AppError(
            `Area "${pair.area}" in ${pair.district} is already assigned to another distributor.`,
            409,
          );
        }
      }

      const tempPin = generateTempPin();
      const pinHash = await bcrypt.hash(tempPin, SALT_ROUNDS);
      const emailNorm = email?.trim() || null;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const profile = await profileModel.create(
          {
            phoneNumber,
            fullName: contactPersonName.trim(),
            pinHash,
            typeId,
            email: emailNorm,
          },
          client,
        );

        await profileModel.createDistributorSubtype(
          profile.profile_id,
          {
            businessName: businessName.trim(),
            additionalInfo: additionalInfo?.trim() || null,
            areas,
          },
          client,
        );

        await client.query("COMMIT");

        return {
          profileId: profile.profile_id,
          phoneNumber: profile.phone_number,
          fullName: profile.full_name,
          accountType,
          accountStatus: "ACTIVE",
          temporaryPin: tempPin,
        };
      } catch (e) {
        await client.query("ROLLBACK");
        if (e.code === "23505") {
          throw new AppError(
            "One of the selected areas is already assigned to another distributor.",
            409,
          );
        }
        throw e;
      } finally {
        client.release();
      }
    }

    const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);
    const profile = await profileModel.create({
      phoneNumber,
      fullName,
      pinHash,
      typeId,
    });

    if (accountType === "BILLER") {
      await profileModel.createBillerSubtype(profile.profile_id, subtypeFields);
    }

    return {
      profileId: profile.profile_id,
      phoneNumber: profile.phone_number,
      fullName: profile.full_name,
      accountType,
      accountStatus: "ACTIVE",
    };
  },

  /**
   * Load e-cash to a profile's wallet: Treasury debited, target credited (double-entry).
   */
  async loadWallet(targetProfileId, amount) {
    if (amount <= 0) throw new AppError("Amount must be positive.", 400);

    const target = await profileModel.findById(targetProfileId);
    if (!target) throw new AppError("Target profile not found.", 404);

    const treasury = await walletModel.findByRole(WALLET_ROLES.TREASURY);
    if (!treasury) throw new AppError("Treasury wallet not found.", 500);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const twRes = await client.query(
        `SELECT wallet_id FROM tp.wallets WHERE profile_id = $1`,
        [targetProfileId],
      );
      const targetWid = twRes.rows[0]?.wallet_id;
      if (!targetWid) throw new AppError("Target wallet not found.", 404);

      const lockIds = [treasury.wallet_id, targetWid].sort((a, b) => a - b);
      const locked = new Map();
      for (const wid of lockIds) {
        const row = await walletModel.findByWalletIdForUpdate(client, wid);
        locked.set(wid, row);
      }
      const treasuryWallet = locked.get(treasury.wallet_id);
      const targetWallet = locked.get(targetWid);
      if (!treasuryWallet || !targetWallet)
        throw new AppError("Wallet lock failed.", 500);

      await walletModel.credit(client, treasuryWallet.wallet_id, amount);
      await walletModel.credit(client, targetWallet.wallet_id, amount);

      let txRef;
      let transactionId;
      try {
        const { txRef: ref, result } = await allocateUniqueTxRef((ref) =>
          client.query(
            `INSERT INTO tp.transactions
               (transaction_ref, amount, fee_amount, status, sender_wallet_id, receiver_wallet_id,
                type_id, user_note)
             VALUES ($1, $2, 0, 'COMPLETED', $3, $4,
               (SELECT type_id FROM tp.transaction_types WHERE type_name = 'CASH_IN'),
               $5)
             RETURNING transaction_id`,
            [
              ref,
              amount,
              treasuryWallet.wallet_id,
              targetWallet.wallet_id,
              `ADMIN_LOAD: ৳${amount} loaded by admin`,
            ],
          ),
        );
        txRef = ref;
        transactionId = result.rows[0].transaction_id;
      } catch (e) {
        if (e.code === "TX_REF_EXHAUSTED") {
          throw new AppError(
            "Could not assign a transaction ID. Please try again.",
            503,
          );
        }
        throw e;
      }

      await ledgerService.recordLoadEcashLedger(
        client,
        transactionId,
        treasury.wallet_id,
        targetWallet.wallet_id,
        amount,
      );

      await client.query("COMMIT");

      return {
        transactionRef: txRef,
        targetProfileId,
        targetName: target.full_name,
        amount,
        newBalance: parseFloat(targetWallet.balance) + amount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async updateUserStatus(profileId, newStatus) {
    // First get the user's type
    const userResult = await pool.query(
      `SELECT p.profile_id, pt.type_name
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE p.profile_id = $1`,
      [profileId],
    );
    if (userResult.rows.length === 0)
      throw new AppError("User not found.", 404);

    const { type_name } = userResult.rows[0];
    if (type_name === "SYSTEM")
      throw new AppError("Cannot modify SYSTEM profile status.", 400);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const tableMap = {
        CUSTOMER: "customer_profiles",
        AGENT: "agent_profiles",
        MERCHANT: "merchant_profiles",
        DISTRIBUTOR: "distributor_profiles",
        BILLER: "biller_profiles",
      };
      const table = tableMap[type_name];
      if (!table) throw new AppError("Unsupported profile type.", 400);

      const hasApprovedDate = type_name !== "BILLER";
      const approvedClause =
        newStatus === "ACTIVE" && hasApprovedDate
          ? ", approved_date = CURRENT_TIMESTAMP"
          : "";
      const updateResult = await client.query(
        `UPDATE tp.${table}
         SET status = $1 ${approvedClause}
         WHERE profile_id = $2
         RETURNING *`,
        [newStatus, profileId],
      );
      const updated = updateResult.rows[0];
      if (!updated)
        throw new AppError(
          "Failed to update status. Subtype profile not found.",
          404,
        );

      if (type_name === "AGENT" && newStatus === "ACTIVE") {
        const agentLoc = await client.query(
          `SELECT district, area FROM tp.agent_profiles WHERE profile_id = $1`,
          [profileId],
        );
        const district = agentLoc.rows[0]?.district;
        const area = agentLoc.rows[0]?.area;

        if (!district || !area) {
          throw new AppError(
            "Agent location is missing. District and area are required before approval.",
            400,
          );
        }

        const distributor = await client.query(
          `SELECT da.profile_id
           FROM tp.distributor_areas da
           JOIN tp.distributor_profiles dp ON dp.profile_id = da.profile_id
           WHERE da.district = $1 AND da.area = $2 AND dp.status = 'ACTIVE'
           LIMIT 1`,
          [district, area],
        );

        if (!distributor.rows.length) {
          throw new AppError(
            `No active distributor found for ${district} / ${area}.`,
            400,
          );
        }

        await client.query(
          `UPDATE tp.agent_profiles SET distributor_id = $1 WHERE profile_id = $2`,
          [distributor.rows[0].profile_id, profileId],
        );
      }

      await client.query("COMMIT");
      return { profileId, typeName: type_name, newStatus: updated.status };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async listTransactions(filters) {
    return adminModel.getAllTransactions(filters);
  },

  // ── Transaction Reversal ─────────────────────────────────────

  /**
   * Reverse a completed transaction by inverting all ledger lines (and wallet balances).
   */
  async reverseTransaction(transactionId) {
    const original = await adminModel.getTransactionForReversal(transactionId);
    if (!original) throw new AppError("Transaction not found.", 404);
    if (original.status !== "COMPLETED") {
      throw new AppError(
        `Cannot reverse a transaction with status: ${original.status}`,
        400,
      );
    }

    const amount = parseFloat(original.amount);
    const fee = parseFloat(original.fee_amount);

    const entries = await ledgerModel.findByTransactionId(transactionId);
    if (entries.length === 0) {
      throw new AppError(
        "Cannot reverse: no ledger entries for this transaction (legacy data).",
        400,
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const walletIds = [...new Set(entries.map((e) => e.wallet_id))].sort(
        (a, b) => a - b,
      );
      for (const wid of walletIds) {
        await walletModel.findByWalletIdForUpdate(client, wid);
      }

      for (const e of entries) {
        const amt = parseFloat(e.amount);
        if (e.entry_type === "DEBIT") {
          await walletModel.credit(client, e.wallet_id, amt);
        } else {
          try {
            await walletModel.debit(client, e.wallet_id, amt);
          } catch {
            throw new AppError(
              `Cannot reverse: insufficient balance on wallet ${e.wallet_id} to undo credit of ৳${amt.toFixed(2)}.`,
              400,
            );
          }
        }
      }

      let txRef;
      let reversalTxId;
      try {
        const { txRef: ref, result } = await allocateUniqueTxRef((ref) =>
          client.query(
            `INSERT INTO tp.transactions
               (transaction_ref, amount, fee_amount, transaction_time, status,
                sender_wallet_id, receiver_wallet_id, type_id, original_transaction_id,
                user_note)
             VALUES ($1, $2, $3, NOW(), 'COMPLETED', $4, $5, $6, $7, $8)
             RETURNING transaction_id`,
            [
              ref,
              amount,
              fee,
              original.receiver_wallet_id,
              original.sender_wallet_id,
              original.type_id,
              original.transaction_id,
              "Reversed by TekaPakhi",
            ],
          ),
        );
        txRef = ref;
        reversalTxId = result.rows[0].transaction_id;
      } catch (e) {
        if (e.code === "TX_REF_EXHAUSTED") {
          throw new AppError(
            "Could not assign a transaction ID. Please try again.",
            503,
          );
        }
        throw e;
      }

      for (const e of entries) {
        const amt = parseFloat(e.amount);
        const inv = e.entry_type === "DEBIT" ? "CREDIT" : "DEBIT";
        await ledgerModel.createLedgerEntry(client, {
          transactionId: reversalTxId,
          walletId: e.wallet_id,
          entryType: inv,
          amount: amt,
          description: `Reversal Entry - Original Txn #${transactionId}`,
        });
      }

      await client.query(
        `UPDATE tp.transactions SET status = 'REVERSED' WHERE transaction_id = $1`,
        [transactionId],
      );

      await client.query("COMMIT");

      return {
        originalTransactionId: transactionId,
        reversalTransactionId: reversalTxId,
        reversalRef: txRef,
        ledgerLinesReversed: entries.length,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // ── Config Management ────────────────────────────────────────

  async getTransactionTypes() {
    return adminModel.getTransactionTypes();
  },

  async updateTransactionType(typeId, fields) {
    const allowed = [
      "fee_percentage",
      "fee_flat_amount",
      "fee_bearer",
      "fee_min_amount",
      "fee_max_amount",
    ];
    const filtered = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) filtered[key] = fields[key];
    }
    const result = await adminModel.updateTransactionType(typeId, filtered);
    if (!result)
      throw new AppError("Transaction type not found or no valid fields.", 404);
    return result;
  },

  async getTransactionLimits() {
    return adminModel.getTransactionLimits();
  },

  async upsertTransactionLimit(data) {
    return adminModel.upsertTransactionLimit(data);
  },

  async deleteTransactionLimit(profileTypeId, transactionTypeId) {
    const result = await adminModel.deleteTransactionLimit(
      profileTypeId,
      transactionTypeId,
    );
    if (!result) throw new AppError("Limit not found.", 404);
    return result;
  },

  async getCommissionPolicies() {
    return adminModel.getCommissionPolicies();
  },

  async upsertCommissionPolicy(data) {
    return adminModel.upsertCommissionPolicy(data);
  },

  async deleteCommissionPolicy(profileTypeId, transactionTypeId) {
    const result = await adminModel.deleteCommissionPolicy(
      profileTypeId,
      transactionTypeId,
    );
    if (!result) throw new AppError("Policy not found.", 404);
    return result;
  },

  async getProfileTypes() {
    return adminModel.getProfileTypes();
  },

  // ── Reports ──────────────────────────────────────────────────

  async getTransactionReport(filters) {
    return adminModel.getTransactionReport(filters);
  },

  async getUserGrowthReport(filters) {
    return adminModel.getUserGrowthReport(filters);
  },
};

export default adminService;
