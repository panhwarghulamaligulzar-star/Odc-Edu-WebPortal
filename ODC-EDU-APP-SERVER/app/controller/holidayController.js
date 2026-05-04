import HolidaySchema from "../modules/holidayModule.js";
import BatchSchema from "../modules/batchModule.js";
import AttendanceSchema from "../modules/attendanceModule.js";
import EnrollmentSchema from "../modules/enrollmentModule.js";
import TeacherSchema from "../modules/teacherModule.js";
import dayjs from "dayjs";

// ─── Helper: auto-mark attendance as Holiday for all affected batch members ───
// Used when an academy holiday is created. Expands multi-day ranges.
const autoMarkAcademyHolidayAttendance = async (holiday, userId) => {
  let batchIds = (holiday.affectedBatches || []).map((id) => id.toString());
  if (batchIds.length === 0) {
    const allBatches = await BatchSchema.find({}, "_id").lean();
    batchIds = allBatches.map((b) => b._id.toString());
  }

  // Build list of dates (start → end inclusive)
  const dates = [];
  const startDate = new Date(holiday.date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = holiday.endDate ? new Date(holiday.endDate) : new Date(holiday.date);
  endDate.setHours(0, 0, 0, 0);
  let cur = new Date(startDate);
  while (cur <= endDate) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const ops = [];

  for (const batchId of batchIds) {
    const batch = await BatchSchema.findById(batchId, "course").lean();
    if (!batch) continue;

    const enrollments = await EnrollmentSchema.find(
      { batch: batchId, status: { $in: ["Active", "On Hold"] } },
      "student"
    ).lean();

    for (const date of dates) {
      for (const en of enrollments) {
        if (!en.student) continue;
        ops.push({
          updateOne: {
            filter: { batch: batchId, date, person: en.student },
            update: {
              $set: {
                batch: batchId, date, person: en.student,
                personModel: "Admission", personType: "student",
                status: "Holiday", notes: `Holiday: ${holiday.name}`,
                markedBy: userId,
              },
            },
            upsert: true,
          },
        });
      }

      if (batch.course) {
        const teachers = await TeacherSchema.find({ courseId: batch.course }, "_id").lean();
        for (const t of teachers) {
          ops.push({
            updateOne: {
              filter: { batch: batchId, date, person: t._id },
              update: {
                $set: {
                  batch: batchId, date, person: t._id,
                  personModel: "Teacher", personType: "teacher",
                  status: "Holiday", notes: `Holiday: ${holiday.name}`,
                  markedBy: userId,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }
  }

  if (ops.length > 0) {
    await AttendanceSchema.bulkWrite(ops, { ordered: false });
  }
  return ops.length;
};

// ─── Pakistan government holidays (fixed + variable placeholders) ─────────────
// These are seeded once. Variable ones (Eid etc.) are updated by admin each year.
export const PAKISTAN_GOVT_HOLIDAYS = [
  { date: "2025-02-05", name: "Kashmir Solidarity Day",  isRecurring: true  },
  { date: "2025-03-23", name: "Pakistan Day",            isRecurring: true  },
  { date: "2025-04-21", name: "Eid ul-Fitr (Day 1)",    isRecurring: false },
  { date: "2025-04-22", name: "Eid ul-Fitr (Day 2)",    isRecurring: false },
  { date: "2025-04-23", name: "Eid ul-Fitr (Day 3)",    isRecurring: false },
  { date: "2025-05-01", name: "Labour Day",              isRecurring: true  },
  { date: "2025-06-27", name: "Eid ul-Adha (Day 1)",    isRecurring: false },
  { date: "2025-06-28", name: "Eid ul-Adha (Day 2)",    isRecurring: false },
  { date: "2025-06-29", name: "Eid ul-Adha (Day 3)",    isRecurring: false },
  { date: "2025-07-17", name: "Muharram / Ashura",       isRecurring: false },
  { date: "2025-08-14", name: "Independence Day",        isRecurring: true  },
  { date: "2025-09-16", name: "Eid Milad-un-Nabi",       isRecurring: false },
  { date: "2025-11-09", name: "Iqbal Day",               isRecurring: true  },
  { date: "2025-12-25", name: "Quaid-e-Azam Day",        isRecurring: true  },
  // 2026 fixed holidays
  { date: "2026-02-05", name: "Kashmir Solidarity Day",  isRecurring: true  },
  { date: "2026-03-23", name: "Pakistan Day",            isRecurring: true  },
  { date: "2026-05-01", name: "Labour Day",              isRecurring: true  },
  { date: "2026-08-14", name: "Independence Day",        isRecurring: true  },
  { date: "2026-11-09", name: "Iqbal Day",               isRecurring: true  },
  { date: "2026-12-25", name: "Quaid-e-Azam Day",        isRecurring: true  },
];

// ─── Helper: normalize date to local midnight ─────────────────────────────────
const toMidnight = (d) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const buildHolidayOverlapFilter = (from, to) => {
  if (!from && !to) return {};

  const clauses = [];

  if (from && to) {
    clauses.push({
      $or: [
        { date: { $gte: from, $lte: to } },
        { date: { $lte: to }, endDate: { $ne: null, $gte: from } },
      ],
    });
  } else if (from) {
    clauses.push({
      $or: [
        { date: { $gte: from } },
        { endDate: { $ne: null, $gte: from } },
      ],
    });
  } else if (to) {
    clauses.push({ date: { $lte: to } });
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
};

// ─── POST /holidays ───────────────────────────────────────────────────────────
// Body: { date, endDate?, name, type, reason?, isRecurring?, affectedBatches? }
export const createHoliday = async (req, res) => {
  try {
    const { date, endDate, name, type, reason, isRecurring, affectedBatches } = req.body;

    if (!date || !name || !type) {
      return res.status(400).json({ success: false, message: "date, name, and type are required" });
    }

    const holiday = await HolidaySchema.create({
      date: toMidnight(date),
      endDate: endDate ? toMidnight(endDate) : null,
      name,
      type,
      reason: reason || "",
      isRecurring: isRecurring || false,
      affectedBatches: affectedBatches || [],
      createdBy: req.user?._id,
    });

    // Auto-mark attendance as Holiday for all affected members when it's an academy holiday
    let autoMarked = 0;
    if (type === "academy") {
      try {
        autoMarked = await autoMarkAcademyHolidayAttendance(holiday, req.user?._id);
      } catch (markErr) {
        console.error("autoMarkAcademyHolidayAttendance error:", markErr);
        // Don't fail the request — holiday is created, just log the error
      }
    }

    res.status(201).json({
      success: true,
      data: holiday,
      ...(type === "academy" && { autoMarked, message: `Holiday created and attendance marked as Holiday for ${autoMarked} record(s)` }),
    });
  } catch (error) {
    console.error("createHoliday error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /holidays?from=&to=&type=&batchId= ──────────────────────────────────
export const getHolidays = async (req, res) => {
  try {
    const { from, to, type, batchId } = req.query;

    const filter = { isActive: true };

    if (type) filter.type = type;

    if (from || to) {
      const fromDate = from ? toMidnight(from) : null;
      const toDate = to ? toMidnight(to) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);
      Object.assign(filter, buildHolidayOverlapFilter(fromDate, toDate));
    }

    // If batchId provided, return holidays that affect this batch (or all batches)
    if (batchId) {
      filter.$or = [
        { affectedBatches: { $size: 0 } },    // all batches
        { affectedBatches: batchId },
      ];
    }

    const holidays = await HolidaySchema.find(filter)
      .populate("affectedBatches", "batchName batchCode")
      .sort({ date: 1 })
      .lean();

    res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    console.error("getHolidays error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /holidays/dates?from=&to=&batchId= ──────────────────────────────────
// Lightweight endpoint: returns only { date, name, type, reason } for date-picker use
export const getHolidayDates = async (req, res) => {
  try {
    const { from, to, batchId } = req.query;

    const filter = { isActive: true };

    if (from || to) {
      const fromDate = from ? toMidnight(from) : null;
      const toDate = to ? toMidnight(to) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);
      Object.assign(filter, buildHolidayOverlapFilter(fromDate, toDate));
    }

    if (batchId) {
      filter.$or = [
        { affectedBatches: { $size: 0 } },
        { affectedBatches: batchId },
      ];
    }

    const holidays = await HolidaySchema.find(filter)
      .select("date endDate name type reason")
      .sort({ date: 1 })
      .lean();

    // Expand multi-day holidays into individual date entries
    const expanded = [];
    holidays.forEach((h) => {
      const start = new Date(h.date);
      const end   = h.endDate ? new Date(h.endDate) : new Date(h.date);
      let cur = new Date(start);
      while (cur <= end) {
        expanded.push({
          date: cur.toISOString().split("T")[0],
          name: h.name,
          type: h.type,
          reason: h.reason,
        });
        cur.setDate(cur.getDate() + 1);
      }
    });

    res.status(200).json({ success: true, data: expanded });
  } catch (error) {
    console.error("getHolidayDates error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /holidays/:id ────────────────────────────────────────────────────────
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.date) updates.date = toMidnight(updates.date);
    if (updates.endDate) updates.endDate = toMidnight(updates.endDate);

    const holiday = await HolidaySchema.findByIdAndUpdate(id, updates, { new: true });
    if (!holiday) return res.status(404).json({ success: false, message: "Holiday not found" });

    res.status(200).json({ success: true, data: holiday });
  } catch (error) {
    console.error("updateHoliday error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /holidays/:id ─────────────────────────────────────────────────────
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await HolidaySchema.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!holiday) return res.status(404).json({ success: false, message: "Holiday not found" });

    res.status(200).json({ success: true, message: "Holiday removed" });
  } catch (error) {
    console.error("deleteHoliday error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /holidays/seed-government ──────────────────────────────────────────
// Seeds Pakistan government holidays (skips duplicates)
export const seedGovernmentHolidays = async (req, res) => {
  try {
    let seeded = 0;
    for (const h of PAKISTAN_GOVT_HOLIDAYS) {
      const dateObj = toMidnight(h.date);
      const exists = await HolidaySchema.findOne({ date: dateObj, type: "government" });
      if (!exists) {
        await HolidaySchema.create({
          date: dateObj,
          name: h.name,
          type: "government",
          isRecurring: h.isRecurring,
          affectedBatches: [],
          createdBy: req.user?._id,
        });
        seeded++;
      }
    }
    res.status(200).json({ success: true, message: `Seeded ${seeded} government holidays` });
  } catch (error) {
    console.error("seedGovernmentHolidays error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /holidays/working-days/:batchId?year=&month= ────────────────────────
// Returns working days for a batch in a month EXCLUDING holidays
export const getWorkingDaysWithHolidays = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { year, month } = req.query;

    const batch = await BatchSchema.findById(batchId).lean();
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    // Day-of-week set for batch schedule
    const DOW_MAP = {
      "Monday to Saturday": [1, 2, 3, 4, 5, 6],
      "Monday to Thursday": [1, 2, 3, 4],
      "Saturday & Sunday":  [6, 0],
    };
    const dowSet = new Set(DOW_MAP[batch.days] || []);

    const daysInMonth = new Date(y, m, 0).getDate();
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m - 1, daysInMonth, 23, 59, 59);

    // Fetch holidays affecting this batch in this month
    const holidays = await HolidaySchema.find({
      isActive: true,
      $and: [
        buildHolidayOverlapFilter(from, to),
        {
          $or: [
            { affectedBatches: { $size: 0 } },
            { affectedBatches: batchId },
          ],
        },
      ],
    })
      .select("date endDate name type reason")
      .lean();

    // Build a Set of holiday date strings
    const holidayMap = {}; // "YYYY-MM-DD" → { name, type, reason }
    holidays.forEach((h) => {
      const start = new Date(h.date);
      const end   = h.endDate ? new Date(h.endDate) : new Date(h.date);
      let cur = new Date(start);
      while (cur <= end) {
        const ds = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
        holidayMap[ds] = { name: h.name, type: h.type, reason: h.reason };
        cur.setDate(cur.getDate() + 1);
      }
    });

    const workingDays = [];
    const nonClassDays = [];
    const holidayDays = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

      if (!dowSet.has(date.getDay())) {
        nonClassDays.push(d);
      } else if (holidayMap[dateStr]) {
        holidayDays.push({ day: d, ...holidayMap[dateStr] });
      } else {
        workingDays.push(d);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        batchId,
        year: y,
        month: m,
        batchDays: batch.days,
        totalCalendarDays: daysInMonth,
        workingDays,
        nonClassDays,
        holidayDays,
        totalWorkingDays: workingDays.length,
        totalNonClassDays: nonClassDays.length,
        totalHolidayDays: holidayDays.length,
        holidayMap,
      },
    });
  } catch (error) {
    console.error("getWorkingDaysWithHolidays error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
