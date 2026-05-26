import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import requireAuth from "../midlewear/requireAuth.js";
import superAdminOnly from "../midlewear/superAdminOnly.js";
import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from "../controller/roleController.js";

const router = express.Router();

router.use(authMiddleware, requireAuth);

router.get("/", superAdminOnly, getRoles);
router.post("/", superAdminOnly, createRole);
router.get("/:id", getRoleById);
router.put("/:id", superAdminOnly, updateRole);
router.delete("/:id", superAdminOnly, deleteRole);

export default router;
