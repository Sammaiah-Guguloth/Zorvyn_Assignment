// catchAsync utility function to handle async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    //Execute the async function and catch any errors/rejections
    // by passing them to the next() middleware (the global error handler).
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
