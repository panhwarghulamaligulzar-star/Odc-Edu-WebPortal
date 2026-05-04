import React, { useState, useCallback, useMemo } from "react";
import {
  Select, DatePicker, Button, Spin, Tabs, Tooltip, message, Tag,
} from "antd";
import {
  MdCheckCircle, MdCancel, MdPublic, MdSchool, MdCalendarToday, MdDownload,
} from "react-icons/md";
import { BsPersonFill } from "react-icons/bs";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import odysseyLogo from "../../assets/images/logos/LOGO.png";
import { getWorkingDaysWithHolidays } from "../../services/holidayService";
import { getAttendanceHistory } from "../../services/attendanceService";

// ── Day status types ───────────────────────────────────────────────────────────
const DAY_STATUS = {
  present:          { label: "Present",          color: "bg-green-100  text-green-700  border-green-300",  icon: "✅", dot: "#22c55e" },
  absent:           { label: "Absent",           color: "bg-red-100    text-red-700    border-red-300",    icon: "❌", dot: "#ef4444" },
  half_day:         { label: "Half Day",         color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: "🟡", dot: "#eab308" },
  leave:            { label: "Leave",            color: "bg-purple-100 text-purple-700 border-purple-300", icon: "📋", dot: "#8b5cf6" },
  holiday_govt:     { label: "Govt. Holiday",    color: "bg-orange-100 text-orange-700 border-orange-300", icon: "🟠", dot: "#f97316" },
  holiday_academy:  { label: "School Holiday",   color: "bg-sky-100    text-sky-700    border-sky-300",    icon: "🔵", dot: "#0ea5e9" },
  non_class:        { label: "Non-Class Day",    color: "bg-gray-100   text-gray-400   border-gray-200",   icon: "⚪", dot: "#d1d5db" },
  future:           { label: "Not Taken Yet",    color: "bg-gray-50    text-gray-300   border-gray-100",   icon: "·",  dot: "#f3f4f6" },
};

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Days after today haven't had attendance taken yet
const TODAY = dayjs().format("YYYY-MM-DD");

