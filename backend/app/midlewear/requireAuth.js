const requireAuth = (req, res, next) => {
  if (!req.user?._id && !req.user?.id) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  req.user._id = req.user._id || req.user.id;
  next();
};

export default requireAuth;
