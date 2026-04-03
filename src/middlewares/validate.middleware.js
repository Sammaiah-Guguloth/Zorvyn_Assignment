import AppError from "../utils/appError.util.js";

// Middleware for validation
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const errorList = error.errors || error.issues || [];

    if (errorList.length > 0) {
      const message = errorList.map((err) => err.message).join(", ");
      return next(new AppError(message, 400));
    }

    return next(new AppError(error.message || "Invalid input", 400));
  }
};

export default validate;
