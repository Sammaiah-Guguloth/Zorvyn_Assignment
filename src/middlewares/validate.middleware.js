import AppError from "../utils/appError.util.js";

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const message = error.errors.map((err) => err.message).join(", ");
    return next(new AppError(message, 400));
  }
};

export default validate;
