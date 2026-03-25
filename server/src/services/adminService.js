import bcrypt from "bcrypt";
import crypto from "crypto";
import pool, { DB_SCHEMA } from '../config/db.js';
import AppError from "../utils/AppError.js";
import { allocateUniqueTxRef } from "../utils/txRef.js";
import { PROFILE_TYPES, WALLET_ROLES, PIN_RESET_RESTRICTED_TYPE_NAMES } from "../utils/constants.js";
import adminModel from "../models/adminModel.js";
import profileModel from "../models/profileModel.js";
import walletModel from "../models/walletModel.js";
import ledgerModel from "../models/ledgerModel.js";
import ledgerService from "./ledgerService.js";
import locationModel from "../models/locationModel.js";
import adminActionLogService from "./adminActionLogService.js";
import auditLogService from "./auditLogService.js";

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

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

  async setPinResetGrant(profileId, granted, ctx) {
    const profile = await profileModel.findById(profileId);
    if (!profile) throw new AppError("User not found.", 404);
    if (!PIN_RESET_RESTRICTED_TYPE_NAMES.includes(profile.type_name)) {
      throw new AppError(
        "PIN reset grant applies only to agent, distributor, and biller accounts.",
        400,
      );
    }
    const row = await profileModel.setPinResetGranted(profileId, granted);
    if (!row) throw new AppError("User not found.", 404);

    const action = granted ? 'GRANT_PIN_RESET' : 'REVOKE_PIN_RESET';
    adminActionLogService.logAction({ adminId: ctx?.adminId, action, targetProfileId: profileId, ip: ctx?.ip });
    const verb = granted ? 'granted one-time PIN reset to' : 'revoked PIN reset grant for';
    auditLogService.logAudit({ eventType: action, actorId: null, actorType: 'ADMIN', summary: `Admin ${verb} ${profile.type_name} ${maskPhone(profile.phone_number)}` });

    return {
      profileId: Number(profileId),
      pinResetGranted: row.pin_reset_granted,
    };
  },

  /**
   * Create a Distributor or Biller profile (admin-only).
   * Distributor: random temporary PIN (returned once), areas from locations, contact person → full_name.
   */
  async createProfile(body, ctx) {
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

        adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'CREATE_PROFILE', targetProfileId: profile.profile_id, ip: ctx?.ip, metadata: { accountType } });
        auditLogService.logAudit({ eventType: 'CREATE_PROFILE', actorId: null, actorType: 'ADMIN', summary: `Admin created ${accountType} profile ${maskPhone(profile.phone_number)}` });

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

    if (accountType === "BILLER") {
      if (!subtypeFields.serviceName?.trim()) {
        throw new AppError(
          "Service name is required.",
          400,
        );
      }
      if (!contactPersonName?.trim()) {
        throw new AppError("Contact person name is required.", 400);
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

        await profileModel.createBillerSubtype(
          profile.profile_id,
          {
            serviceName: subtypeFields.serviceName.trim(),
            billerType: subtypeFields.billerType || "Others",
            senderChargeFlat: subtypeFields.senderChargeFlat || 0,
            senderChargePercent: subtypeFields.senderChargePercent || 0,
          },
          client,
        );

        await client.query("COMMIT");

        adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'CREATE_PROFILE', targetProfileId: profile.profile_id, ip: ctx?.ip, metadata: { accountType } });
        auditLogService.logAudit({ eventType: 'CREATE_PROFILE', actorId: null, actorType: 'ADMIN', summary: `Admin created ${accountType} profile ${maskPhone(profile.phone_number)}` });

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
        throw e;
      } finally {
        client.release();
      }
    }

    const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);

    const client = await pool.connect();
    let profile;
    try {
      await client.query("BEGIN");
      profile = await profileModel.create({
        phoneNumber,
        fullName,
        pinHash,
        typeId,
      }, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'CREATE_PROFILE', targetProfileId: profile.profile_id, ip: ctx?.ip, metadata: { accountType } });
    auditLogService.logAudit({ eventType: 'CREATE_PROFILE', actorId: null, actorType: 'ADMIN', summary: `Admin created ${accountType} profile ${maskPhone(profile.phone_number)}` });

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
  async loadWallet(targetProfileId, amount, ctx) {
    if (amount <= 0) throw new AppError("Amount must be positive.", 400);

    const target = await profileModel.findById(targetProfileId);
    if (!target) throw new AppError("Target profile not found.", 404);

    const treasury = await walletModel.findByRole(WALLET_ROLES.TREASURY);
    if (!treasury) throw new AppError("Treasury wallet not found.", 500);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const twRes = await client.query(
        `SELECT wallet_id FROM ${DB_SCHEMA}.wallets WHERE profile_id = $1`,
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

      const balances = new Map();
      const tresResult = await walletModel.credit(client, treasuryWallet.wallet_id, amount);
      balances.set(treasuryWallet.wallet_id, { before_balance: tresResult.before_balance, after_balance: tresResult.after_balance });
      const tgtResult = await walletModel.credit(client, targetWallet.wallet_id, amount);
      balances.set(targetWallet.wallet_id, { before_balance: tgtResult.before_balance, after_balance: tgtResult.after_balance });

      let txRef;
      let transactionId;
      try {
        const { txRef: ref, result } = await allocateUniqueTxRef((ref) =>
          client.query(
            `INSERT INTO ${DB_SCHEMA}.transactions
               (transaction_ref, amount, fee_amount, status, sender_wallet_id, receiver_wallet_id,
                type_id, user_note)
             VALUES ($1, $2, 0, 'COMPLETED', $3, $4,
               (SELECT type_id FROM ${DB_SCHEMA}.transaction_types WHERE type_name = 'CASH_IN'),
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
        balances,
      );

      await client.query("COMMIT");

      adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'LOAD_WALLET', targetProfileId, amount, ip: ctx?.ip, metadata: { transactionRef: txRef } });
      auditLogService.logAudit({ eventType: 'LOAD_WALLET', actorId: null, actorType: 'ADMIN', summary: `Admin loaded ৳${amount} to ${target.type_name ?? 'user'} ${maskPhone(target.phone_number)}`, relatedTransactionId: transactionId });

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

  async updateWalletLimit(profileId, maxBalance, ctx) {
    const num = parseFloat(maxBalance);
    if (!Number.isFinite(num) || num <= 0) {
      throw new AppError("Invalid wallet limit.", 400);
    }

    const wallet = await walletModel.findByProfileId(profileId);
    if (!wallet) throw new AppError("Wallet not found.", 404);
    if (wallet.role != null) {
      throw new AppError("Cannot change limit for this wallet.", 400);
    }

    const bal = parseFloat(wallet.balance);
    if (num < bal) {
      throw new AppError(
        "Wallet limit cannot be less than current balance.",
        400,
      );
    }

    const oldLimit = parseFloat(wallet.max_balance);

    const client = await pool.connect();
    let updated;
    try {
      await client.query("BEGIN");
      updated = await walletModel.updateMaxBalanceByProfileId(
        profileId,
        num,
        client,
      );
      if (!updated) throw new AppError("Could not update wallet limit.", 500);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'UPDATE_WALLET_LIMIT', targetProfileId: profileId, ip: ctx?.ip, metadata: { oldLimit, newLimit: num } });

    return {
      profileId,
      max_balance: parseFloat(updated.max_balance),
      balance: parseFloat(updated.balance),
    };
  },

  async updateUserStatus(profileId, newStatus, ctx) {
    // First get the user's type
    const userResult = await pool.query(
      `SELECT p.profile_id, pt.type_name
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
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
        `UPDATE ${DB_SCHEMA}.${table}
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
          `SELECT district, area FROM ${DB_SCHEMA}.agent_profiles WHERE profile_id = $1`,
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
           FROM ${DB_SCHEMA}.distributor_areas da
           JOIN ${DB_SCHEMA}.distributor_profiles dp ON dp.profile_id = da.profile_id
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
          `UPDATE ${DB_SCHEMA}.agent_profiles SET distributor_id = $1 WHERE profile_id = $2`,
          [distributor.rows[0].profile_id, profileId],
        );
      }

      await client.query("COMMIT");

      adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'UPDATE_USER_STATUS', targetProfileId: profileId, ip: ctx?.ip, metadata: { newStatus, typeName: type_name } });
      auditLogService.logAudit({ eventType: 'UPDATE_USER_STATUS', actorId: null, actorType: 'ADMIN', summary: `Admin set ${type_name} #${profileId} status to ${updated.status}` });

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
  async reverseTransaction(transactionId, ctx) {
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

      const reversalBalances = new Map();
      for (const e of entries) {
        const amt = parseFloat(e.amount);
        if (e.entry_type === "DEBIT") {
          const r = await walletModel.credit(client, e.wallet_id, amt);
          reversalBalances.set(`${e.wallet_id}_${e.id}`, { before_balance: r.before_balance, after_balance: r.after_balance });
        } else {
          try {
            const r = await walletModel.debit(client, e.wallet_id, amt);
            reversalBalances.set(`${e.wallet_id}_${e.id}`, { before_balance: r.before_balance, after_balance: r.after_balance });
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
            `INSERT INTO ${DB_SCHEMA}.transactions
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
        const bal = reversalBalances.get(`${e.wallet_id}_${e.id}`) || {};
        await ledgerModel.createLedgerEntry(client, {
          transactionId: reversalTxId,
          walletId: e.wallet_id,
          entryType: inv,
          amount: amt,
          description: `Reversal Entry - Original Txn #${transactionId}`,
          beforeBalance: bal.before_balance,
          afterBalance: bal.after_balance,
        });
      }

      await client.query(
        `UPDATE ${DB_SCHEMA}.transactions SET status = 'REVERSED' WHERE transaction_id = $1`,
        [transactionId],
      );

      await client.query("COMMIT");

      adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'REVERSE_TRANSACTION', ip: ctx?.ip, amount, metadata: { originalTransactionId: transactionId, reversalTransactionId: reversalTxId, reversalRef: txRef } });
      auditLogService.logAudit({ eventType: 'REVERSE_TRANSACTION', actorId: null, actorType: 'ADMIN', summary: `Admin reversed transaction #${transactionId} (৳${amount})`, relatedTransactionId: reversalTxId });

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

  async updateTransactionType(typeId, fields, ctx) {
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

    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'UPDATE_TRANSACTION_TYPE', targetEntity: 'transaction_type', ip: ctx?.ip, metadata: { typeId, changes: filtered } });

    return result;
  },

  async getTransactionLimits() {
    return adminModel.getTransactionLimits();
  },

  async upsertTransactionLimit(data, ctx) {
    const result = await adminModel.upsertTransactionLimit(data);
    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'UPSERT_LIMIT', targetEntity: 'transaction_limit', ip: ctx?.ip, metadata: data });
    return result;
  },

  async deleteTransactionLimit(profileTypeId, transactionTypeId, ctx) {
    const result = await adminModel.deleteTransactionLimit(
      profileTypeId,
      transactionTypeId,
    );
    if (!result) throw new AppError("Limit not found.", 404);
    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'DELETE_LIMIT', targetEntity: 'transaction_limit', ip: ctx?.ip, metadata: { profileTypeId, transactionTypeId } });
    return result;
  },

  async getCommissionPolicies() {
    return adminModel.getCommissionPolicies();
  },

  async upsertCommissionPolicy(data, ctx) {
    const result = await adminModel.upsertCommissionPolicy(data);
    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'UPSERT_COMMISSION', targetEntity: 'commission_policy', ip: ctx?.ip, metadata: data });
    return result;
  },

  async deleteCommissionPolicy(profileTypeId, transactionTypeId, ctx) {
    const result = await adminModel.deleteCommissionPolicy(
      profileTypeId,
      transactionTypeId,
    );
    if (!result) throw new AppError("Policy not found.", 404);
    adminActionLogService.logAction({ adminId: ctx?.adminId, action: 'DELETE_COMMISSION', targetEntity: 'commission_policy', ip: ctx?.ip, metadata: { profileTypeId, transactionTypeId } });
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

  async getMfsOverviewReport(filters) {
    return adminModel.getMfsOverviewReport(filters);
  },
};

export default adminService;
