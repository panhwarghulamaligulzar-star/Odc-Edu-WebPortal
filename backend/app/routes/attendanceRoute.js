import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import {
  bulkMarkAttendance,
  getAttendanceByBatchAndDate,
  getPersonAttendance,
  getBatchMembers,
  getAttendanceSummary,
  getWorkingDays,
  getAttendanceHistory,
  getMonthCalendar,
  markHolidayAttendance,
} from "../controller/attendanceController.js";

const router = express.Router();

router.use(authMiddleware);

// Mark / update attendance in bulk for a batch+date
router.post("/bulk", bulkMarkAttendance);

// Get batch members (students + teachers)
router.get("/batch/:batchId/members", getBatchMembers);

// Calendar view: per-date attendance counts for a month
router.get("/batch/:batchId/calendar", getMonthCalendar);

// Full history with per-person summary (date range)
router.get("/batch/:batchId/history", getAttendanceHistory);

// Get attendance records for a batch on a specific date
router.get("/batch/:batchId", getAttendanceByBatchAndDate);

// Get attendance summary for a batch over a date range
router.get("/batch/:batchId/summary", getAttendanceSummary);

// Get working days for a batch in a given month
router.get("/working-days/:batchId", getWorkingDays);

// Get all attendance for a specific person
router.get("/person/:personId", getPersonAttendance);

// Auto-mark all batch members as Holiday for a holiday date
router.post("/mark-holiday", markHolidayAttendance);

export default router;
