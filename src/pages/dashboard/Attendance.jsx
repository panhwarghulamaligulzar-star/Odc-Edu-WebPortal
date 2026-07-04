import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Select, DatePicker, Tabs, Table, Tag, Spin,
  Button, message, Badge, Tooltip, Segmented, Modal, Input, Checkbox,
} from "antd";
import {
  MdCheckCircle, MdCancel, MdAccessTime, MdBeachAccess,
  MdSave, MdHistory, MdFactCheck, MdDownload, MdUpload,
} from "react-icons/md";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import odysseyLogo from "../../assets/images/logos/LOGO.png";
import { getAllBatches } from "../../services/batchService";
import {
  getBatchMembers,
  getAttendanceByBatchAndDate,
  bulkMarkAttendance,
  getAttendanceHistory,
  getMonthCalendar,
  getPersonAttendance,
} from "../../services/attendanceService";
import { createHoliday, getHolidayDates } from "../../services/holidayService";
import MonthlyAttendanceReport from "./MonthlyAttendanceReport";

// ─── PDF Design Constants (matches Students.jsx) ──────────────────────────────
const PDF_COLORS = {
  primary:        [15,  40, 100],
  primaryLight:   [235, 240, 252],
  accent:         [0,   112, 186],
  dark:           [20,  20,  30],
  mid:            [80,  90, 110],
  rule:           [210, 215, 225],
  white:          [255, 255, 255],
  rowAlt:         [247, 249, 253],
  pageBannerBg:   [235, 241, 255],
  pageBannerTitle:[10,  30,  90],
  pageBannerSub:  [80,  100, 150],
  pillBg:         [30,  70, 160],
  pillTxt:        [255, 255, 255],
  presentBg:      [240, 253, 244],
  presentFg:      [22,  163, 74],
  absentBg:       [255, 241, 242],
  absentFg:       [220, 38,  38],
  halfDayBg:      [255, 253, 235],
  halfDayFg:      [161, 98,  7],
  leaveBg:        [239, 246, 255],
  leaveFg:        [37,  99,  235],
};
const setFill = (doc, rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setDraw = (doc, rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
const setTxt  = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

const loadLogoBase64 = async (logoSrc) => {
  try {
    const res  = await fetch(logoSrc);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
  } catch { return null; }
};

const drawPdfHeader = (doc, logoDataUrl, subtitle = "") => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const barH   = 50;

  setFill(doc, PDF_COLORS.pageBannerBg);
  doc.rect(0, 0, pageWidth, barH, "F");

  if (logoDataUrl) {
    const logoSize = 45;
    doc.addImage(logoDataUrl, "PNG", margin, (barH - logoSize) / 2, logoSize, logoSize);
  }

  const cx = pageWidth / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setTxt(doc, PDF_COLORS.pageBannerTitle);
  doc.text("ODYSSEY ACADEMY KHIPRO", cx, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt(doc, PDF_COLORS.pageBannerSub);
  doc.text("Bin Muqarab Colony, Main 7G Road, Khipro", cx, 22, { align: "center" });
  doc.text("Email: askodysseyacademy@gmail.com  |  Phone: +923492425428", cx, 28, { align: "center" });

  if (subtitle) {
    setFill(doc, PDF_COLORS.pillBg);
    const pillW = 100, pillH = 8;
    const pillX = (pageWidth - pillW) / 2;
    doc.roundedRect(pillX, 40, pillW, pillH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(doc, PDF_COLORS.pillTxt);
    doc.text(subtitle.toUpperCase(), cx, 45.2, { align: "center" });
  }

  return barH + 4;
};

// ─── STATUS fill colour for PDF cells ────────────────────────────────────────
const STATUS_CELL_COLOR = {
  Present:  PDF_COLORS.presentBg,
  Absent:   PDF_COLORS.absentBg,
  "Half Day": PDF_COLORS.halfDayBg,
  Leave:    PDF_COLORS.leaveBg,
};

const { RangePicker } = DatePicker;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Present:   { color: "bg-green-100 border-green-400 text-green-700",   activeColor: "bg-green-500 text-white border-green-600",   icon: <MdCheckCircle size={16} />, tag: "success",    dot: "🟢" },
  Absent:    { color: "bg-red-100 border-red-400 text-red-700",          activeColor: "bg-red-500 text-white border-red-600",      icon: <MdCancel size={16} />,      tag: "error",      dot: "🔴" },
  "Half Day":{ color: "bg-yellow-100 border-yellow-400 text-yellow-700", activeColor: "bg-yellow-400 text-white border-yellow-500", icon: <MdAccessTime size={16} />,  tag: "warning",    dot: "🟡" },
  Leave:     { color: "bg-blue-100 border-blue-400 text-blue-700",       activeColor: "bg-blue-500 text-white border-blue-600",    icon: <MdBeachAccess size={16} />,  tag: "processing", dot: "🔵" },
  Holiday:   { color: "bg-orange-100 border-orange-400 text-orange-700", activeColor: "bg-orange-500 text-white border-orange-600", icon: <MdBeachAccess size={16} />,  tag: "warning",    dot: "🟠" },
};
const STATUSES = ["Present", "Absent", "Half Day", "Leave"];

const DOW_MAP = {
  "Monday to Saturday": [1, 2, 3, 4, 5, 6],
  "Monday to Thursday": [1, 2, 3, 4],
  "Saturday & Sunday":  [6, 0],
};

// holidayMap is a Map of "YYYY-MM-DD" → holiday info — passed in from panel state
// Only academy holidays are disabled; government holidays are selectable (academy may be open)
const isDisabledDate = (d, batchDays, holidayMap) => {
  if (!batchDays) return false;
  if (!(DOW_MAP[batchDays] || []).includes(d.day())) return true;
  if (holidayMap) {
    const h = holidayMap.get(d.format("YYYY-MM-DD"));
    if (h && h.type === "academy") return true;
  }
  return false;
};

// ─── StatusPicker ─────────────────────────────────────────────────────────────
const StatusPicker = ({ value, onChange, disabled = false }) => (
  <div className="flex gap-1 flex-wrap">
    {STATUSES.map((s) => {
      const cfg = STATUS_CONFIG[s];
      const active = value === s;
      return (
        <button key={s} type="button" disabled={disabled} onClick={() => onChange(s)}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-all
            ${active ? cfg.activeColor : cfg.color} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
          {cfg.icon}{s}
        </button>
      );
    })}
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => (
  <div className="flex gap-3 flex-wrap text-xs">
    {STATUSES.map((s) => (
      <span key={s} className={`flex items-center gap-1 px-2 py-1 rounded border ${STATUS_CONFIG[s].color}`}>
        {STATUS_CONFIG[s].icon}{s}
      </span>
    ))}
  </div>
);

// ─── StatusTag helper ─────────────────────────────────────────────────────────
const StatusTag = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Absent;
  return (
    <Tag color={cfg.tag} className="flex items-center gap-1 w-fit">
      {cfg.icon}{status || "Absent"}
    </Tag>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MARK ATTENDANCE PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// Calendar cell letters + colors
const CALENDAR_LETTER = { Present: "P", Absent: "A", "Half Day": "H", Leave: "L", Holiday: "O" };
const CALENDAR_BG    = {
  Present:   "bg-green-500 text-white",
  Absent:    "bg-red-500 text-white",
  "Half Day":"bg-yellow-400 text-white",
  Leave:     "bg-blue-500 text-white",
  Holiday:   "bg-orange-500 text-white",
};
// Dot colors for DatePicker cell indicators (inline style — outside Tailwind scope)
const DOT_COLOR = {
  Present:   "#22c55e",
  Absent:    "#ef4444",
  "Half Day":"#eab308",
  Leave:     "#3b82f6",
  Holiday:   "#f97316",
};

function MarkAttendancePanel({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [activeTab, setActiveTab] = useState("student");
  const [members, setMembers] = useState({ students: [], teachers: [], batch: null });
  const [attendanceMap, setAttendanceMap] = useState({});   // personId → status
  const [timeMap, setTimeMap] = useState({});               // personId → "HH:mm DD MMM"
  const [calendarData, setCalendarData] = useState({});     // "YYYY-MM-DD" → { Present, Absent, ... }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // ── Holiday data ─────────────────────────────────────────────────────────
  // Map of "YYYY-MM-DD" → { name, type, reason }
  const [holidayMap, setHolidayMap] = useState(new Map());
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayReason, setHolidayReason] = useState("");
  const [holidaySaving, setHolidaySaving] = useState(false);
  // ── Person filter ────────────────────────────────────────────────────────────
  const [personTypeFilter, setPersonTypeFilter] = useState("all"); // "all"|"student"|"teacher"
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [personCalendarData, setPersonCalendarData] = useState({}); // "YYYY-MM-DD" → status string

  // ── Load members when batch changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedBatch) return;
    setLoading(true);
    getBatchMembers(selectedBatch)
      .then((res) => setMembers(res.data || { students: [], teachers: [], batch: null }))
      .catch(() => message.error("Failed to load batch members"))
      .finally(() => setLoading(false));
  }, [selectedBatch]);

  // ── Load calendar data for a given month ───────────────────────────────────
  // MERGE into existing map so navigating months keeps previous months' dots
  const loadCalendar = useCallback(async (batchId, dayjsDate) => {
    if (!batchId) return;
    try {
      const res = await getMonthCalendar(batchId, dayjsDate.year(), dayjsDate.month() + 1);
      setCalendarData((prev) => ({ ...prev, ...(res.data || {}) }));
    } catch { /* silent — calendar is decorative */ }
  }, []);

  // ── Load holidays for a 2-year window when batch changes ────────────────
  const loadHolidays = useCallback(async (batchId) => {
    if (!batchId) return;
    try {
      const year  = new Date().getFullYear();
      const from  = `${year - 1}-01-01`;
      const to    = `${year + 2}-12-31`;
      const res   = await getHolidayDates(from, to, batchId);
      const map   = new Map();
      (res.data || []).forEach((h) => {
        const existing = map.get(h.date);
        if (!existing || existing.type !== "academy" || h.type === "academy") {
          map.set(h.date, h);
        }
      });
      setHolidayMap(map);
    } catch { /* silent */ }
  }, []);

  // Reload calendar when batch changes (clear old data first)
  useEffect(() => {
    if (!selectedBatch) return;
    setCalendarData({});
    setPersonCalendarData({});
    setSelectedPersonId(null);
    setPersonTypeFilter("all");
    loadCalendar(selectedBatch, selectedDate);
    loadHolidays(selectedBatch);
  }, [selectedBatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load all attendance records for a specific person → build date→status map ─
  const loadPersonCalendar = useCallback(async (personId, personType) => {
    if (!personId) { setPersonCalendarData({}); return; }
    try {
      const res = await getPersonAttendance(personId, personType);
      const map = {};
      (res.data || []).forEach((r) => {
        const d = new Date(r.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        map[dateStr] = r.status;
      });
      setPersonCalendarData(map);
    } catch { /* silent */ }
  }, []);

  // Person dropdown options based on type filter
  const personDropdownOptions = useMemo(() => {
    if (personTypeFilter === "student") return members.students;
    if (personTypeFilter === "teacher") return members.teachers;
    return [
      ...members.students.map((s) => ({ ...s, _group: "Students" })),
      ...members.teachers.map((t) => ({ ...t, _group: "Teachers" })),
    ];
  }, [members, personTypeFilter]);

  const handlePersonTypeChange = (type) => {
    setPersonTypeFilter(type);
    setSelectedPersonId(null);
    setPersonCalendarData({});
    if (type !== "all") setActiveTab(type);
  };

  const handlePersonSelect = (personId) => {
    setSelectedPersonId(personId);
    if (!personId) { setPersonCalendarData({}); return; }
    const allPeople = [...members.students, ...members.teachers];
    const person = allPeople.find((p) => p._id === personId);
    if (person) loadPersonCalendar(personId, person.personType);
  };

  // ── Load existing attendance for the selected date ────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!selectedBatch || !selectedDate) return;
    setLoading(true);
    try {
      const res = await getAttendanceByBatchAndDate(selectedBatch, selectedDate.format("YYYY-MM-DD"));
      const map = {};
      const tmap = {};
      (res.data || []).forEach((r) => {
        const pid = r.person?._id || r.person;
        map[pid] = r.status;
        if (r.updatedAt) {
          tmap[pid] = dayjs(r.updatedAt).format("HH:mm, DD MMM");
        }
      });
      setAttendanceMap(map);
      setTimeMap(tmap);
      setDirty(false);
    } catch { message.error("Failed to load attendance"); }
    finally { setLoading(false); }
  }, [selectedBatch, selectedDate]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const handleStatusChange = (personId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [personId]: status }));
    setDirty(true);
  };

  const selectedDateKey = selectedDate?.format("YYYY-MM-DD");
  const selectedHoliday = selectedDateKey ? holidayMap.get(selectedDateKey) : null;
  const selectedDow = selectedDate?.day?.();
  const isScheduledWorkingDay = !!members.batch?.days && (DOW_MAP[members.batch.days] || []).includes(selectedDow);
  const isAcademyHoliday = selectedHoliday?.type === "academy";
  const isGovernmentHoliday = selectedHoliday?.type === "government";

  const openHolidayModal = () => {
    if (!selectedBatch || !selectedDate || !members.batch) return;
    setHolidayName(`${members.batch.batchName} Custom Holiday`);
    setHolidayReason("");
    setHolidayModalOpen(true);
  };

  const handleCreateBatchHoliday = async () => {
    if (!selectedBatch || !selectedDate) {
      message.warning("Select a batch and date first");
      return;
    }
    if (!holidayName.trim()) {
      message.warning("Enter a holiday name");
      return;
    }

    setHolidaySaving(true);
    try {
      const payload = {
        date: selectedDate.format("YYYY-MM-DD"),
        endDate: selectedDate.format("YYYY-MM-DD"),
        name: holidayName.trim(),
        type: "academy",
        reason: holidayReason.trim(),
        affectedBatches: [],
      };
      const res = await createHoliday(payload);
      message.success(res.message || "Holiday created for all batches and attendance marked as Holiday");
      setHolidayModalOpen(false);
      setHolidayReason("");
      setDirty(false);
      await Promise.all([
        loadHolidays(selectedBatch),
        loadAttendance(),
        loadCalendar(selectedBatch, selectedDate),
      ]);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create batch holiday");
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBatch || !selectedDate) { message.warning("Select a batch and date first"); return; }
    setSaving(true);
    try {
      const list = activeTab === "student" ? members.students : members.teachers;
      const records = list.map((p) => ({
        personId: p._id, personType: p.personType,
        status: attendanceMap[p._id] || "Absent", notes: "",
      }));
      await bulkMarkAttendance(selectedBatch, selectedDate.format("YYYY-MM-DD"), records);
      message.success("Attendance saved successfully!");
      setDirty(false);
      // Refresh time stamps + calendar
      await loadAttendance();
      await loadCalendar(selectedBatch, selectedDate);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save attendance");
    } finally { setSaving(false); }
  };

  // ── DatePicker: calendar cell renderer ────────────────────────────────────
  const cellRender = useCallback((current, info) => {
    if (info.type !== "date") return info.originNode;
    const dateStr = current.format("YYYY-MM-DD");

    const holiday = holidayMap.get(dateStr);

    // ── Academy holiday: disabled cell — show "SH" overlay only ───────────
    if (holiday && holiday.type === "academy") {
      const label = `Academy Holiday – ${holiday.name || holiday.reason || ""}${holiday.reason && holiday.name ? ` (${holiday.reason})` : ""}`;
      return React.cloneElement(info.originNode, {
        style: { height: "auto", lineHeight: "18px", padding: "2px 0" },
        children: (
          <Tooltip title={label} placement="top">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span>{current.date()}</span>
              <span style={{ fontSize: 7, color: "#2563eb", fontWeight: 700 }}>SH</span>
            </div>
          </Tooltip>
        ),
      });
    }

    // Government holiday badge — shown alongside attendance data (date is selectable)
    const govtBadge = holiday && holiday.type === "government" ? (
      <Tooltip title={`Public Holiday – ${holiday.name}`} placement="top">
        <span style={{ fontSize: 7, color: "#ea580c", fontWeight: 700, cursor: "default" }}>PH</span>
      </Tooltip>
    ) : null;

    // ── No filter selected: show plain date (+ PH badge if govt holiday) ──
    if (personTypeFilter === "all" && !selectedPersonId) {
      if (!govtBadge) return info.originNode;
      return React.cloneElement(info.originNode, {
        style: { height: "auto", lineHeight: "18px", padding: "2px 0" },
        children: (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span>{current.date()}</span>
            {govtBadge}
          </div>
        ),
      });
    }

    if (selectedPersonId) {
      // ── Single-person view: show that person's status badge ──────────────
      const status = personCalendarData[dateStr];
      return React.cloneElement(info.originNode, {
        style: { height: "auto", lineHeight: "18px", padding: "3px 0 2px" },
        children: (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span>{current.date()}</span>
            {govtBadge}
            {status && (
              <span
                title={status}
                style={{
                  backgroundColor: DOT_COLOR[status] || DOT_COLOR.Absent,
                  color: "#fff",
                  fontSize: 8,
                  fontWeight: 700,
                  lineHeight: "11px",
                  padding: "0 3px",
                  borderRadius: 2,
                }}
              >
                {CALENDAR_LETTER[status] || "?"}
              </span>
            )}
          </div>
        ),
      });
    }

    // ── Type filter selected: show combined counts (includes Holiday) ──────
    const dayData = calendarData[dateStr];
    const activeBadges = [...STATUSES, "Holiday"].filter((s) => (dayData?.[s] || 0) > 0);

    return React.cloneElement(info.originNode, {
      style: { height: "auto", lineHeight: "18px", padding: "3px 0 2px" },
      children: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span>{current.date()}</span>
          {govtBadge}
          {activeBadges.length > 0 && (
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
              {activeBadges.map((s) => (
                <span
                  key={s}
                  title={`${s}: ${dayData[s]}`}
                  style={{
                    backgroundColor: DOT_COLOR[s] || DOT_COLOR.Absent,
                    color: "#fff",
                    fontSize: 7,
                    fontWeight: 700,
                    lineHeight: "10px",
                    padding: "0 2px",
                    borderRadius: 2,
                    letterSpacing: 0,
                  }}
                >
                  {CALENDAR_LETTER[s] || "?"}{dayData[s]}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }, [calendarData, selectedPersonId, personCalendarData, personTypeFilter, holidayMap]);

  const batchInfo = members.batch;
  // If a person is selected, filter the table to show only that person
  const filteredStudents = useMemo(() => {
    if (!selectedPersonId) return members.students;
    const found = members.students.find((s) => s._id === selectedPersonId);
    return found ? [found] : members.students;
  }, [members.students, selectedPersonId]);

  const filteredTeachers = useMemo(() => {
    if (!selectedPersonId) return members.teachers;
    const found = members.teachers.find((t) => t._id === selectedPersonId);
    return found ? [found] : members.teachers;
  }, [members.teachers, selectedPersonId]);

  const areAllVisibleStudentsPresent = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every(
      (student) => (attendanceMap[student._id] || "Absent") === "Present",
    );
  }, [attendanceMap, filteredStudents]);

  const areAllVisibleTeachersPresent = useMemo(() => {
    if (filteredTeachers.length === 0) return false;
    return filteredTeachers.every(
      (teacher) => (attendanceMap[teacher._id] || "Absent") === "Present",
    );
  }, [attendanceMap, filteredTeachers]);

  const handleMarkAllVisibleStudentsPresent = (event) => {
    if (!event?.target?.checked) return;

    setAttendanceMap((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((student) => {
        next[student._id] = "Present";
      });
      return next;
    });
    setDirty(true);
  };

  const handleMarkAllVisibleTeachersPresent = (event) => {
    if (!event?.target?.checked) return;

    setAttendanceMap((prev) => {
      const next = { ...prev };
      filteredTeachers.forEach((teacher) => {
        next[teacher._id] = "Present";
      });
      return next;
    });
    setDirty(true);
  };

  const currentList = useMemo(() => {
    if (personTypeFilter === "student") return filteredStudents;
    if (personTypeFilter === "teacher") return filteredTeachers;
    return activeTab === "student" ? filteredStudents : filteredTeachers;
  }, [activeTab, personTypeFilter, filteredStudents, filteredTeachers]);
  const counts = [...STATUSES, "Holiday"].reduce((acc, s) => {
    acc[s] = currentList.filter((p) => (attendanceMap[p._id] || "Absent") === s).length;
    return acc;
  }, {});

  const studentCols = [
    { title: "#", width: 50, render: (_, __, i) => i + 1 },
    { title: "Name", dataIndex: "name", render: (v) => <span className="font-medium">{v}</span> },
    { title: "Reg. No", dataIndex: "registrationNo" },
    { title: "Gender", dataIndex: "gender", render: (g) => <Tag color={g === "Male" ? "blue" : "pink"}>{g}</Tag> },
    { title: "Mark Attendance", render: (_, r) => <StatusPicker disabled={isAcademyHoliday} value={attendanceMap[r._id] || "Absent"} onChange={(s) => handleStatusChange(r._id, s)} /> },
    {
      title: "Status", width: 130,
      render: (_, r) => (
        <div className="flex flex-col gap-1">
          <StatusTag status={attendanceMap[r._id] || "Absent"} />
          {timeMap[r._id] && (
            <span className="text-[10px] text-gray-400">🕐 {timeMap[r._id]}</span>
          )}
        </div>
      ),
    },
  ];

  const teacherCols = [
    { title: "#", width: 50, render: (_, __, i) => i + 1 },
    { title: "Name", dataIndex: "name", render: (v) => <span className="font-medium">{v}</span> },
    { title: "ID", dataIndex: "teacherId" },
    { title: "Designation", dataIndex: "designation", render: (d) => d || "—" },
    { title: "Gender", dataIndex: "gender", render: (g) => <Tag color={g === "Male" ? "blue" : "pink"}>{g}</Tag> },
    { title: "Mark Attendance", render: (_, r) => <StatusPicker disabled={isAcademyHoliday} value={attendanceMap[r._id] || "Absent"} onChange={(s) => handleStatusChange(r._id, s)} /> },
    {
      title: "Status", width: 130,
      render: (_, r) => (
        <div className="flex flex-col gap-1">
          <StatusTag status={attendanceMap[r._id] || "Absent"} />
          {timeMap[r._id] && (
            <span className="text-[10px] text-gray-400">🕐 {timeMap[r._id]}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* CSS for the attendance DatePicker portal — targets .attend-cal class */}
      <style>{`
        .attend-cal .ant-picker-cell-inner { height: auto !important; min-height: 24px; overflow: visible !important; }
        .attend-cal td.ant-picker-cell { height: auto !important; overflow: visible !important; vertical-align: top !important; }
        .attend-cal .ant-picker-body tbody tr { height: auto !important; }
      `}</style>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-xs font-semibold text-gray-600">Select Batch</label>
          <Select placeholder="Choose a batch" value={selectedBatch}
            onChange={(v) => { setSelectedBatch(v); setAttendanceMap({}); setTimeMap({}); setCalendarData({}); setDirty(false); }}
            showSearch filterOption={(input, o) => o?.label?.toLowerCase().includes(input.toLowerCase())}
            options={batches.map((b) => ({ value: b._id, label: `${b.batchName} (${b.batchCode})` }))}
            className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Select Date {batchInfo && <span className="ml-1 text-blue-500 font-normal">({batchInfo.days})</span>}
          </label>
          <DatePicker
            value={selectedDate}
            onChange={(d) => { if (d) { setSelectedDate(d); setDirty(false); } }}
            onPanelChange={(d) => { if (d && selectedBatch) loadCalendar(selectedBatch, d); }}
            onOpenChange={(open) => { if (open && selectedBatch) loadCalendar(selectedBatch, selectedDate); }}
            disabledDate={(d) => isDisabledDate(d, batchInfo?.days, holidayMap)}
            renderExtraFooter={() =>
              holidayMap.size > 0 ? (
                <div className="text-xs text-gray-500 px-2 py-1">
                  Academy holidays (SH) are disabled and auto-marked. Government holidays (PH) stay selectable when the academy is open.
                </div>
              ) : null
            }
            cellRender={cellRender}
            classNames={{ popup: { root: "attend-cal" } }}
            format="DD MMM YYYY"
            allowClear={false}
          />
        </div>
        {batchInfo && (
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">{batchInfo.shift} Shift</span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded">{batchInfo.days}</span>
            <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">{batchInfo.hoursPerDay}h/day</span>
          </div>
        )}

        {/* ── Person filter: type + name dropdown ── */}
        {selectedBatch && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Filter by Type</label>
              <Segmented
                value={personTypeFilter}
                onChange={handlePersonTypeChange}
                options={[
                  { label: "All", value: "all" },
                  { label: "Students", value: "student" },
                  { label: "Teachers", value: "teacher" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-semibold text-gray-600">
                Filter by Name
                {selectedPersonId && (
                  <button
                    className="ml-2 text-blue-500 font-normal hover:underline"
                    onClick={() => handlePersonSelect(null)}
                  >
                    Clear
                  </button>
                )}
              </label>
              <Select
                placeholder="All people (show combined)"
                value={selectedPersonId}
                onChange={handlePersonSelect}
                allowClear
                showSearch
                filterOption={(input, o) => o?.label?.toLowerCase().includes(input.toLowerCase())}
                options={personDropdownOptions.map((p) => ({
                  value: p._id,
                  label: p.name,
                  title: p.personType === "student"
                    ? `Student · Reg: ${p.registrationNo || "—"}`
                    : `Teacher · ID: ${p.teacherId || "—"}`,
                }))}
                optionRender={(opt) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-[10px] text-gray-400">{opt.data.title}</span>
                  </div>
                )}
                className="w-full"
              />
            </div>
          </>
        )}

      </div>

      {selectedBatch && batchInfo && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {selectedDate.format("dddd, DD MMMM YYYY")}
              </span>
              {isScheduledWorkingDay ? (
                <Tag color="green">Scheduled Working Day</Tag>
              ) : (
                <Tag color="default">Non-Working Day</Tag>
              )}
              {isGovernmentHoliday && <Tag color="orange">Government Holiday</Tag>}
              {isAcademyHoliday && <Tag color="blue">Academy Holiday</Tag>}
            </div>
            <p className="text-sm text-gray-600">
              {isAcademyHoliday
                ? `Attendance is closed for this batch because "${selectedHoliday?.name}" is marked as an academy holiday. All students and teachers are shown as Holiday.`
                : isGovernmentHoliday
                  ? `This date is a government holiday${selectedHoliday?.name ? `: ${selectedHoliday.name}` : ""}, but attendance is still allowed because the academy can remain open.`
                  : isScheduledWorkingDay
                    ? "This is a normal working day for the selected batch. You can mark attendance or turn this date into a holiday for all batches."
                    : "This date is outside the batch schedule, so attendance should not be marked here."}
            </p>
            {selectedHoliday?.reason && (
              <p className="text-xs text-gray-500">Reason: {selectedHoliday.reason}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isScheduledWorkingDay && !isAcademyHoliday && (
              <Button onClick={openHolidayModal} className="border-orange-300 text-orange-600">
                Mark This Day as Global Holiday
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Summary counts */}
      {selectedBatch && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUSES.map((s) => (
            <div key={s} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${STATUS_CONFIG[s].color}`}>
              <span className="text-2xl font-bold">{counts[s]}</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">{s}</span>
                <span className="text-[11px] opacity-70">of {currentList.length}</span>
              </div>
              {STATUS_CONFIG[s].icon}
            </div>
          ))}
          {counts.Holiday > 0 && (
            <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${STATUS_CONFIG.Holiday.color}`}>
              <span className="text-2xl font-bold">{counts.Holiday}</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Holiday</span>
                <span className="text-[11px] opacity-70">of {currentList.length}</span>
              </div>
              {STATUS_CONFIG.Holiday.icon}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {selectedBatch ? (
        <div className="bg-white rounded-xl shadow">
          <Tabs activeKey={activeTab}
            onChange={(k) => { setActiveTab(k); setDirty(false); }}
            className="px-4 pt-2"
            tabBarExtraContent={
              <Button type="primary" icon={<MdSave size={16} />} onClick={handleSave}
                loading={saving} disabled={!dirty || isAcademyHoliday} className="mb-2">
                Save Attendance
              </Button>
            }
            items={[
              {
                key: "student",
                label: <span className="flex items-center gap-1">Students <Badge count={members.students.length} showZero color="#3b82f6" /></span>,
                children: (
                  <Spin spinning={loading}>
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <Checkbox
                        checked={areAllVisibleStudentsPresent}
                        disabled={isAcademyHoliday || filteredStudents.length === 0}
                        onChange={handleMarkAllVisibleStudentsPresent}
                      >
                        Mark all visible students present for today
                      </Checkbox>
                      <span className="text-xs text-gray-500">
                        If you change any student to absent, half day, or leave, this will turn off automatically.
                      </span>
                    </div>
                    <Table dataSource={filteredStudents} columns={studentCols} rowKey="_id"
                      pagination={false} size="middle" locale={{ emptyText: "No students enrolled in this batch" }} />
                  </Spin>
                ),
              },
              {
                key: "teacher",
                label: <span className="flex items-center gap-1">Teachers <Badge count={members.teachers.length} showZero color="#8b5cf6" /></span>,
                children: (
                  <Spin spinning={loading}>
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <Checkbox
                        checked={areAllVisibleTeachersPresent}
                        disabled={isAcademyHoliday || filteredTeachers.length === 0}
                        onChange={handleMarkAllVisibleTeachersPresent}
                      >
                        Mark all visible teachers present for today
                      </Checkbox>
                      <span className="text-xs text-gray-500">
                        If you change any teacher to absent, half day, or leave, this will turn off automatically.
                      </span>
                    </div>
                    <Table dataSource={filteredTeachers} columns={teacherCols} rowKey="_id"
                      pagination={false} size="middle" locale={{ emptyText: "No teachers assigned to this batch's course" }} />
                  </Spin>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <span className="text-5xl">📋</span>
          <p className="text-lg font-medium">Select a batch to mark attendance</p>
          <p className="text-sm">Only working days based on batch schedule are selectable</p>
        </div>
      )}
      <Modal
        title="Create Global Holiday"
        open={holidayModalOpen}
        onOk={handleCreateBatchHoliday}
        onCancel={() => setHolidayModalOpen(false)}
        okText="Create Global Holiday"
        confirmLoading={holidaySaving}
      >
        <div className="space-y-4 pt-2">
          <div className="text-sm text-gray-600">
            This will mark <span className="font-semibold">{selectedDate.format("DD MMM YYYY")}</span> as an academy holiday for <span className="font-semibold">all batches</span> and update all student and teacher attendance records to <span className="font-semibold">Holiday</span>.
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Holiday Name</label>
            <Input
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="e.g. Emergency Closure, Special Event, Local Holiday"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Reason</label>
            <Input.TextArea
              rows={3}
              value={holidayReason}
              onChange={(e) => setHolidayReason(e.target.value)}
              placeholder="Optional note for why this working day is being converted into a holiday"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE HISTORY PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// ── PDF Export ────────────────────────────────────────────────────────────────
const exportAttendancePDF = async ({ historyData, dateRange, batchName, personType }) => {
  try {
    const logoDataUrl = await loadLogoBase64(odysseyLogo);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const colW = pageWidth - margin * 2;

    const fromLabel = dateRange[0].format("DD MMM YYYY");
    const toLabel   = dateRange[1].format("DD MMM YYYY");
    const subtitle  = `Attendance Report — ${batchName}`;

    let y = drawPdfHeader(doc, logoDataUrl, subtitle);

    // ── Meta info strip ──
    setFill(doc, [245, 247, 255]);
    doc.rect(margin, y, colW, 11, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(doc, PDF_COLORS.primary);
    doc.text("Period:", margin + 3, y + 4.5);
    doc.setFont("helvetica", "normal");
    setTxt(doc, PDF_COLORS.dark);
    doc.text(`${fromLabel}  →  ${toLabel}`, margin + 18, y + 4.5);

    doc.setFont("helvetica", "bold");
    setTxt(doc, PDF_COLORS.primary);
    doc.text("Type:", margin + 100, y + 4.5);
    doc.setFont("helvetica", "normal");
    setTxt(doc, PDF_COLORS.dark);
    const typeLabel = personType === "student" ? "Students" : personType === "teacher" ? "Teachers" : "All";
    doc.text(typeLabel, margin + 113, y + 4.5);

    doc.setFont("helvetica", "bold");
    setTxt(doc, PDF_COLORS.primary);
    doc.text("Generated:", margin + 3, y + 9);
    doc.setFont("helvetica", "normal");
    setTxt(doc, PDF_COLORS.dark);
    doc.text(dayjs().format("DD MMM YYYY, HH:mm"), margin + 25, y + 9);
    y += 15;

    // ── Aggregate stat boxes ──
    const stats = (historyData.summary || []).reduce(
      (acc, r) => { acc.Present += r.Present || 0; acc.Absent += r.Absent || 0; acc["Half Day"] += r["Half Day"] || 0; acc.Leave += r.Leave || 0; return acc; },
      { Present: 0, Absent: 0, "Half Day": 0, Leave: 0 }
    );
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const boxes = [
      { label: "Present",  value: stats.Present,      color: PDF_COLORS.presentBg,  fg: PDF_COLORS.presentFg },
      { label: "Absent",   value: stats.Absent,       color: PDF_COLORS.absentBg,   fg: PDF_COLORS.absentFg },
      { label: "Half Day", value: stats["Half Day"],   color: PDF_COLORS.halfDayBg,  fg: PDF_COLORS.halfDayFg },
      { label: "Leave",    value: stats.Leave,         color: PDF_COLORS.leaveBg,    fg: PDF_COLORS.leaveFg },
      { label: "Total",    value: total,               color: PDF_COLORS.primaryLight, fg: PDF_COLORS.primary },
    ];
    const boxW = (colW - 4 * 3) / 5;
    boxes.forEach(({ label, value, color, fg }, i) => {
      const bx = margin + i * (boxW + 3);
      setFill(doc, color);
      doc.roundedRect(bx, y, boxW, 20, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      setTxt(doc, fg);
      doc.text(String(value), bx + boxW / 2, y + 11, { align: "center" });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      setTxt(doc, fg);
      doc.text(label.toUpperCase(), bx + boxW / 2, y + 17, { align: "center" });
    });
    y += 25;

    // ── Summary table (per-person) ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, PDF_COLORS.primary);
    doc.text("ATTENDANCE SUMMARY — PER PERSON", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Name", "ID / Reg No", "Type", "Present", "Absent", "Half Day", "Leave", "Total", "Att. %"]],
      body: (historyData.summary || []).map((r, i) => {
        const pct = r.total ? Math.round(((r.Present || 0) + (r["Half Day"] || 0) * 0.5) / r.total * 100) : 0;
        return [
          i + 1,
          r.name || "—",
          r.identifier || "—",
          r.personType === "student" ? "Student" : "Teacher",
          r.Present || 0,
          r.Absent || 0,
          r["Half Day"] || 0,
          r.Leave || 0,
          r.total || 0,
          `${pct}%`,
        ];
      }),
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: PDF_COLORS.rowAlt },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 9) {
          const pct = parseInt(data.cell.text[0]);
          data.cell.styles.textColor = pct >= 75 ? PDF_COLORS.presentFg : pct >= 50 ? PDF_COLORS.halfDayFg : PDF_COLORS.absentFg;
          data.cell.styles.fontStyle = "bold";
        }
      },
      columnStyles: {
        0: { cellWidth: 8 },
        4: { halign: "center", fillColor: PDF_COLORS.presentBg, textColor: PDF_COLORS.presentFg, fontStyle: "bold" },
        5: { halign: "center", fillColor: PDF_COLORS.absentBg,  textColor: PDF_COLORS.absentFg,  fontStyle: "bold" },
        6: { halign: "center", fillColor: PDF_COLORS.halfDayBg, textColor: PDF_COLORS.halfDayFg, fontStyle: "bold" },
        7: { halign: "center", fillColor: PDF_COLORS.leaveBg,   textColor: PDF_COLORS.leaveFg,   fontStyle: "bold" },
        8: { halign: "center" },
        9: { halign: "center" },
      },
    });

    // ── Day-by-day records (new page) ──
    if ((historyData.records || []).length > 0) {
      doc.addPage();
      let y2 = drawPdfHeader(doc, logoDataUrl, `Day-by-Day Records — ${batchName}`);
      y2 += 4;

      autoTable(doc, {
        startY: y2,
        margin: { left: margin, right: margin },
        head: [["#", "Date", "Name", "ID / Reg No", "Type", "Status", "Notes"]],
        body: (historyData.records || []).map((r, i) => {
          const p = r.person || {};
          return [
            i + 1,
            dayjs(r.date).format("ddd, DD MMM YYYY"),
            p.studentName || p.fullName || "—",
            p.registrationNo || p.teacherId || "—",
            r.personType === "student" ? "Student" : "Teacher",
            r.status || "—",
            r.notes || "",
          ];
        }),
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: PDF_COLORS.rowAlt },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            const status = data.cell.text[0];
            if (STATUS_CELL_COLOR[status]) {
              data.cell.styles.fillColor = STATUS_CELL_COLOR[status];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });
    }

    // ── Footer on each page ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const pageH = doc.internal.pageSize.height;
      setFill(doc, PDF_COLORS.pageBannerBg);
      doc.rect(0, pageH - 10, pageWidth, 10, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      setTxt(doc, PDF_COLORS.pageBannerSub);
      doc.text("ODYSSEY ACADEMY KHIPRO — Confidential", margin, pageH - 4);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageH - 4, { align: "right" });
    }

    doc.save(`Attendance_${batchName.replace(/\s+/g, "_")}_${fromLabel.replace(/\s+/g, "")}_${toLabel.replace(/\s+/g, "")}.pdf`);
    message.success("Attendance PDF downloaded successfully");
  } catch (err) {
    console.error(err);
    message.error("Failed to generate PDF report");
  }
};

// ── Excel Export ──────────────────────────────────────────────────────────────
const exportAttendanceExcel = ({ historyData, dateRange, batchName, personType }) => {
  try {
    const wb = XLSX.utils.book_new();
    const typeLabel = personType === "student" ? "Students" : personType === "teacher" ? "Teachers" : "All";

    // Sheet 1: Summary
    const summaryRows = (historyData.summary || []).map((r, i) => {
      const pct = r.total ? Math.round(((r.Present || 0) + (r["Half Day"] || 0) * 0.5) / r.total * 100) : 0;
      return {
        "#": i + 1,
        "Name": r.name || "—",
        "ID / Reg No": r.identifier || "—",
        "Type": r.personType === "student" ? "Student" : "Teacher",
        "Present": r.Present || 0,
        "Absent": r.Absent || 0,
        "Half Day": r["Half Day"] || 0,
        "Leave": r.Leave || 0,
        "Total Days": r.total || 0,
        "Attendance %": `${pct}%`,
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 9 }, { wch: 11 }, { wch: 13 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2: Day-by-day
    const recordRows = (historyData.records || []).map((r, i) => {
      const p = r.person || {};
      return {
        "#": i + 1,
        "Date": dayjs(r.date).format("DD MMM YYYY"),
        "Day": dayjs(r.date).format("ddd"),
        "Name": p.studentName || p.fullName || "—",
        "ID / Reg No": p.registrationNo || p.teacherId || "—",
        "Type": r.personType === "student" ? "Student" : "Teacher",
        "Status": r.status || "—",
        "Notes": r.notes || "",
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(recordRows);
    ws2["!cols"] = [{ wch: 4 }, { wch: 16 }, { wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Day-by-Day Records");

    // Sheet 3: Meta
    const meta = [
      ["Batch", batchName],
      ["Period", `${dateRange[0].format("DD MMM YYYY")} → ${dateRange[1].format("DD MMM YYYY")}`],
      ["Person Type", typeLabel],
      ["Generated", dayjs().format("DD MMM YYYY, HH:mm")],
      ["Academy", "ODYSSEY ACADEMY KHIPRO"],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(meta);
    XLSX.utils.book_append_sheet(wb, ws3, "Report Info");

    XLSX.writeFile(wb, `Attendance_${batchName.replace(/\s+/g, "_")}_${dateRange[0].format("DDMMMYYYY")}_${dateRange[1].format("DDMMMYYYY")}.xlsx`);
    message.success("Excel report downloaded successfully");
  } catch (err) {
    console.error(err);
    message.error("Failed to generate Excel report");
  }
};

// ── Excel Upload (bulk mark from file) ───────────────────────────────────────
const parseAttendanceExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// ── Single-Person PDF Export ──────────────────────────────────────────────────
const exportSinglePersonPDF = async ({ personSummary, personRecords, dateRange, batchName }) => {
  try {
    const logoDataUrl = await loadLogoBase64(odysseyLogo);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const colW = pageWidth - margin * 2;

    const fromLabel = dateRange[0].format("DD MMM YYYY");
    const toLabel   = dateRange[1].format("DD MMM YYYY");
    const name       = personSummary?.name       || "Unknown";
    const identifier = personSummary?.identifier || "—";
    const pType      = personSummary?.personType === "student" ? "Student" : "Teacher";

    let y = drawPdfHeader(doc, logoDataUrl, `Personal Attendance Report`);

    // ── Person info strip ──
    setFill(doc, [245, 247, 255]);
    doc.rect(margin, y, colW, 22, "F");
    const infoFields = [
      { label: "Name",   value: name,       x: margin + 3,   row: 1 },
      { label: pType === "Student" ? "Reg. No" : "Teacher ID", value: identifier, x: margin + 75, row: 1 },
      { label: "Type",   value: pType,       x: margin + 135, row: 1 },
      { label: "Batch",  value: batchName,   x: margin + 3,   row: 2 },
      { label: "Period", value: `${fromLabel}  →  ${toLabel}`, x: margin + 75, row: 2 },
    ];
    infoFields.forEach(({ label, value, x, row }) => {
      const ry = y + (row === 1 ? 6 : 15);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7);
      setTxt(doc, PDF_COLORS.primary);
      doc.text(label + ":", x, ry);
      doc.setFont("helvetica", "normal");
      setTxt(doc, PDF_COLORS.dark);
      doc.text(value, x + (label.length > 6 ? 18 : 12), ry);
    });
    y += 27;

    // ── Stat boxes ──
    const Present  = personSummary?.Present       || 0;
    const Absent   = personSummary?.Absent        || 0;
    const HalfDay  = personSummary?.["Half Day"]  || 0;
    const Leave    = personSummary?.Leave         || 0;
    const total    = personSummary?.total         || 0;
    const pct      = total ? Math.round((Present + HalfDay * 0.5) / total * 100) : 0;

    const statBoxes = [
      { label: "Present",  value: Present,  color: PDF_COLORS.presentBg,   fg: PDF_COLORS.presentFg },
      { label: "Absent",   value: Absent,   color: PDF_COLORS.absentBg,    fg: PDF_COLORS.absentFg },
      { label: "Half Day", value: HalfDay,  color: PDF_COLORS.halfDayBg,   fg: PDF_COLORS.halfDayFg },
      { label: "Leave",    value: Leave,    color: PDF_COLORS.leaveBg,     fg: PDF_COLORS.leaveFg },
      { label: "Total",    value: total,    color: PDF_COLORS.primaryLight, fg: PDF_COLORS.primary },
    ];
    const boxW = (colW - 4 * 3) / 5;
    statBoxes.forEach(({ label, value, color, fg }, i) => {
      const bx = margin + i * (boxW + 3);
      setFill(doc, color);
      doc.roundedRect(bx, y, boxW, 22, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      setTxt(doc, fg);
      doc.text(String(value), bx + boxW / 2, y + 12, { align: "center" });
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      setTxt(doc, fg);
      doc.text(label.toUpperCase(), bx + boxW / 2, y + 19, { align: "center" });
    });
    y += 28;

    // ── Attendance % bar ──
    const barColor = pct >= 75 ? PDF_COLORS.presentFg : pct >= 50 ? PDF_COLORS.halfDayFg : PDF_COLORS.absentFg;
    setFill(doc, [220, 220, 220]);
    doc.roundedRect(margin, y, colW, 7, 1, 1, "F");
    setFill(doc, barColor);
    if (pct > 0) doc.roundedRect(margin, y, Math.round(colW * pct / 100), 7, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7);
    setTxt(doc, PDF_COLORS.white);
    doc.text(`Attendance Rate: ${pct}%`, margin + colW / 2, y + 5, { align: "center" });
    y += 13;

    // ── Day-by-day table ──
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    setTxt(doc, PDF_COLORS.primary);
    doc.text("DAY-BY-DAY ATTENDANCE RECORDS", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Date", "Day", "Status", "Notes"]],
      body: (personRecords || []).map((r, i) => [
        i + 1,
        dayjs(r.date).format("DD MMM YYYY"),
        dayjs(r.date).format("dddd"),
        r.status || "—",
        r.notes || "",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: "bold" },
      alternateRowStyles: { fillColor: PDF_COLORS.rowAlt },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const s = data.cell.text[0];
          if (STATUS_CELL_COLOR[s]) { data.cell.styles.fillColor = STATUS_CELL_COLOR[s]; data.cell.styles.fontStyle = "bold"; }
        }
      },
      columnStyles: { 0: { cellWidth: 8 }, 3: { halign: "center", cellWidth: 24 } },
    });

    // ── Footer ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const pageH = doc.internal.pageSize.height;
      setFill(doc, PDF_COLORS.pageBannerBg);
      doc.rect(0, pageH - 10, pageWidth, 10, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
      setTxt(doc, PDF_COLORS.pageBannerSub);
      doc.text("ODYSSEY ACADEMY KHIPRO — Confidential", margin, pageH - 4);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageH - 4, { align: "right" });
    }

    doc.save(`Attendance_${name.replace(/\s+/g, "_")}_${fromLabel.replace(/\s+/g, "")}_${toLabel.replace(/\s+/g, "")}.pdf`);
    message.success(`Attendance report for ${name} downloaded successfully`);
  } catch (err) {
    console.error(err);
    message.error("Failed to generate personal attendance PDF");
  }
};

function HistoryPanel({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchName, setBatchName]         = useState("");
  const [dateRange, setDateRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [personType, setPersonType] = useState("all");
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadError, setUploadError]     = useState("");
  const [uploadSaving, setUploadSaving]   = useState(false);
  const [view, setView] = useState("summary");
  const [selectedPersonSearch, setSelectedPersonSearch] = useState(null);
  const [batchMembers, setBatchMembers] = useState({ students: [], teachers: [] });
  const [personPdfLoading, setPersonPdfLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Load batch members when batch changes
  useEffect(() => {
    if (!selectedBatch) { setBatchMembers({ students: [], teachers: [] }); return; }
    getBatchMembers(selectedBatch)
      .then((res) => setBatchMembers(res.data || { students: [], teachers: [] }))
      .catch(() => {});
  }, [selectedBatch]);

  // Person search dropdown options filtered by personType
  const personSearchOptions = useMemo(() => {
    const students = (batchMembers.students || []).map((p) => ({
      value: p._id, label: p.studentName || p.name || "Unknown",
      identifier: p.registrationNo || "", pType: "student",
    }));
    const teachers = (batchMembers.teachers || []).map((p) => ({
      value: p._id, label: p.fullName || p.name || "Unknown",
      identifier: p.teacherId || "", pType: "teacher",
    }));
    if (personType === "student") return students;
    if (personType === "teacher") return teachers;
    return [
      ...students.map((s) => ({ ...s, group: "Students" })),
      ...teachers.map((t) => ({ ...t, group: "Teachers" })),
    ];
  }, [batchMembers, personType]);

  // Filtered history data for selected person
  const filteredSummary = useMemo(() => {
    if (!historyData) return [];
    if (!selectedPersonSearch) return historyData.summary || [];
    return (historyData.summary || []).filter((r) => String(r._id) === String(selectedPersonSearch));
  }, [historyData, selectedPersonSearch]);

  const filteredRecords = useMemo(() => {
    if (!historyData) return [];
    if (!selectedPersonSearch) return historyData.records || [];
    return (historyData.records || []).filter((r) => {
      const pid = typeof r.person === "object" ? r.person?._id : r.person;
      return String(pid) === String(selectedPersonSearch);
    });
  }, [historyData, selectedPersonSearch]);

  const filteredTotalStats = useMemo(() => filteredSummary.reduce(
    (acc, r) => { acc.Present += r.Present || 0; acc.Absent += r.Absent || 0; acc["Half Day"] += r["Half Day"] || 0; acc.Leave += r.Leave || 0; return acc; },
    { Present: 0, Absent: 0, "Half Day": 0, Leave: 0 }
  ), [filteredSummary]);

  const getExportArgs = () => ({
    historyData: { summary: filteredSummary, records: filteredRecords, total: filteredRecords.length },
    dateRange, batchName, personType,
  });

  const fetchHistory = async () => {
    if (!selectedBatch || !dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning("Please select a batch and date range");
      return;
    }
    setLoading(true);
    try {
      const res = await getAttendanceHistory(
        selectedBatch,
        dateRange[0].format("YYYY-MM-DD"),
        dateRange[1].format("YYYY-MM-DD"),
        personType
      );
      setHistoryData(res.data || { records: [], summary: [] });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to fetch history");
    } finally { setLoading(false); }
  };

  // ── Summary table columns (per-person totals) ─────────────────────────────
  const summaryCols = [
    { title: "#", width: 50, render: (_, __, i) => i + 1 },
    {
      title: "Name", dataIndex: "name",
      render: (v) => <span className="font-semibold">{v}</span>,
    },
    {
      title: "ID / Reg No", dataIndex: "identifier",
      render: (v) => <span className="text-gray-500 text-xs">{v || "—"}</span>,
    },
    {
      title: "Type", dataIndex: "personType",
      render: (t) => <Tag color={t === "student" ? "blue" : "purple"}>{t === "student" ? "Student" : "Teacher"}</Tag>,
    },
    {
      title: <span className="text-green-600">✅ Present</span>,
      dataIndex: "Present",
      render: (v) => <span className="font-bold text-green-600">{v || 0}</span>,
      sorter: (a, b) => (a.Present || 0) - (b.Present || 0),
    },
    {
      title: <span className="text-red-500">❌ Absent</span>,
      dataIndex: "Absent",
      render: (v) => <span className="font-bold text-red-500">{v || 0}</span>,
      sorter: (a, b) => (a.Absent || 0) - (b.Absent || 0),
    },
    {
      title: <span className="text-yellow-500">🕐 Half Day</span>,
      dataIndex: "Half Day",
      render: (v) => <span className="font-bold text-yellow-500">{v || 0}</span>,
    },
    {
      title: <span className="text-blue-500">🏖 Leave</span>,
      dataIndex: "Leave",
      render: (v) => <span className="font-bold text-blue-500">{v || 0}</span>,
    },
    {
      title: "Total Days",
      dataIndex: "total",
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Attendance %",
      render: (_, r) => {
        const total = r.total || 0;
        if (!total) return "—";
        const pct = Math.round(((r.Present || 0) + (r["Half Day"] || 0) * 0.5) / total * 100);
        const color = pct >= 75 ? "green" : pct >= 50 ? "orange" : "red";
        return <Tag color={color}>{pct}%</Tag>;
      },
      sorter: (a, b) => {
        const pctA = a.total ? ((a.Present || 0) + (a["Half Day"] || 0) * 0.5) / a.total : 0;
        const pctB = b.total ? ((b.Present || 0) + (b["Half Day"] || 0) * 0.5) / b.total : 0;
        return pctA - pctB;
      },
    },
  ];

  // ── Day-by-day records table ──────────────────────────────────────────────
  const recordsCols = [
    { title: "#", width: 50, render: (_, __, i) => i + 1 },
    {
      title: "Date & Status",
      dataIndex: "date",
      render: (d, r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{dayjs(d).format("ddd, DD MMM YYYY")}</span>
          <StatusTag status={r.status} />
        </div>
      ),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      filters: STATUSES.map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Name",
      render: (_, r) => {
        const p = r.person || {};
        return <span className="font-medium">{p.studentName || p.fullName || "—"}</span>;
      },
    },
    {
      title: "ID / Reg No",
      render: (_, r) => {
        const p = r.person || {};
        return <span className="text-gray-500 text-xs">{p.registrationNo || p.teacherId || "—"}</span>;
      },
    },
    {
      title: "Type", dataIndex: "personType",
      render: (t) => <Tag color={t === "student" ? "blue" : "purple"}>{t === "student" ? "Student" : "Teacher"}</Tag>,
    },
    {
      title: "Notes", dataIndex: "notes",
      render: (n) => n || <span className="text-gray-300">—</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-xs font-semibold text-gray-600">Select Batch</label>
          <Select placeholder="Choose a batch" value={selectedBatch}
            onChange={(v, opt) => { setSelectedBatch(v); setBatchName(opt?.label || ""); setHistoryData(null); }}
            showSearch filterOption={(input, o) => o?.label?.toLowerCase().includes(input.toLowerCase())}
            options={batches.map((b) => ({ value: b._id, label: `${b.batchName} (${b.batchCode})` }))}
            className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Date Range (From → To)</label>
          <RangePicker value={dateRange} onChange={(r) => { setDateRange(r); setHistoryData(null); }}
            format="DD MMM YYYY" allowClear={false} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Person Type</label>
          <Segmented value={personType} onChange={(v) => { setPersonType(v); setSelectedPersonSearch(null); setHistoryData(null); }}
            options={[
              { label: "All", value: "all" },
              { label: "Students", value: "student" },
              { label: "Teachers", value: "teacher" },
            ]} />
        </div>
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-xs font-semibold text-gray-600">
            Search Person
            {selectedPersonSearch && (
              <span
                className="ml-2 text-blue-500 cursor-pointer font-normal"
                onClick={() => setSelectedPersonSearch(null)}
              >✕ Clear</span>
            )}
          </label>
          <Select
            allowClear
            showSearch
            placeholder={selectedBatch ? "All people (optional)" : "Select a batch first"}
            disabled={!selectedBatch}
            value={selectedPersonSearch}
            onChange={(v) => setSelectedPersonSearch(v || null)}
            filterOption={(input, o) =>
              o?.label?.toLowerCase().includes(input.toLowerCase()) ||
              o?.identifier?.toLowerCase().includes(input.toLowerCase())
            }
            options={personSearchOptions}
            optionRender={(opt) => (
              <div>
                <div className="font-medium text-sm">{opt.data.label}</div>
                <div className="text-[11px] text-gray-400">{opt.data.identifier} · {opt.data.pType === "student" ? "Student" : "Teacher"}</div>
              </div>
            )}
            className="w-full"
          />
        </div>
        <Button type="primary" icon={<MdHistory size={16} />} onClick={fetchHistory} loading={loading}>
          View History
        </Button>
        {historyData && (
          <div className="flex gap-2 flex-wrap">
            <Button
              icon={<FaFilePdf size={14} />}
              loading={pdfLoading}
              style={{ background: "#ef4444", color: "#fff", border: "none" }}
              onClick={async () => { setPdfLoading(true); await exportAttendancePDF(getExportArgs()); setPdfLoading(false); }}
            >
              {selectedPersonSearch ? "Person PDF" : "PDF Report"}
            </Button>
            <Button
              icon={<FaFileExcel size={14} />}
              loading={xlsLoading}
              style={{ background: "#16a34a", color: "#fff", border: "none" }}
              onClick={() => { setXlsLoading(true); exportAttendanceExcel(getExportArgs()); setXlsLoading(false); }}
            >
              Excel Report
            </Button>
            {selectedPersonSearch && filteredSummary.length > 0 && (
              <Button
                icon={<FaFilePdf size={14} />}
                loading={personPdfLoading}
                style={{ background: "#7c3aed", color: "#fff", border: "none" }}
                onClick={async () => {
                  setPersonPdfLoading(true);
                  await exportSinglePersonPDF({
                    personSummary: filteredSummary[0],
                    personRecords: filteredRecords,
                    dateRange,
                    batchName,
                  });
                  setPersonPdfLoading(false);
                }}
              >
                Detailed Person PDF
              </Button>
            )}
          </div>
        )}
        <Button
          icon={<MdUpload size={16} />}
          onClick={() => setUploadVisible(true)}
          disabled={!selectedBatch}
          className="ml-auto"
        >
          Upload Attendance (Excel)
        </Button>
      </div>

      {/* ── Excel Upload Modal ─────────────────────────────────────────────── */}
      <Modal
        open={uploadVisible}
        onCancel={() => { setUploadVisible(false); setUploadPreview([]); setUploadError(""); }}
        title={<span className="flex items-center gap-2"><FaFileExcel className="text-green-600" /> Upload Attendance via Excel</span>}
        width={700}
        footer={null}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <b>Required columns:</b> <code>date</code> (YYYY-MM-DD), <code>personId</code>, <code>personType</code> (student/teacher), <code>status</code> (Present/Absent/Half Day/Leave)
          </div>
          <div className="flex gap-3 items-center">
            <Button icon={<FaFileExcel size={14} />} onClick={() => {
              const ws = XLSX.utils.aoa_to_sheet([
                ["date", "personId", "personType", "status", "notes"],
                ["2026-04-21", "PERSON_ID_HERE", "student", "Present", ""],
              ]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Attendance");
              XLSX.writeFile(wb, "attendance_upload_template.xlsx");
            }}>Download Template</Button>
            <Button type="primary" icon={<MdUpload size={16} />} onClick={() => fileInputRef.current?.click()}>
              Choose Excel File
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadError("");
              try {
                const rows = await parseAttendanceExcel(file);
                const required = ["date", "personId", "personType", "status"];
                const keys = Object.keys(rows[0] || {});
                const missing = required.filter((k) => !keys.includes(k));
                if (missing.length) { setUploadError(`Missing columns: ${missing.join(", ")}`); setUploadPreview([]); return; }
                setUploadPreview(rows.slice(0, 10));
              } catch { setUploadError("Failed to parse file. Please use the provided template."); }
              e.target.value = "";
            }} />
          {uploadError && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">{uploadError}</div>}
          {uploadPreview.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Preview (first {uploadPreview.length} rows):</p>
              <Table
                size="small"
                pagination={false}
                dataSource={uploadPreview.map((r, i) => ({ key: i, ...r }))}
                columns={Object.keys(uploadPreview[0]).map((k) => ({ title: k, dataIndex: k, key: k, ellipsis: true }))}
                scroll={{ x: true }}
              />
              <div className="flex justify-end mt-3">
                <Button type="primary" loading={uploadSaving}
                  onClick={async () => {
                    setUploadSaving(true);
                    try {
                      // Group by date and submit as bulk
                      const byDate = {};
                      uploadPreview.forEach((r) => {
                        if (!byDate[r.date]) byDate[r.date] = [];
                        byDate[r.date].push({ personId: r.personId, personType: r.personType, status: r.status, notes: r.notes || "" });
                      });
                      for (const [date, records] of Object.entries(byDate)) {
                        await bulkMarkAttendance({ batchId: selectedBatch, date, records });
                      }
                      message.success("Attendance uploaded successfully");
                      setUploadVisible(false);
                      setUploadPreview([]);
                    } catch (err) {
                      message.error(err?.response?.data?.message || "Upload failed");
                    } finally { setUploadSaving(false); }
                  }}
                >Save Uploaded Attendance</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Results */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-16 flex justify-center">
          <Spin size="large" />
        </div>
      )}

      {!loading && historyData && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUSES.map((s) => (
              <div key={s} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${STATUS_CONFIG[s].color}`}>
                <span className="text-2xl font-bold">{filteredTotalStats[s]}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">{s}</span>
                  <span className="text-[11px] opacity-70">total entries</span>
                </div>
                {STATUS_CONFIG[s].icon}
              </div>
            ))}
          </div>

          {/* View switcher + table */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-semibold text-gray-700">
                  {dateRange[0].format("DD MMM YYYY")} → {dateRange[1].format("DD MMM YYYY")}
                </span>
                <span className="ml-3 text-gray-400 text-sm">
                  {filteredSummary.length} person(s) · {filteredRecords.length} records
                  {selectedPersonSearch && filteredSummary[0] && (
                    <Tag color="purple" className="ml-2">{filteredSummary[0].name}</Tag>
                  )}
                </span>
              </div>
              <Segmented value={view} onChange={setView}
                options={[
                  { label: "📊 Summary (per person)", value: "summary" },
                  { label: "📅 Day-by-Day Records", value: "records" },
                ]} />
            </div>

            {view === "summary" ? (
              <Table
                dataSource={filteredSummary}
                columns={summaryCols}
                rowKey="_id"
                pagination={{ pageSize: 20 }}
                size="middle"
                locale={{ emptyText: "No attendance records found for this range" }}
              />
            ) : (
              <Table
                dataSource={filteredRecords}
                columns={recordsCols}
                rowKey={(r) => `${r._id}`}
                pagination={{ pageSize: 20 }}
                size="middle"
                locale={{ emptyText: "No attendance records found for this range" }}
              />
            )}
          </div>
        </>
      )}

      {!loading && !historyData && (
        <div className="bg-white rounded-xl shadow p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <span className="text-5xl">🗓️</span>
          <p className="text-lg font-medium">Select a batch and date range, then click "View History"</p>
          <p className="text-sm">You can view per-person summaries or day-by-day records</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Attendance() {
  const [batches, setBatches] = useState([]);
  const [mainTab, setMainTab] = useState("mark");

  useEffect(() => {
    getAllBatches()
      .then((res) => setBatches(res.data || res.batches || []))
      .catch(() => message.error("Failed to load batches"));
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="module-title">Attendance</h2>
          <p className="module-subtitle">Mark and review student & teacher attendance per batch</p>
        </div>
      </div>

      {/* Main tab switcher */}
      <Tabs activeKey={mainTab} onChange={setMainTab}
        type="card"
        items={[
          {
            key: "mark",
            label: <span className="flex items-center gap-2"><MdFactCheck size={18} />Mark Attendance</span>,
            children: <MarkAttendancePanel batches={batches} />,
          },
          {
            key: "history",
            label: <span className="flex items-center gap-2"><MdHistory size={18} />Attendance History</span>,
            children: <HistoryPanel batches={batches} />,
          },
          {
            key: "monthly",
            label: <span className="flex items-center gap-2"><MdDownload size={18} />Monthly Report</span>,
            children: <MonthlyAttendanceReport batches={batches} />,
          },
        ]}
      />
    </div>
  );
}

