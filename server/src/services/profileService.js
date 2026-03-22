import pool from '../config/db.js';
import profileModel from '../models/profileModel.js';
import AppError from '../utils/AppError.js';

const profileService = {
  /**
   * Public lookup
   */
  async lookup(phoneNumber) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const profile = await profileModel.findByPhone(phoneNumber, client);
      if (!profile) {
        throw new AppError('No account found with this phone number.', 404);
      }
      await client.query('COMMIT');
      return {
        fullName: profile.full_name,
        phoneNumber: profile.phone_number,
        typeName: profile.type_name,
        profilePictureUrl: profile.profile_picture_url ?? null,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get own profile
   */
  async getProfile(profileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const profile = await profileModel.findByIdWithSubtype(profileId, client);
      if (!profile) {
        throw new AppError('Profile not found.', 404);
      }
      await client.query('COMMIT');

      // Remove sensitive fields
      const { security_pin_hash, failed_pin_attempts, locked_until, ...safeProfile } = profile;
      return safeProfile;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Update profile
   */
  async updateProfile(profileId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await profileModel.update(profileId, data, client);
      if (!updated) {
        throw new AppError('No fields to update.', 400);
      }
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * List active billers
   */
  async listBillers() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT p.profile_id, p.full_name, p.phone_number, p.profile_picture_url,
                b.biller_code, b.service_name, b.category, b.status
         FROM tp.biller_profiles b
         JOIN tp.profiles p ON b.profile_id = p.profile_id
         WHERE b.status = 'ACTIVE'
         ORDER BY b.category, b.service_name`
      );
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Update avatar
   */
  async updateAvatar(profileId, imageUrl) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentProfile = await profileModel.findById(profileId, client);
      if (!currentProfile) throw new AppError('Profile not found.', 404);

      const updated = await profileModel.updateProfilePicture(profileId, imageUrl, client);

      await client.query('COMMIT');
      return {
        profile: updated,
        oldAvatarUrl: currentProfile.profile_picture_url
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

export default profileService;