// ── PDF helpers (reuse pattern from Attendance.jsx) ──────────────────────────
const PDF_COLORS = {
  primary:      [15, 40, 100],
  pageBannerBg: [235, 241, 255],
  pageBannerTitle: [10, 30, 90],
  pageBannerSub:   [80, 100, 150],
  white:        [255, 255, 255],
  rowAlt:       [247, 249, 253],
  pillBg:       [30, 70, 160],
  pillTxt:      [255, 255, 255],
};
const setFill = (doc, rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setTxt  = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

const loadLogoBase64 = async (src) => {
  try {
    const res  = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
  } catch { return null; }
};

const drawHeader = (doc, logo, subtitle = "") => {
  const pw = doc.internal.pageSize.width;
  const barH = 50;
  setFill(doc, PDF_COLORS.pageBannerBg);
  doc.rect(0, 0, pw, barH, "F");
  if (logo) doc.addImage(logo, "PNG", 14, (barH - 45) / 2, 45, 45);
  const cx = pw / 2;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  setTxt(doc, PDF_COLORS.pageBannerTitle);
  doc.text("ODYSSEY ACADEMY KHIPRO", cx, 16, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  setTxt(doc, PDF_COLORS.pageBannerSub);
  doc.text("Bin Muqarab Colony, Main 7G Road, Khipro", cx, 22, { align: "center" });
  doc.text("Email: askodysseyacademy@gmail.com  |  Phone: +923492425428", cx, 28, { align: "center" });
  if (subtitle) {
    setFill(doc, PDF_COLORS.pillBg);
    const pw2 = 100, ph = 8, px = (pw - pw2) / 2;
    doc.roundedRect(px, 40, pw2, ph, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    setTxt(doc, PDF_COLORS.pillTxt);
    doc.text(subtitle.toUpperCase(), cx, 45.2, { align: "center" });
  }
  return barH + 4;
};

// ── MonthlyAttendanceReport ───────────────────────────────────────────────────
export default function MonthlyAttendanceReport({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [personType, setPersonType]       = useState("student");
  const [reportData, setReportData]       = useState(null);
  const [loading, setLoading]             = useState(false);

  // ── Build report ──────────────────────────────────────────────────────────
  const generateReport = useCallback(async () => {
    if (!selectedBatch) { message.warning("Select a batch first"); return; }
    setLoading(true);
    try {
      const year  = selectedMonth.year();
      const month = selectedMonth.month() + 1;

      const from = dayjs(selectedMonth).startOf("month").format("YYYY-MM-DD");
      const to   = dayjs(selectedMonth).endOf("month").format("YYYY-MM-DD");

      // Fetch working-days breakdown + attendance history in parallel
      const [wdRes, histRes] = await Promise.all([
        getWorkingDaysWithHolidays(selectedBatch, year, month),
        getAttendanceHistory(selectedBatch, from, to, personType),
      ]);

      const wd      = wdRes.data;
      const history = histRes.data;

      if (!wd || !wd.batchDays) {
        throw new Error("Could not load working-days data for this batch. Make sure the server is running the latest code.");
      }

      // Build per-person per-day attendance lookup: { personId: { "YYYY-MM-DD": status } }
      const lookup = {};
      (history.records || []).forEach((r) => {
        const pid = String(r.person?._id || r.person);
        if (!lookup[pid]) lookup[pid] = {};
        const d = new Date(r.date);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        lookup[pid][ds] = r.status;
      });

      // Build day metadata for every calendar day in month
      const daysInMonth = new Date(year, month, 0).getDate();
      const DOW_MAP_BATCH = {
        "Monday to Saturday": [1, 2, 3, 4, 5, 6],
        "Monday to Thursday": [1, 2, 3, 4],
        "Saturday & Sunday":  [6, 0],
      };
      const dowSet = new Set(DOW_MAP_BATCH[wd.batchDays] || []);
      const holidayMap = wd.holidayMap || {};

      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const ds   = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const dow  = date.getDay();
        let dayType;
        if (!dowSet.has(dow)) {
          dayType = "non_class";
        } else if (holidayMap[ds]) {
          dayType = holidayMap[ds].type === "government" ? "holiday_govt" : "holiday_academy";
        } else {
          dayType = "working"; // filled in per-person below
        }
        days.push({ d, ds, dow, dayType, holidayInfo: holidayMap[ds] || null });
      }

      setReportData({
        year, month, wd, days,
        persons: history.summary || [],
        lookup,
        batchName: batches.find((b) => b._id === selectedBatch)?.batchName || "Batch",
      });
    } catch (err) {
      message.error("Failed to generate report");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedMonth, personType, batches]);

  // ── Per-person day status ──────────────────────────────────────────────────
  const getPersonDayStatus = (personId, day) => {
    // Non-class days and holidays take priority over any attendance record
    if (day.dayType === "non_class")        return "non_class";
    if (day.dayType === "holiday_govt")     return "holiday_govt";
    if (day.dayType === "holiday_academy")  return "holiday_academy";
    const raw = reportData?.lookup?.[personId]?.[day.ds];
    if (!raw) {
      // Future working days: attendance hasn't been taken yet — don't count as absent
      if (day.ds > TODAY) return "future";
      return "absent";
    }
    if (raw === "Present")  return "present";
    if (raw === "Absent")   return "absent";
    if (raw === "Half Day") return "half_day";
    if (raw === "Leave")    return "leave";
    if (raw === "Holiday")  return day.dayType === "holiday_govt" ? "holiday_govt" : "holiday_academy";
    return "absent";
  };

  // ── Summary for a person ──────────────────────────────────────────────────
  const personSummary = (personId) => {
    if (!reportData) return {};
    const wd = reportData.wd;
    const totalWorking = wd.totalWorkingDays;
    let present = 0, absent = 0, halfDay = 0, leave = 0;
    reportData.days.forEach((day) => {
      const s = getPersonDayStatus(personId, day);
      if (s === "present")  present++;
      if (s === "absent")   absent++;  // only PAST unrecorded working days
      if (s === "half_day") halfDay++;
      if (s === "leave")    leave++;
      // "future", "non_class", "holiday_govt", "holiday_academy" are NOT counted
    });
    // Att% is based on past working days only (excludes future unrecorded days)
    const futureWorking = reportData.days.filter((d) => d.dayType === "working" && d.ds > TODAY).length;
    const pastWorking   = totalWorking - futureWorking;
    const effectivePresent = present + halfDay * 0.5;
    const attPct = pastWorking ? Math.round((effectivePresent / pastWorking) * 100) : 0;
    return { totalWorking, pastWorking, present, absent, halfDay, leave, attPct };
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = useCallback(async (targetPersonId = null) => {
    if (!reportData) return;
    const logo  = await loadLogoBase64(odysseyLogo);
    const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pw    = doc.internal.pageSize.width;
    const margin = 14;

    const persons = targetPersonId
      ? reportData.persons.filter((p) => String(p._id) === String(targetPersonId))
      : reportData.persons;

    let y = drawHeader(doc, logo, `Monthly Attendance — ${reportData.batchName} — ${dayjs(`${reportData.year}-${reportData.month}-01`).format("MMMM YYYY")}`);

    // Summary table header
    const workingDays = reportData.days.filter((d) => d.dayType === "working");
    const cols = ["#", "Name", "ID/Reg", ...workingDays.map((d) => `${d.d}\n${DOW_LABEL[d.dow]}`), "P", "A", "HD", "Att%"];

    const body = persons.map((person, i) => {
      const pid = String(person._id);
      const sm  = personSummary(pid);
      const cells = workingDays.map((day) => {
        const s = getPersonDayStatus(pid, day);
        return s === "present" ? "P" : s === "absent" ? "A" : s === "half_day" ? "H" : s === "leave" ? "L" : "-";
      });
      return [i + 1, person.name || "—", person.identifier || "—", ...cells, sm.present, sm.absent, sm.halfDay, `${sm.attPct}%`];
    });

    autoTable(doc, {
      startY: y + 2,
      margin: { left: margin, right: margin },
      head: [cols],
      body,
      styles: { fontSize: 6, cellPadding: 1.5, halign: "center" },
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: "bold", fontSize: 6 },
      alternateRowStyles: { fillColor: PDF_COLORS.rowAlt },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 30, halign: "left" },
        2: { cellWidth: 18, halign: "left" },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const v = data.cell.text[0];
          if (v === "P") { data.cell.styles.fillColor = [240, 253, 244]; data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fontStyle = "bold"; }
          if (v === "A") { data.cell.styles.fillColor = [255, 241, 242]; data.cell.styles.textColor = [220, 38, 38];  data.cell.styles.fontStyle = "bold"; }
          if (v === "H") { data.cell.styles.fillColor = [255, 253, 235]; data.cell.styles.textColor = [161, 98, 7];   data.cell.styles.fontStyle = "bold"; }
          if (v === "L") { data.cell.styles.fillColor = [239, 246, 255]; data.cell.styles.textColor = [37, 99, 235];  data.cell.styles.fontStyle = "bold"; }
          // Attendance % column coloring
          const lastColIdx = cols.length - 1;
          if (data.column.index === lastColIdx) {
            const pct = parseInt(v);
            data.cell.styles.textColor = pct >= 75 ? [22, 163, 74] : pct >= 50 ? [161, 98, 7] : [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const ph = doc.internal.pageSize.height;
      setFill(doc, PDF_COLORS.pageBannerBg);
      doc.rect(0, ph - 10, pw, 10, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
      setTxt(doc, PDF_COLORS.pageBannerSub);
      doc.text("ODYSSEY ACADEMY KHIPRO — Confidential", margin, ph - 4);
      doc.text(`Page ${p} of ${totalPages}`, pw - margin, ph - 4, { align: "right" });
    }

    doc.save(`Monthly_Report_${reportData.batchName}_${reportData.year}_${String(reportData.month).padStart(2,"0")}.pdf`);
    message.success("PDF downloaded");
  }, [reportData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────
  const workingDaysInMonth = reportData?.days.filter((d) => d.dayType === "working") || [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-xs font-semibold text-gray-600">Select Batch</label>
          <Select
            placeholder="Choose a batch"
            value={selectedBatch}
            onChange={(v) => { setSelectedBatch(v); setReportData(null); }}
            showSearch
            filterOption={(input, o) => o?.label?.toLowerCase().includes(input.toLowerCase())}
            options={batches.map((b) => ({ value: b._id, label: `${b.batchName} (${b.batchCode})` }))}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Month</label>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(d) => { if (d) { setSelectedMonth(d); setReportData(null); } }}
            format="MMM YYYY"
            allowClear={false}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Person Type</label>
          <Select
            value={personType}
            onChange={(v) => { setPersonType(v); setReportData(null); }}
            options={[
              { value: "student", label: "Students" },
              { value: "teacher", label: "Teachers" },
            ]}
            style={{ width: 130 }}
          />
        </div>
        <Button type="primary" onClick={generateReport} loading={loading}>
          Generate Report
        </Button>
        {reportData && (
          <Button icon={<MdDownload size={16} />} onClick={() => exportPDF()}>
            Export PDF
          </Button>
        )}
      </div>

      {/* Month summary cards */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Calendar Days",   value: reportData.days.length,                                                    color: "bg-gray-50   border-gray-300   text-gray-700"   },
            { label: "Non-Class Days",  value: reportData.wd.totalNonClassDays,                                            color: "bg-gray-100  border-gray-300   text-gray-500"   },
            { label: "Govt. Holidays",  value: reportData.days.filter((d) => d.dayType === "holiday_govt").length,         color: "bg-orange-50 border-orange-300 text-orange-700" },
            { label: "School Holidays", value: reportData.days.filter((d) => d.dayType === "holiday_academy").length,      color: "bg-sky-50    border-sky-300    text-sky-700"    },
            { label: "Working Days",    value: reportData.wd.totalWorkingDays,                                             color: "bg-green-50  border-green-300  text-green-700"  },
            { label: "Persons",         value: reportData.persons.length,                                                  color: "bg-purple-50 border-purple-300 text-purple-700" },
            { label: "Month",           value: dayjs(`${reportData.year}-${reportData.month}-01`).format("MMM YYYY"),      color: "bg-indigo-50 border-indigo-300 text-indigo-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 ${color}`}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs mt-0.5 opacity-80">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Day-status legend */}
      {reportData && (
        <div className="bg-white rounded-xl shadow p-3 flex flex-wrap gap-2 text-xs">
          {Object.entries(DAY_STATUS).map(([k, v]) => (
            <span key={k} className={`flex items-center gap-1 px-2 py-1 rounded border ${v.color}`}>
              {v.icon} {v.label}
            </span>
          ))}
        </div>
      )}

      {/* Monthly calendar-style table per person */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-16 flex justify-center">
          <Spin size="large" />
        </div>
      )}

      {reportData && !loading && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0f2864] text-white">
                <th className="px-3 py-2 text-left sticky left-0 bg-[#0f2864] z-10 min-w-[40px]">#</th>
                <th className="px-3 py-2 text-left sticky left-10 bg-[#0f2864] z-10 min-w-[160px]">Name</th>
                <th className="px-3 py-2 text-left sticky left-44 bg-[#0f2864] z-10 min-w-[90px]">ID / Reg</th>
                {/* All calendar days */}
                {reportData.days.map((day) => {
                  const isWorking    = day.dayType === "working";
                  const isGovt       = day.dayType === "holiday_govt";
                  const isAca        = day.dayType === "holiday_academy";
                  const isNonClass   = day.dayType === "non_class";
                  return (
                    <Tooltip
                      key={day.d}
                      title={
                        isGovt ? `Public Holiday – ${day.holidayInfo?.name || ""}` :
                        isAca  ? `School Holiday – ${day.holidayInfo?.name || ""} ${day.holidayInfo?.reason ? `(${day.holidayInfo.reason})` : ""}` :
                        isNonClass ? "Not a class day" :
                        DOW_LABEL[day.dow]
                      }
                    >
                      <th
                        className={`px-1 py-2 text-center font-semibold min-w-[28px] border-l border-[#1e3a8a]
                          ${isNonClass ? "bg-gray-600 opacity-70" : ""}
                          ${isGovt    ? "bg-orange-600" : ""}
                          ${isAca     ? "bg-blue-600" : ""}
                        `}
                      >
                        <div>{day.d}</div>
                        <div className="text-[9px] opacity-80">{DOW_LABEL[day.dow]}</div>
                      </th>
                    </Tooltip>
                  );
                })}
                {/* Summary columns */}
                <th className="px-2 py-2 text-center min-w-[30px] border-l-2 border-gray-400">P</th>
                <th className="px-2 py-2 text-center min-w-[30px]">A</th>
                <th className="px-2 py-2 text-center min-w-[30px]">HD</th>
                <th className="px-2 py-2 text-center min-w-[30px]">L</th>
                <th className="px-2 py-2 text-center min-w-[40px]">Att%</th>
                <th className="px-2 py-2 text-center min-w-[40px]">PDF</th>
              </tr>
            </thead>
            <tbody>
              {reportData.persons.map((person, idx) => {
                const pid = String(person._id);
                const sm  = personSummary(pid);
                return (
                  <tr key={pid} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 sticky left-0 z-10 bg-inherit border-b border-gray-100">{idx + 1}</td>
                    <td className="px-3 py-2 sticky left-10 z-10 bg-inherit font-medium border-b border-gray-100 whitespace-nowrap">{person.name}</td>
                    <td className="px-3 py-2 sticky left-44 z-10 bg-inherit text-gray-500 border-b border-gray-100 whitespace-nowrap">{person.identifier}</td>
                    {reportData.days.map((day) => {
                      const status = getPersonDayStatus(pid, day);
                      const cfg    = DAY_STATUS[status] || DAY_STATUS.future;
                      const tooltip =
                        day.dayType === "holiday_govt"    ? `Public Holiday – ${day.holidayInfo?.name || ""}` :
                        day.dayType === "holiday_academy" ? `School Holiday – ${day.holidayInfo?.name || ""}${day.holidayInfo?.reason ? ` (${day.holidayInfo.reason})` : ""}` :
                        day.dayType === "non_class"       ? "Not a class day" :
                        status === "future"               ? "Attendance not taken yet" :
                        cfg.label;
                      const cellLabel =
                        status === "present"         ? "P" :
                        status === "absent"          ? "A" :
                        status === "half_day"        ? "H" :
                        status === "leave"           ? "L" :
                        status === "holiday_govt"    ? "G" :
                        status === "holiday_academy" ? "S" :
                        status === "non_class"       ? "–" :
                        status === "future"          ? "·" : "";
                      return (
                        <Tooltip key={day.d} title={tooltip}>
                          <td className={`text-center border-b border-l border-gray-100 ${cfg.color}`}>
                            <span className={`text-[10px] font-bold ${status === "future" ? "opacity-40" : ""}`}>
                              {cellLabel}
                            </span>
                          </td>
                        </Tooltip>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-green-700  border-b border-gray-100 border-l-2 border-l-gray-300">{sm.present}</td>
                    <td className="px-2 py-2 text-center font-bold text-red-600    border-b border-gray-100">{sm.absent}</td>
                    <td className="px-2 py-2 text-center font-bold text-yellow-600  border-b border-gray-100">{sm.halfDay}</td>
                    <td className="px-2 py-2 text-center font-bold text-purple-600  border-b border-gray-100">{sm.leave}</td>
                    <td className={`px-2 py-2 text-center font-bold border-b border-gray-100 ${sm.attPct >= 75 ? "text-green-700" : sm.attPct >= 50 ? "text-yellow-700" : "text-red-700"}`}>
                      {sm.attPct}%
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-100">
                      <Tooltip title="Export individual PDF">
                        <button
                          onClick={() => exportPDF(pid)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <MdDownload size={14} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend + note */}
      {reportData && (
        <div className="bg-white rounded-xl shadow p-3 text-xs text-gray-500">
          <span className="font-semibold text-gray-700 mr-2">Legend:</span>
          <b>P</b>=Present &nbsp; <b>A</b>=Absent &nbsp; <b>H</b>=Half Day &nbsp; <b>L</b>=Leave &nbsp;
          <b className="text-orange-600">G</b>=Govt. Holiday &nbsp;
          <b className="text-sky-600">S</b>=School Holiday &nbsp;
          <b className="text-gray-400">–</b>=Non-Class &nbsp;
          <b className="text-gray-300">·</b>=Not Taken Yet
          <span className="ml-3 text-gray-400">Att% = (P + H×0.5) ÷ Past Working Days × 100</span>
        </div>
      )}

      {!reportData && !loading && (
        <div className="bg-white rounded-xl shadow p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <MdCalendarToday size={48} />
          <p className="text-lg font-medium">Select batch and month, then click Generate Report</p>
        </div>
      )}
    </div>
  );
}
