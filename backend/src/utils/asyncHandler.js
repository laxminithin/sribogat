export function asyncHandler(fn) {
  return function wrappedAsyncHandler(req, res, next) {
    // Return the promise so a handler that delegates to another wrapped handler
    // without passing `next` (e.g. `return listProducts(req, res)`) still routes
    // rejections to the outer wrapper's real `next`, instead of `.catch(undefined)`
    // dropping them into an unhandled rejection that crashes the process.
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}
