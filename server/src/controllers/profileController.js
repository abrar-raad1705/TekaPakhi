<<<<<<< Updated upstream
const pool = require('../config/db');
const profileModel = require('../models/profileModel');
const AppError = require('../utils/AppError');
=======
import profileService from '../services/profileService.js';
import AppError from '../utils/AppError.js';
>>>>>>> Stashed changes

const profileController = {
  /**
   * GET /api/v1/profile/lookup/:phoneNumber
   */
  async lookup(req, res, next) {
    try {
<<<<<<< Updated upstream
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
        },
      });
=======
      const data = await profileService.lookup(req.params.phoneNumber);
      res.status(200).json({ success: true, data });
>>>>>>> Stashed changes
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/profile/me
   */
  async getProfile(req, res, next) {
    try {
      const data = await profileService.getProfile(req.user.profileId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/profile/me
   */
  async updateProfile(req, res, next) {
    try {
      const updated = await profileService.updateProfile(req.user.profileId, req.validatedBody);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: updated,
      });
    } catch (error) {
      if (error.code === '23505') {
        if (error.constraint?.includes('email')) {
          return next(new AppError('This email is already in use.', 409));
        }
      }
      next(error);
    }
  },

  /**
   * GET /api/v1/profile/billers
   */
  async listBillers(req, res, next) {
    try {
<<<<<<< Updated upstream
      const result = await pool.query(
        `SELECT p.profile_id, p.full_name, p.phone_number,
                b.biller_code, b.service_name, b.category, b.status
         FROM tp.biller_profiles b
         JOIN tp.profiles p ON b.profile_id = p.profile_id
         WHERE b.status = 'ACTIVE'
         ORDER BY b.category, b.service_name`
      );
      res.json({ success: true, data: result.rows });
=======
      const data = await profileService.listBillers();
      res.json({ success: true, data });
>>>>>>> Stashed changes
    } catch (error) {
      next(error);
    }
  },
<<<<<<< Updated upstream
};

module.exports = profileController;
=======

  /**
   * POST /api/v1/profile/me/avatar
   */
  async uploadProfilePicture(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No image file provided.', 400);
      }

      const imageUrl = `/uploads/avatars/${req.file.filename}`;
      const { profile, oldAvatarUrl } = await profileService.updateAvatar(req.user.profileId, imageUrl);

      // Clean up old file if it was changed
      if (oldAvatarUrl) {
        const { default: path } = await import('path');
        const { default: fs } = await import('fs');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const oldPath = path.join(__dirname, '../../', oldAvatarUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully.',
        data: { profilePictureUrl: profile.profile_picture_url },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default profileController;

>>>>>>> Stashed changes
