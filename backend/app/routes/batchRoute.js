import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  getBatchesByCourse,
  updateBatch,
  deleteBatch,
  deactivateBatch,
} from "../controller/batchController.js";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new batch
router.post("/", authorize("courses", "create"), createBatch);

// Get all batches (with optional filters)
router.get("/", authorize("courses", "view"), getAllBatches);

// Get batches by course
router.get("/course/:courseId", authorize("courses", "view"), getBatchesByCourse);

// Get batch by ID
router.get("/:id", authorize("courses", "view"), getBatchById);

// Update batch
router.put("/:id", authorize("courses", "update"), updateBatch);

// Delete batch
router.delete("/:id", authorize("courses", "delete"), deleteBatch);

// Deactivate batch
router.patch("/:id/deactivate", authorize("courses", "update"), deactivateBatch);

export default router;
