import AppError from "../utils/appError.util.js";

// Middleware for validation
const validate = (schema) => (req, res, next) => {
  try {
    const parsedData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Reattach parsed data safely to avoid Express 5 'getter-only' property errors
    req.body = parsedData.body;

    // For query and params, we mutate the existing object rather than reassigning directly 
    // because newer Express versions define them as read-only getters behind the scenes.
    if (parsedData.query) {
      Object.keys(req.query).forEach(key => delete req.query[key]);
      Object.assign(req.query, parsedData.query);
    }
    
    if (parsedData.params) {
      Object.keys(req.params).forEach(key => delete req.params[key]);
      Object.assign(req.params, parsedData.params);
    }

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
