import pool from '../config/db.js';
import profileModel from '../models/profileModel.js';
import AppError from '../utils/AppError.js';

const profileController = {
  /**
   * GET /api/v1/profile/lookup/:phoneNumber
   * Public lookup — returns name + type for transaction confirmation
   */
  async lookup(req, res, next) {
    try {
      const profile = await profileModel.findByPhone(req.params.phoneNumber);
      if (!profile) {
        throw new AppError('No account found with this phone number.', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          fullName: profile.full_name,
          phoneNumber: profile.phone_number,
          typeName: profile.type_name,
          profilePictureUrl: profile.profile_picture_url ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/profile/me
   */
  async getProfile(req, res, next) {
    try {
      const profile = await profileModel.findByIdWithSubtype(req.user.profileId);

      if (!profile) {
        throw new AppError('Profile not found.', 404);
      }

      // Remove sensitive fields
      const { security_pin_hash, failed_pin_attempts, locked_until, ...safeProfile } = profile;

      res.status(200).json({
        success: true,
        data: safeProfile,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/profile/me
   */
  async updateProfile(req, res, next) {
    try {
      const updated = await profileModel.update(req.user.profileId, req.validatedBody);

      if (!updated) {
        throw new AppError('No fields to update.', 400);
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: updated,
      });
    } catch (error) {
      // Handle unique constraint violations (e.g., duplicate email)
      if (error.code === '23505') {
        if (error.constraint?.includes('email')) {
          return next(new AppError('This email is already in use.', 409));
        }
        return next(new AppError('Duplicate value detected.', 409));
      }
      next(error);
    }
  },
  /**
   * GET /api/v1/profile/billers
   * List all active biller profiles (for Pay Bill feature)
   */
  async listBillers(req, res, next) {
    try {
      const result = await pool.query(
        `SELECT p.profile_id, p.full_name, p.phone_number, p.profile_picture_url,
                b.biller_code, b.service_name, b.category, b.status
         FROM tp.biller_profiles b
         JOIN tp.profiles p ON b.profile_id = p.profile_id
         WHERE b.status = 'ACTIVE'
         ORDER BY b.category, b.service_name`
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/profile/me/avatar
   * Upload and update profile picture
   */
  async uploadProfilePicture(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No image file provided.', 400);
      }

      // Build the public URL path
      const imageUrl = `/uploads/avatars/${req.file.filename}`;

      // Delete old avatar file if exists
      const currentProfile = await profileModel.findById(req.user.profileId);
      if (currentProfile?.profile_picture_url) {
        const { default: path } = await import('path');
        const { default: fs } = await import('fs');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const oldPath = path.join(__dirname, '../../', currentProfile.profile_picture_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Save new URL to database
      const updated = await profileModel.updateProfilePicture(req.user.profileId, imageUrl);

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully.',
        data: { profilePictureUrl: updated.profile_picture_url },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default profileController;
