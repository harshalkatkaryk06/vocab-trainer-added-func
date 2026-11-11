/**
 * Wraps an async Express route handler so rejected promises are forwarded
 * to the global error handler via `next(err)`, avoiding try/catch boilerplate.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
