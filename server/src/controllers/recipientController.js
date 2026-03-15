import recipientModel from '../models/recipientModel.js';
import profileModel from '../models/profileModel.js';
import AppError from '../utils/AppError.js';

const recipientController = {
  /**
   * GET /api/v1/recipients
   */
  async list(req, res, next) {
    try {
      const recipients = await recipientModel.findBySaver(req.user.profileId);
      res.status(200).json({ success: true, data: recipients });
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

      const target = await profileModel.findByPhone(phoneNumber);
      if (!target) {
        throw new AppError('No account found with this phone number.', 404);
      }

      if (target.profile_id.toString() === req.user.profileId.toString()) {
        throw new AppError('You cannot save yourself as a recipient.', 400);
      }

      const recipient = await recipientModel.create(req.user.profileId, target.profile_id, nickname);
      res.status(201).json({ success: true, data: recipient });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/recipients/:id
   */
  async delete(req, res, next) {
    try {
      const deleted = await recipientModel.delete(req.params.id, req.user.profileId);
      if (!deleted) {
        throw new AppError('Recipient not found.', 404);
      }
      res.status(200).json({ success: true, message: 'Recipient removed.' });
    } catch (error) {
      next(error);
    }
  },
};

export default recipientController;
