import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import validate from '../middleware/validate.js';
import { adminLoginSchema } from '../validations/adminAuthValidation.js';
import securityLogService from '../services/securityLogService.js';

const router = Router();

router.post('/login', validate(adminLoginSchema), async (req, res, next) => {
  try {
    const { password } = req.validatedBody;
    const ok = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    if (!ok) {
      securityLogService.logEvent({ profileId: null, eventType: 'ADMIN_LOGIN_FAILURE', ...req.meta });
      throw new AppError('Invalid password.', 401);
    }

    const adminToken = jwt.sign(
      { role: 'ADMIN' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ADMIN_EXPIRY }
    );

    securityLogService.logEvent({ profileId: null, eventType: 'ADMIN_LOGIN_SUCCESS', ...req.meta });
    res.status(200).json({ success: true, data: { adminToken } });
  } catch (error) {
    next(error);
  }
});

export default router;
