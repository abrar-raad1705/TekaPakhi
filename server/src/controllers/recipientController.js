<<<<<<< Updated upstream
const recipientModel = require('../models/recipientModel');
const profileModel = require('../models/profileModel');
const AppError = require('../utils/AppError');
=======
import recipientService from '../services/recipientService.js';
>>>>>>> Stashed changes

const recipientController = {
  /**
   * GET /api/v1/recipients
   */
  async list(req, res, next) {
    try {
      const data = await recipientService.list(req.user.profileId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/recipients
   */
  async create(req, res, next) {
    try {
      const { phoneNumber, nickname } = req.validatedBody;
      const data = await recipientService.create(req.user.profileId, phoneNumber, nickname);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/recipients/:id
   */
  async delete(req, res, next) {
    try {
      await recipientService.delete(req.params.id, req.user.profileId);
      res.status(200).json({ success: true, message: 'Recipient removed.' });
    } catch (error) {
      next(error);
    }
  },
};

<<<<<<< Updated upstream
module.exports = recipientController;
=======
export default recipientController;

>>>>>>> Stashed changes
