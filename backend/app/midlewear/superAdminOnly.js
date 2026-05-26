const superAdminOnly = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({
      status: "error",
      message: "Super Admin access required",
    });
  }

  next();
};

export default superAdminOnly;
