import bcrypt from "bcrypt";
import Role from "../modules/roleModule.js";
import UserAuth from "../modules/userAuthModal.js";
import {
  buildPermissionsMap,
  isLegacyAdminUser,
  normalizePermissions,
  resolveRoleForUser,
  serializeRoleForClient,
} from "../utils/rbac.js";

const canManageAllUsers = async (authUser) => {
  if (!authUser?._id) return false;
  const currentUser = await UserAuth.findById(authUser._id).lean();
  if (!currentUser) return false;
  const resolvedRole = await resolveRoleForUser(currentUser);
  return currentUser.isSuperAdmin || isLegacyAdminUser(currentUser, resolvedRole);
};

const serializeUser = async (user) => {
  const resolvedRole = await resolveRoleForUser(user);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: serializeRoleForClient(user, resolvedRole),
    roleId: typeof user.role === "string" ? user.role : user.role?._id || user.role || null,
    profile: user.profile,
    details: user.details,
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions: buildPermissionsMap(user, resolvedRole),
  };
};

const getUserAccount = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?._id || req.user?.id;

    if (!userId || !currentUserId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized",
      });
    }

    const canViewAll = await canManageAllUsers({ _id: currentUserId });
    if (!canViewAll && String(userId) !== String(currentUserId)) {
      return res.status(403).json({
        status: 403,
        message: "You can only view your own account",
      });
    }

    const userData = await UserAuth.findById(userId);
    if (!userData) {
      return res.status(404).json({ status: 404, message: "User not found!" });
    }

    res.status(200).json({
      status: 200,
      message: "User account information",
      userData: await serializeUser(userData),
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateUserAccount = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?._id || req.user?.id;

    if (!userId || !currentUserId) {
      return res.status(404).json({ status: "error", message: "User ID missing" });
    }

    const canViewAll = await canManageAllUsers({ _id: currentUserId });
    if (!canViewAll && String(userId) !== String(currentUserId)) {
      return res.status(403).json({
        status: "error",
        message: "You can only update your own account",
      });
    }

    const user = await UserAuth.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found!" });
    }

    const updatedData = {
      name: req.body.name,
      email: req.body.email?.trim()?.toLowerCase(),
    };

    if (canViewAll && Object.prototype.hasOwnProperty.call(req.body, "roleId")) {
      if (req.body.roleId) {
        const role = await Role.findById(req.body.roleId);
        if (!role) {
          return res.status(400).json({ status: "error", message: "Selected role not found" });
        }
        updatedData.role = role._id.toString();
        updatedData.legacyRole = role.name;
      } else {
        updatedData.role = null;
        updatedData.legacyRole = "";
      }
    } else if (canViewAll && typeof req.body.role === "string") {
      updatedData.role = req.body.role;
      updatedData.legacyRole = req.body.role;
    }

    if (canViewAll && Array.isArray(req.body.permissions)) {
      updatedData.permissions = normalizePermissions(req.body.permissions);
    }

    if (req.body.password) {
      const isSamePassword = await bcrypt.compare(req.body.password, user.password);
      updatedData.password = isSamePassword
        ? user.password
        : await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
    }

    if (req.file) {
      updatedData.profile = req.file.buffer.toString("base64");
    }

    const updatedUser = await UserAuth.findByIdAndUpdate(
      userId,
      { $set: updatedData },
      { new: true },
    );

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      updatedUser: await serializeUser(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?._id || req.user?.id;
    const canViewAll = await canManageAllUsers({ _id: currentUserId });

    if (!canViewAll && String(userId) !== String(currentUserId)) {
      return res.status(403).json({
        status: 403,
        message: "You can only delete your own account",
      });
    }

    const userToDelete = await UserAuth.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ status: 404, message: "User not found!" });
    }

    if (userToDelete.isSuperAdmin) {
      return res.status(400).json({
        status: 400,
        message: "Super admin account cannot be deleted.",
      });
    }

    const deletedUser = await UserAuth.findByIdAndDelete(userId);

    return res.status(200).json({
      status: 200,
      message: "User account deleted successfully",
      deletedUser: await serializeUser(deletedUser),
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllProfileData = async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.user?.id;
    const canViewAll = await canManageAllUsers({ _id: currentUserId });

    const query = canViewAll ? {} : { _id: currentUserId };
    const users = await UserAuth.find(query).sort({ createdAt: -1 });
    const data = await Promise.all(users.map((user) => serializeUser(user)));

    return res.status(200).json({
      success: true,
      message: "Profile data fetched",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const completeUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?._id || req.user?.id;
    const canViewAll = await canManageAllUsers({ _id: currentUserId });

    if (!canViewAll && String(userId) !== String(currentUserId)) {
      return res.status(403).json({
        status: 403,
        message: "You can only update your own profile",
      });
    }

    const updatedUser = await UserAuth.findByIdAndUpdate(
      userId,
      { details: req.body },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ status: 404, message: "User not found!" });
    }

    res.status(200).json({
      status: 200,
      message: "Profile completed successfully",
      data: await serializeUser(updatedUser),
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    const user = await UserAuth.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!roleId) {
      user.role = null;
      user.legacyRole = "";
    } else {
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(400).json({ success: false, message: "Selected role not found" });
      }
      user.role = role._id.toString();
      user.legacyRole = role.name;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: await serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const user = await UserAuth.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isSuperAdmin && req.body.isActive === false) {
      user.isActive = true;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Super admin accounts must always remain active.",
        data: await serializeUser(user),
      });
    }

    user.isActive = Boolean(req.body.isActive);

    if (user.isActive) {
      user.failedLoginAttempts = 0;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: await serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

const getMyPermissions = async (req, res) => {
  try {
    const user = await UserAuth.findById(req.user?._id || req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resolvedRole = await resolveRoleForUser(user);

    res.status(200).json({
      success: true,
      data: {
        isSuperAdmin: user.isSuperAdmin,
        role: serializeRoleForClient(user, resolvedRole),
        permissions: buildPermissionsMap(user, resolvedRole),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
      error: error.message,
    });
  }
};

export {
  getUserAccount,
  updateUserAccount,
  deleteUserAccount,
  completeUserProfile,
  getAllProfileData,
  updateUserRole,
  updateUserStatus,
  getMyPermissions,
};
