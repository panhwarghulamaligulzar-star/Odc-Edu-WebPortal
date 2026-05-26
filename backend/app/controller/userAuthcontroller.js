import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Role from "../modules/roleModule.js";
import UserAuth from "../modules/userAuthModal.js";
import {
  buildPermissionsMap,
  resolveRoleForUser,
  serializeRoleForClient,
} from "../utils/rbac.js";

const createUser = async (req, res) => {
  try {
    const { name, roleId, role, password, isSuperAdmin = false } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    const existingUser = await UserAuth.findOne({ email });
    if (existingUser) {
      return res.status(400).send({
        status: "error",
        message: "User already exists with this email!",
      });
    }

    let assignedRole = null;
    if (roleId) {
      assignedRole = await Role.findById(roleId);
      if (!assignedRole) {
        return res.status(400).send({
          status: "error",
          message: "Selected role does not exist",
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const image = req.file ? req.file.buffer.toString("base64") : null;

    const createdUser = new UserAuth({
      name,
      email,
      role: assignedRole?._id?.toString() || role || null,
      legacyRole: assignedRole?.name || role || "",
      password: hashedPassword,
      profile: image,
      isSuperAdmin: Boolean(isSuperAdmin),
      isActive: true,
    });

    await createdUser.save();

    res.send({
      status: "success",
      message: "User created successfully!",
      user: {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: assignedRole?.name || role || "",
        isSuperAdmin: createdUser.isSuperAdmin,
        isActive: createdUser.isActive,
      },
    });
  } catch (error) {
    res.status(500).send({
      status: "error",
      message: "Failed to create user",
      error: error.message,
    });
  }
};

const userLogin = async (req, res) => {
  try {
    const password = req.body.password;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const user = await UserAuth.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    if (user.isSuperAdmin && user.isActive === false) {
      user.isActive = true;
      await user.save();
    }

    if (user.isActive === false) {
      return res.status(403).json({
        status: "error",
        message: "Your account is inactive. Please contact the super admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;

      if (!user.isSuperAdmin && user.failedLoginAttempts >= 3) {
        user.isActive = false;
        await user.save();

        return res.status(403).json({
          status: "error",
          message:
            "Your account is inactive. Please contact the super admin.",
        });
      }

      await user.save();

      return res.status(400).json({
        status: "error",
        message: `Invalid email or password. ${Math.max(
          0,
          3 - Number(user.failedLoginAttempts || 0),
        )} attempts remaining.`,
      });
    }

    if (user.failedLoginAttempts) {
      user.failedLoginAttempts = 0;
    }

    const resolvedRole = await resolveRoleForUser(user);
    const permissions = buildPermissionsMap(user, resolvedRole);

    const token = jwt.sign(
      {
        _id: user._id,
        id: user._id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        role: serializeRoleForClient(user, resolvedRole),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    user.lastLogin = new Date();
    await user.save();

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: serializeRoleForClient(user, resolvedRole),
      profile: user.profile,
      details: user.details,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      permissions,
      lastLogin: user.lastLogin,
    };

    res.status(200).json({
      status: "success",
      message: "Login successful",
      userId: user._id,
      user: safeUser,
      token,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

export { createUser, userLogin };
