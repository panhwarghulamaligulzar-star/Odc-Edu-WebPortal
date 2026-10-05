import UserAuth from "../modules/userAuthModal.js";
import { resolveRoleForUser, serializeRoleForClient } from "../utils/rbac.js";

const employeeOnly = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    const user = await UserAuth.findById(userId);
    if (!user || user.isActive === false) {
      return res.status(403).json({ status: "error", message: "Employee access denied" });
    }

    const resolvedRole = await resolveRoleForUser(user);
    const roleName = serializeRoleForClient(user, resolvedRole);
    if (String(roleName || "").toLowerCase() !== "employee") {
      return res.status(403).json({ status: "error", message: "Employee access required" });
    }

    req.currentUser = user;
    req.currentRole = resolvedRole;
    next();
  } catch (error) {
    res.status(500).json({ status: "error", message: "Authorization error", error: error.message });
  }
};

export default employeeOnly;
