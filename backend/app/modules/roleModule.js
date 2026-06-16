import mongoose from "mongoose";
import { RBAC_ACTIONS, RBAC_MODULES } from "../utils/rbacConstants.js";
import {
  createEmptyActions,
  normalizePermissions,
} from "../utils/rbacShape.js";

const actionSchema = new mongoose.Schema(
  RBAC_ACTIONS.reduce((acc, action) => {
    acc[action] = { type: Boolean, default: false };
    return acc;
  }, {}),
  { _id: false },
);

const permissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      enum: RBAC_MODULES,
      required: true,
    },
    actions: {
      type: actionSchema,
      default: createEmptyActions,
    },
  },
  { _id: false },
);

const roleSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    permissions: {
      type: [permissionSchema],
      default: () => normalizePermissions(),
    },
    createdBy: { type: String, ref: "User" },
  },
  { timestamps: true },
);

roleSchema.pre("save", function normalizeRolePermissions(next) {
  this.permissions = normalizePermissions(this.permissions);
  next();
});

const Role = mongoose.model("Role", roleSchema);
export default Role;
