import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
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
router.post("/seed-government", seedGovernmentHolidays);

// Get holiday dates (lightweight, for date-picker disabling)
router.get("/dates", getHolidayDates);

// Get working days for a batch excluding holidays
router.get("/working-days/:batchId", getWorkingDaysWithHolidays);

// CRUD
router.get("/", getHolidays);
router.post("/", createHoliday);
router.put("/:id", updateHoliday);
router.delete("/:id", deleteHoliday);

export default router;
