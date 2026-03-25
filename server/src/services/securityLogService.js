import securityLogModel from '../models/securityLogModel.js';
import logger from '../config/logger.js';

const securityLogService = {
  logEvent({ profileId, eventType, ip, userAgent, metadata }) {
    securityLogModel
      .create({ profileId, eventType, ipAddress: ip, userAgent, metadata })
      .catch((err) => logger.error({ err, eventType, profileId }, 'Failed to write security log'));
  },

  async query(filters) {
    return securityLogModel.findAll(filters);
  },
};

export default securityLogService;
