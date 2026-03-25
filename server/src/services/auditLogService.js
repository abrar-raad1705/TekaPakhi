import auditLogModel from '../models/auditLogModel.js';
import logger from '../config/logger.js';

const auditLogService = {
  logAudit({ eventType, actorId, actorType, summary, details, relatedTransactionId }) {
    auditLogModel
      .create({ eventType, actorId, actorType, summary, details, relatedTransactionId })
      .catch((err) => logger.error({ err, eventType, actorId }, 'Failed to write audit log'));
  },

  async query(filters) {
    return auditLogModel.findAll(filters);
  },
};

export default auditLogService;
