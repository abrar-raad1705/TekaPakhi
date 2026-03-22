import pool from '../config/db.js';
import recipientModel from '../models/recipientModel.js';
import profileModel from '../models/profileModel.js';
import AppError from '../utils/AppError.js';

const recipientService = {
  /**
   * List saved recipients
   */
  async list(profileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const recipients = await recipientModel.findBySaver(profileId, client);
      await client.query('COMMIT');
      return recipients;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Create or update saved recipient
   */
  async create(saverProfileId, phoneNumber, nickname) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const target = await profileModel.findByPhone(phoneNumber, client);
      if (!target) {
        throw new AppError('No account found with this phone number.', 404);
      }

      if (target.profile_id.toString() === saverProfileId.toString()) {
        throw new AppError('You cannot save yourself as a recipient.', 400);
      }

      const recipient = await recipientModel.create(saverProfileId, target.profile_id, nickname, client);

      await client.query('COMMIT');
      return recipient;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Delete saved recipient
   */
  async delete(recipientId, saverProfileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const deleted = await recipientModel.delete(recipientId, saverProfileId, client);
      if (!deleted) {
        throw new AppError('Recipient not found.', 404);
      }
      await client.query('COMMIT');
      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

export default recipientService;
