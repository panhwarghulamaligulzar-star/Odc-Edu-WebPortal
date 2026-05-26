import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
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
router.post("/bulk", authorize("attendance", "create"), bulkMarkAttendance);

// Get batch members (students + teachers)
router.get("/batch/:batchId/members", authorize("attendance", "view"), getBatchMembers);

// Calendar view: per-date attendance counts for a month
router.get("/batch/:batchId/calendar", authorize("attendance", "view"), getMonthCalendar);

// Full history with per-person summary (date range)
router.get("/batch/:batchId/history", authorize("attendance", "view"), getAttendanceHistory);

// Get attendance records for a batch on a specific date
router.get("/batch/:batchId", authorize("attendance", "view"), getAttendanceByBatchAndDate);

// Get attendance summary for a batch over a date range
router.get("/batch/:batchId/summary", authorize("attendance", "view"), getAttendanceSummary);

// Get working days for a batch in a given month
router.get("/working-days/:batchId", authorize("attendance", "view"), getWorkingDays);

// Get all attendance for a specific person
router.get("/person/:personId", authorize("attendance", "view"), getPersonAttendance);

// Auto-mark all batch members as Holiday for a holiday date
router.post("/mark-holiday", authorize("attendance", "approve"), markHolidayAttendance);

export default router;
