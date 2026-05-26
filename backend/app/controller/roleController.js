import UserAuth from "../modules/userAuthModal.js";
import Role from "../modules/roleModule.js";
import { RBAC_ACTIONS, RBAC_MODULES, normalizePermissions } from "../utils/rbac.js";

const roleHasEnabledAccess = (permissions = []) =>
  permissions.some((item) =>
    Object.values(item?.actions || {}).some((allowed) => allowed === true),
  );

const createSuperAdminPermissions = () =>
  RBAC_MODULES.map((moduleKey) => ({
    module: moduleKey,
    actions: RBAC_ACTIONS.reduce((acc, action) => {
      acc[action] = true;
      return acc;
    }, {}),
  }));

const ensureSuperAdminRole = async () => {
  const existingRole = await Role.findOne({
    name: /^Super Admin$/i,
  });

  if (existingRole) {
    return existingRole;
  }

  return Role.create({
    name: "Super Admin",
    description: "Protected system role for platform super administrators.",
    isSystem: true,
    permissions: normalizePermissions(createSuperAdminPermissions()),
  });
};

const getRoles = async (req, res) => {
  try {
    const superAdminRole = await ensureSuperAdminRole();
    const roles = await Role.find().sort({ createdAt: -1 }).lean();
    const superAdminCount = await UserAuth.countDocuments({ isSuperAdmin: true });

    const users = await UserAuth.find(
      { role: { $exists: true, $ne: null } },
      { role: 1 },
    ).lean();

    const userCountMap = users.reduce((acc, user) => {
      const key = String(user.role);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const data = roles.map((role) => ({
      ...role,
      permissions: normalizePermissions(role.permissions),
      userCount:
        String(role._id) === String(superAdminRole._id)
          ? superAdminCount
          : userCountMap[String(role._id)] || 0,
    }));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
      error: error.message,
    });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).lean();

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...role,
        permissions: normalizePermissions(role.permissions),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch role",
      error: error.message,
    });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description = "", permissions = [], isDefault = false } = req.body;
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    const existingRole = await Role.findOne({
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Role name already exists",
      });
    }

    const role = await Role.create({
      name: trimmedName,
      description,
      isDefault,
      permissions: normalizePermissions(permissions),
      createdBy: req.user?._id || req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create role",
      error: error.message,
    });
  }
};

const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (role.isSystem && req.body.name && req.body.name !== role.name) {
      return res.status(400).json({
        success: false,
        message: "System role names cannot be changed",
      });
    }

    if (role.isSystem && req.body.isSystem === false) {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be converted",
      });
    }

    if (req.body.name && req.body.name !== role.name) {
      const duplicate = await Role.findOne({
        _id: { $ne: role._id },
        name: new RegExp(`^${req.body.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }
    }

    if (req.body.name && !role.isSystem) {
      role.name = req.body.name.trim();
    }

    if (typeof req.body.description === "string") {
      role.description = req.body.description;
    }

    if (Array.isArray(req.body.permissions)) {
      role.permissions = normalizePermissions(req.body.permissions);
    }

    await role.save();

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update role",
      error: error.message,
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    if (roleHasEnabledAccess(role.permissions)) {
      return res.status(400).json({
        success: false,
        message: "Remove all module access from this role before deleting it.",
      });
    }

    await UserAuth.updateMany(
      { role: role._id.toString() },
      {
        $set: {
          role: null,
          legacyRole: "",
        },
      },
    );

    await role.deleteOne();

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete role",
      error: error.message,
    });
  }
};

export { createRole, updateRole, deleteRole, getRoles, getRoleById };
