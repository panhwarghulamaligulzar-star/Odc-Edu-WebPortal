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

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new batch
router.post("/", createBatch);

// Get all batches (with optional filters)
router.get("/", getAllBatches);

// Get batches by course
router.get("/course/:courseId", getBatchesByCourse);

// Get batch by ID
router.get("/:id", getBatchById);

// Update batch
router.put("/:id", updateBatch);

// Delete batch
router.delete("/:id", deleteBatch);

// Deactivate batch
router.patch("/:id/deactivate", deactivateBatch);

export default router;
