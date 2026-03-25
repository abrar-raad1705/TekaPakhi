import adminActionLogModel from '../models/adminActionLogModel.js';
import logger from '../config/logger.js';

const adminActionLogService = {
  logAction({ adminId, action, targetProfileId, targetEntity, amount, reason, metadata, ip }) {
    adminActionLogModel
      .create({ adminId, action, targetProfileId, targetEntity, amount, reason, metadata, ipAddress: ip })
      .catch((err) => logger.error({ err, action, adminId }, 'Failed to write admin action log'));
  },

  async query(filters) {
    return adminActionLogModel.findAll(filters);
  },
};

export default adminActionLogService;
