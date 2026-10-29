const errorHandler = (err, req, res, next) => {
  // Keep a server-side trace for debugging, but never leak internals to clients
  // for unexpected failures.
  console.error(err.stack || err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Server Error";
  let errors;

  // Mongoose: malformed ObjectId / invalid cast -> client error, not 500.
  if (err.name === "CastError") {
    statusCode = 400;
    const path = err.path ? ` for "${err.path}"` : "";
    message = `Invalid value${path}. Please check your request.`;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err.errors || {}).map((e) => e.message);
    message = errors[0] || "Validation failed";
  } else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = field
      ? `A record with that ${field} already exists`
      : "Duplicate record";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Not authorized, token failed";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Not authorized, token expired";
  } else if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    statusCode = 400;
    message = "Invalid JSON body";
  }

  const body = {
    success: false,
    message: statusCode >= 500 ? "Server Error" : message,
  };
  if (errors && errors.length > 1) body.errors = errors;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
