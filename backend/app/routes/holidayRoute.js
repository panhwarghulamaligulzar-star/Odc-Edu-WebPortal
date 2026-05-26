import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
import {
  createHoliday,
  getHolidays,
  getHolidayDates,
  updateHoliday,
  deleteHoliday,
  seedGovernmentHolidays,
  getWorkingDaysWithHolidays,
} from "../controller/holidayController.js";

const router = express.Router();

router.use(authMiddleware);

// Seed Pakistan government holidays (run once)
router.post("/seed-government", authorize("attendance", "approve"), seedGovernmentHolidays);

// Get holiday dates (lightweight, for date-picker disabling)
router.get("/dates", authorize("attendance", "view"), getHolidayDates);

// Get working days for a batch excluding holidays
router.get("/working-days/:batchId", authorize("attendance", "view"), getWorkingDaysWithHolidays);

// CRUD
router.get("/", authorize("attendance", "view"), getHolidays);
router.post("/", authorize("attendance", "create"), createHoliday);
router.put("/:id", authorize("attendance", "update"), updateHoliday);
router.delete("/:id", authorize("attendance", "delete"), deleteHoliday);

export default router;
