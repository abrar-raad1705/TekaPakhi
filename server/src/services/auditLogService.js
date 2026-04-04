import auditLogModel from '../models/auditLogModel.js';

const auditLogService = {
  logAudit({ eventType, actorId, actorType, summary, details, relatedTransactionId }) {
    auditLogModel
      .create({ eventType, actorId, actorType, summary, details, relatedTransactionId })
      .catch((err) => console.error(`[AUDIT] Failed to write audit log (${eventType}, actor: ${actorId}):`, err.message));
  },

  async query(filters) {
    return auditLogModel.findAll(filters);
  },
};

export default auditLogService;
