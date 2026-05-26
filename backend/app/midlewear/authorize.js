import UserAuth from "../modules/userAuthModal.js";
import {
  buildPermissionsMap,
  getModulePermission,
  resolveRoleForUser,
} from "../utils/rbac.js";

const authorize = (moduleKey, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user?._id && !req.user?.id) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized",
        });
      }

      const userId = req.user._id || req.user.id;
      const user = await UserAuth.findById(userId).lean();

      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "User not found",
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          status: "error",
          message: "Your account is inactive",
        });
      }

      if (user.isSuperAdmin) {
        req.currentUser = user;
        req.permissions = getModulePermission(buildPermissionsMap(user), moduleKey);
        return next();
      }

      const resolvedRole = await resolveRoleForUser(user);
      const permissionsMap = buildPermissionsMap(user, resolvedRole);
      const modulePermission = getModulePermission(permissionsMap, moduleKey);

      if (!modulePermission[action]) {
        return res.status(403).json({
          status: "error",
          message: `Access denied: You do not have '${action}' permission for '${moduleKey}'`,
        });
      }

      req.currentUser = user;
      req.currentRole = resolvedRole;
      req.permissions = modulePermission;
      next();
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Authorization error",
        error: error.message,
      });
    }
  };
};

export default authorize;
