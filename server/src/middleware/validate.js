import AppError from '../utils/AppError.js';

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return next(new AppError(errors[0].message, 400));
  }

  req.validatedBody = result.data;
  next();
};

export default validate;
