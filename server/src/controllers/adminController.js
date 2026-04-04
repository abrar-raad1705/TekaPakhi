import adminService from '../services/adminService.js';
import auditLogService from '../services/auditLogService.js';

function adminCtx(req) {
  return { adminId: 'ADMIN' };
}

const adminController = {
  // Dashboard 
  async dashboard(req, res, next) {
    try {
      const data = await adminService.getDashboard();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // User Management
  async listUsers(req, res, next) {
    try {
      const data = await adminService.listUsers(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getUserDetail(req, res, next) {
    try {
      const data = await adminService.getUserDetail(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createProfile(req, res, next) {
    try {
      const data = await adminService.createProfile(req.validatedBody, adminCtx(req));
      res.status(201).json({ success: true, data, message: `${data.accountType} profile created.` });
    } catch (error) {
      next(error);
    }
  },

  async loadWallet(req, res, next) {
    try {
      const data = await adminService.loadWallet(
        req.params.id,
        req.validatedBody.amount,
        adminCtx(req),
      );
      res.json({ success: true, data, message: `৳${data.amount} loaded successfully.` });
    } catch (error) {
      next(error);
    }
  },

  async updateUserStatus(req, res, next) {
    try {
      const { status, suspendedUntil } = req.validatedBody;
      const data = await adminService.updateUserStatus(req.params.id, status, adminCtx(req), { suspendedUntil });
      res.json({ success: true, data, message: `User status updated to ${data.newStatus}.` });
    } catch (error) {
      next(error);
    }
  },

  async updateWalletLimit(req, res, next) {
    try {
      const data = await adminService.updateWalletLimit(
        req.params.id,
        req.validatedBody.maxBalance,
        adminCtx(req),
      );
      res.json({ success: true, data, message: "Wallet limit updated." });
    } catch (error) {
      next(error);
    }
  },

  async setPinResetGrant(req, res, next) {
    try {
      const data = await adminService.setPinResetGrant(
        req.params.id,
        req.validatedBody.granted,
        adminCtx(req),
      );
      res.json({
        success: true,
        data,
        message: data.pinResetGranted
          ? "One-time Forgot PIN is allowed for this user."
          : "Forgot PIN offer revoked.",
      });
    } catch (error) {
      next(error);
    }
  },

  // Transaction Management

  async listTransactions(req, res, next) {
    try {
      const data = await adminService.listTransactions(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getTransactionDetail(req, res, next) {
    try {
      const data = await adminService.getTransactionDetail(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async reverseTransaction(req, res, next) {
    try {
      const data = await adminService.reverseTransaction(req.params.id, adminCtx(req));
      res.json({ success: true, data, message: 'Transaction reversed successfully.' });
    } catch (error) {
      next(error);
    }
  },

  // Config: Transaction Types

  async getTransactionTypes(req, res, next) {
    try {
      const data = await adminService.getTransactionTypes();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateTransactionType(req, res, next) {
    try {
      const data = await adminService.updateTransactionType(req.params.id, req.validatedBody, adminCtx(req));
      res.json({ success: true, data, message: 'Transaction type updated.' });
    } catch (error) {
      next(error);
    }
  },

  // Config: Transaction Limits

  async getTransactionLimits(req, res, next) {
    try {
      const data = await adminService.getTransactionLimits();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async upsertTransactionLimit(req, res, next) {
    try {
      const data = await adminService.upsertTransactionLimit(req.validatedBody, adminCtx(req));
      res.json({ success: true, data, message: 'Limit saved.' });
    } catch (error) {
      next(error);
    }
  },

  async deleteTransactionLimit(req, res, next) {
    try {
      const data = await adminService.deleteTransactionLimit(req.params.profileTypeId, req.params.txTypeId, adminCtx(req));
      res.json({ success: true, data, message: 'Limit removed.' });
    } catch (error) {
      next(error);
    }
  },

  // Config: Commission Policies

  async getCommissionPolicies(req, res, next) {
    try {
      const data = await adminService.getCommissionPolicies();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async upsertCommissionPolicy(req, res, next) {
    try {
      const data = await adminService.upsertCommissionPolicy(req.validatedBody, adminCtx(req));
      res.json({ success: true, data, message: 'Policy saved.' });
    } catch (error) {
      next(error);
    }
  },

  async deleteCommissionPolicy(req, res, next) {
    try {
      const data = await adminService.deleteCommissionPolicy(req.params.profileTypeId, req.params.txTypeId, adminCtx(req));
      res.json({ success: true, data, message: 'Policy removed.' });
    } catch (error) {
      next(error);
    }
  },

  async getProfileTypes(req, res, next) {
    try {
      const data = await adminService.getProfileTypes();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // Reports 
  async transactionReport(req, res, next) {
    try {
      const data = await adminService.getTransactionReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async userGrowthReport(req, res, next) {
    try {
      const data = await adminService.getUserGrowthReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async mfsOverviewReport(req, res, next) {
    try {
      const data = await adminService.getMfsOverviewReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // Logs

  async getAuditLogs(req, res, next) {
    try {
      const data = await auditLogService.query({
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 25,
        eventType: req.query.eventType || undefined,
        actorType: req.query.actorType || undefined,
        startDate: req.query.startDate || undefined,
        endDate: req.query.endDate || undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default adminController;
