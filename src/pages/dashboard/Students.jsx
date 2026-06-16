import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import {
  Card,
  Button,
  Collapse,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Radio,
  message,
  Empty,
  Tag,
  Tooltip,
  Avatar,
  Badge,
  Upload,
  Table,
  Space,
  Divider,
  Row,
  Col,
  Tabs,
} from "antd";
import CourseAssignmentForm from "../../components/forms/CourseAssignmentForm";
import StudentFeeProfile from "./StudentFeeProfile";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUser,
  FaIdCard,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaDollarSign,
  FaFileDownload,
  FaUserPlus,
  FaMale,
  FaFemale,
  FaCalendar,
  FaBook,
  FaCamera,
  FaSearch,
  FaFilter,
  FaEye,
  FaChalkboardTeacher,
  FaFileImport,
  FaFileExcel,
} from "react-icons/fa";
import api from "../../api/axiosInstance";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { MdPeople } from "react-icons/md";
import academyConfig from "../../config/academyConfig";
import odysseyLogo from "../../assets/images/logos/LOGO.png";
import { useModulePermissions } from "../../hooks/usePermissions";
import { updateEnrollmentStatus } from "../../services/feeService";

const { TextArea } = Input;
const { Option } = Select;

const STUDENT_CATEGORY_LABELS = {
  all: "All Categories",
  active: "Active Students",
  dropout: "Dropout Students",
  passout: "Passout Students",
};

const STUDENT_FORM_STEPS = [
  { key: "photo", label: "Photo", fields: [] },
  {
    key: "basic",
    label: "Basic Info",
    fields: [
      "registrationDate",
      "studentName",
      "gender",
      "dateOfBirth",
      "cnicOrBForm",
      "religion",
      "mobileNumber",
      "disability",
    ],
  },
  {
    key: "family",
    label: "Family",
    fields: ["fatherName", "fatherCnic", "fatherContact"],
  },
  {
    key: "additional",
    label: "Additional",
    fields: ["emergencyContactNumber", "permanentAddress"],
  },
];

const normalizeEnrollmentStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

const ACTIVE_ENROLLMENT_STATUS_SET = new Set(["active", "enrolled"]);

const STUDENT_STATUS_OPTIONS = [
  {
    label: "Active",
    value: "Active",
    helper:
      "Move this student back to the active students list and active enrollments flow.",
    color: "#166534",
    bg: "#F0FDF4",
  },
  {
    label: "Dropout",
    value: "Dropped",
    helper:
      "Remove the student from the active students list and show in the dropout filter.",
    color: "#B91C1C",
    bg: "#FEF2F2",
  },
  {
    label: "Passout",
    value: "Completed",
    helper:
      "Remove the student from the active students list and show in the passout filter.",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
];

const REGISTERED_COURSE_CATEGORY = "IT & Vocational";

const hasRegisteredCourseEnrollment = (student) =>
  (Array.isArray(student?.enrollments) ? student.enrollments : []).some(
    (enrollment) =>
      enrollment?.course?.courseCategory === REGISTERED_COURSE_CATEGORY,
  );

const getVisibleRegistrationNo = (student) =>
  hasRegisteredCourseEnrollment(student) ? student?.registrationNo || "" : "";

const hasActiveEnrollment = (student) =>
  (Array.isArray(student?.enrollments) ? student.enrollments : []).some(
    (enrollment) =>
      ACTIVE_ENROLLMENT_STATUS_SET.has(
        normalizeEnrollmentStatus(enrollment.status),
      ),
  );

const hasDroppedEnrollment = (student) =>
  (Array.isArray(student?.enrollments) ? student.enrollments : []).some(
    (enrollment) => normalizeEnrollmentStatus(enrollment.status) === "dropped",
  );

const hasCompletedEnrollment = (student) =>
  (Array.isArray(student?.enrollments) ? student.enrollments : []).some(
    (enrollment) => normalizeEnrollmentStatus(enrollment.status) === "completed",
  );

const matchesStudentCategory = (student, category) => {
  if (category === "all") {
    return true;
  }

  if (category === "active") {
    return hasActiveEnrollment(student);
  }

  if (category === "dropout") {
    return !hasActiveEnrollment(student) && hasDroppedEnrollment(student);
  }

  if (category === "passout") {
    return !hasActiveEnrollment(student) && hasCompletedEnrollment(student);
  }

  return true;
};

const getStudentLifecycleStatus = (student) => {
  if (hasActiveEnrollment(student)) {
    return {
      label: "Active",
      color: "green",
      note: "Student has at least one active assigned course.",
    };
  }

  if (hasDroppedEnrollment(student)) {
    return {
      label: "Dropout",
      color: "orange",
      note: "Student was moved to the dropout list.",
    };
  }

  if (hasCompletedEnrollment(student)) {
    return {
      label: "Passout",
      color: "purple",
      note: "Student completed the assigned course.",
    };
  }

  return {
    label: "Pending",
    color: "default",
    note: "No active course assigned yet.",
  };
};

// ─── PDF DESIGN CONSTANTS ──────────────────────────────────────────────────────
const PDF_COLORS = {
  primary:      [15,  40, 100],    // Deep navy  — used for text & accents
  primaryLight: [235, 240, 252],   // Pale blue tint — section row fill
  accent:       [0,   112, 186],   // Corporate blue
  accentLight:  [224, 240, 251],   // Very light blue
  dark:         [20,  20,  30],    // Near-black for body text
  mid:          [80,  90, 110],    // Mid grey
  light:        [155, 165, 180],   // Light grey
  rule:         [210, 215, 225],   // Hairline rule colour
  successBg:    [232, 252, 240],   // Pale green
  successFg:    [15,  115,  60],   // Forest green
  warnBg:       [255, 248, 225],   // Pale amber
  warnFg:       [160,  90,   0],   // Amber
  dangerBg:     [255, 235, 235],   // Pale red
  dangerFg:     [190,  35,  35],   // Red
  neutralBg:    [240, 242, 246],   // Light cool grey
  white:        [255, 255, 255],
  headerBg:     [15,  40, 100],    // Table headers — keep dark for contrast
  rowAlt:       [247, 249, 253],   // Alternate row stripe

  // ── NEW: light header colours ──────────────────────────────────────────────
  // Top banner background — very light blue, on-theme
  pageBannerBg:   [235, 241, 255],
  // Border under the banner
  pageBannerBorder: [190, 210, 245],
  // Academy name text on light banner
  pageBannerTitle:  [10,  30,  90],
  // Sub-text (address / phone) on light banner
  pageBannerSub:    [80,  100, 150],
  // Subtitle pill background — medium navy (stays legible on light banner)
  pillBg:  [30,  70, 160],
  // Subtitle pill text
  pillTxt: [255, 255, 255],
};

// Helper: set fill colour from array
const setFill = (doc, rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setDraw = (doc, rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
const setTxt  = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

// Helper: draw a thin horizontal rule
const hRule = (doc, x, y, w, rgb = PDF_COLORS.rule) => {
  setDraw(doc, rgb);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
};

// Helper: load logo as base64
const loadLogoBase64 = async (logoSrc) => {
  try {
    const response = await fetch(logoSrc);
    const blob = await response.blob();
    return await new Promise((res) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => res(reader.result);
    });
  } catch {
    return null;
  }
};

// ─── SHARED PDF HEADER ─────────────────────────────────────────────────────────
// Light-themed header — white/pale-blue background, navy text, accent pill.
const drawPdfHeader = (doc, logoDataUrl, subtitle = "") => {
  const pageWidth = doc.internal.pageSize.width;
  const margin    = 14;
  const barH      = 50;   // total height of the banner

  // ── Light background bar ──
  setFill(doc, PDF_COLORS.pageBannerBg);
  doc.rect(0, 0, pageWidth, barH, "F");

  // ── Logo — larger, left-aligned ──
  const logoSize = 45;
  const logoY    = (barH - logoSize) / 2;
  const logoX    = margin;
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // ── Academy name + address (centered under logo) ──
  const centerX = pageWidth / 2;

  // Title — dark navy, bold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setTxt(doc, PDF_COLORS.pageBannerTitle);
  doc.text("ODYSSEY ACADEMY KHIPRO", centerX, 16, { align: "center" });

  // Address — smaller, tighter spacing, centered
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt(doc, PDF_COLORS.pageBannerSub);
  doc.text("Bin Muqarab Colony, Main 7G Road, Khipro", centerX, 22, { align: "center" });
  doc.text("Email: askodysseyacademy@gmail.com | Phone: +923492425428", centerX, 28, { align: "center" });

  // ── Subtitle pill (e.g. "Student Profile") ──
  if (subtitle) {
    setFill(doc, PDF_COLORS.pillBg);
    const pillW = 90, pillH = 8;
    const pillX = (pageWidth - pillW) / 2;
    const pillY = 40;
    doc.roundedRect(pillX, pillY, pillW, pillH, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(doc, PDF_COLORS.pillTxt);
    doc.text(subtitle.toUpperCase(), pageWidth / 2, pillY + 5.2, { align: "center" });
  }

  return barH + 3; // Y start for content below header (no bottom border, content starts close after)
};

// ─── SECTION HEADING ───────────────────────────────────────────────────────────
const drawSectionHeading = (doc, label, x, y, w) => {
  setFill(doc, PDF_COLORS.primaryLight);
  doc.rect(x, y, w, 7.5, "F");  // Fill only, no border

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTxt(doc, PDF_COLORS.primary);
  doc.text(label, x + 3, y + 5.2);

  return y + 11;
};

// ─── TWO-COLUMN FIELD RENDERER ─────────────────────────────────────────────────
const drawFields = (doc, fields, x, y, colWidth, rowH = 7) => {
  const half = colWidth / 2;
  let col = 0;

  fields.forEach(([label, value]) => {
    const cx = x + col * half;
    const cy = y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(doc, PDF_COLORS.mid);
    doc.text(label + ":", cx, cy);

    doc.setFont("helvetica", "normal");
    setTxt(doc, PDF_COLORS.dark);
    const val   = String(value || "—");
    const maxW  = half - 28;
    const lines = doc.splitTextToSize(val, maxW);
    doc.text(lines, cx + 26, cy);

    col++;
    if (col === 2) {
      col = 0;
      y += rowH * Math.max(1, lines.length);
    }
  });

  if (col === 1) y += rowH;
  return y;
};

// ─── Students Component ────────────────────────────────────────────────────────
const Students = () => {
  const navigate = useNavigate();
  const permissions = useModulePermissions("students");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [studentFormTab, setStudentFormTab] = useState("photo");
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [feeProfileModalVisible, setFeeProfileModalVisible] = useState(false);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] =
    useState(false);
  const [currentInstallment, setCurrentInstallment] = useState(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form] = Form.useForm();
  const [courseForm] = Form.useForm();
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [availableBatches, setAvailableBatches] = useState([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportingWorkbook, setExportingWorkbook] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [studentStatusRecord, setStudentStatusRecord] = useState(null);
  const [selectedStudentStatus, setSelectedStudentStatus] =
    useState("Dropped");
  const fileInputRef = useRef(null);
  const [tablePageSize, setTablePageSize] = useState(3);
  const [tablePage, setTablePage] = useState(1);
  const [activeStudentCategory, setActiveStudentCategory] = useState("all");
  const currentStudentStepIndex = Math.max(
    0,
    STUDENT_FORM_STEPS.findIndex((step) => step.key === studentFormTab),
  );
  const currentStudentStep = STUDENT_FORM_STEPS[currentStudentStepIndex];
  const nextStudentStep = STUDENT_FORM_STEPS[currentStudentStepIndex + 1];
  const isLastStudentStep =
    currentStudentStepIndex === STUDENT_FORM_STEPS.length - 1;

  const studentCategoryStats = useMemo(
    () => ({
      all: students.length,
      active: students.filter((student) => matchesStudentCategory(student, "active"))
        .length,
      dropout: students.filter((student) => matchesStudentCategory(student, "dropout"))
        .length,
      passout: students.filter((student) => matchesStudentCategory(student, "passout"))
        .length,
    }),
    [students],
  );

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    filtered = filtered.filter((student) =>
      matchesStudentCategory(student, activeStudentCategory),
    );

    if (searchText) {
      filtered = filtered.filter(
        (student) =>
          student.studentName
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||
          getVisibleRegistrationNo(student)
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||
          student.fatherName
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||
          student.cnicOrBForm?.includes(searchText),
      );
    }

    if (genderFilter !== "all") {
      filtered = filtered.filter(
        (student) =>
          student.gender?.toLowerCase() === genderFilter.toLowerCase(),
      );
    }

    if (enrollmentFilter !== "all") {
      if (enrollmentFilter === "enrolled") {
        filtered = filtered.filter(
          (student) => student.enrollments && student.enrollments.length > 0,
        );
      } else if (enrollmentFilter === "not-enrolled") {
        filtered = filtered.filter(
          (student) => !student.enrollments || student.enrollments.length === 0,
        );
      }
    }

    if (courseFilter !== "all") {
      filtered = filtered.filter((student) =>
        student.enrollments?.some(
          (enrollment) => enrollment.course?._id === courseFilter,
        ),
      );
    }

    if (batchFilter !== "all") {
      filtered = filtered.filter((student) =>
        student.enrollments?.some(
          (enrollment) => enrollment.batch?._id === batchFilter,
        ),
      );
    }

    return filtered;
  }, [
    students,
    searchText,
    genderFilter,
    enrollmentFilter,
    courseFilter,
    batchFilter,
    activeStudentCategory,
  ]);

  useEffect(() => {
    setTablePage(1);
  }, [
    searchText,
    genderFilter,
    enrollmentFilter,
    courseFilter,
    batchFilter,
    activeStudentCategory,
  ]);

  useEffect(() => {
    if (!bulkDeleteMode) return;

    const visibleStudentIds = new Set(
      filteredStudents.map((student) => student?._id).filter(Boolean),
    );

    setSelectedDeleteIds((prev) =>
      prev.filter((studentId) => visibleStudentIds.has(studentId)),
    );
  }, [bulkDeleteMode, filteredStudents]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [studentsRes, enrollmentsRes] = await Promise.all([
        api.get("/student/admissions", { params: { limit: 10000 } }),
        api.get("/enrollment", { params: { limit: 10000 } }),
      ]);

      if (studentsRes.data.success) {
        const rawStudents = studentsRes.data.data;
        // The /enrollment endpoint already attaches feeStructure to each enrollment.
        // Using that directly avoids a redundant second request and a wrong-route bug
        // that was silently setting feeStructure: undefined on every enrollment.
        const allEnrollments = enrollmentsRes.data.success
          ? enrollmentsRes.data.data
          : [];

        const enrollmentMap = {};
        allEnrollments.forEach((enr) => {
          const sid = enr.student?._id || enr.student;
          if (!sid) return;
          const key = sid.toString();
          if (!enrollmentMap[key]) enrollmentMap[key] = [];

          enrollmentMap[key].push({
            ...enr,
            systemGrantedNumber: enr.feeStructure?.systemGrantedNumber,
          });
        });

        const studentsWithCourses = rawStudents.map((student) => ({
          ...student,
          enrollments: enrollmentMap[student._id.toString()] || [],
        }));

        setStudents(studentsWithCourses);

        const batchesMap = new Map();
        studentsWithCourses.forEach((student) => {
          student.enrollments?.forEach((enrollment) => {
            if (enrollment.batch && !batchesMap.has(enrollment.batch._id)) {
              batchesMap.set(enrollment.batch._id, enrollment.batch);
            }
          });
        });
        setAvailableBatches(Array.from(batchesMap.values()));
      }
    } catch (error) {
      message.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get("/course");
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch courses");
    }
  };

  const getTargetEnrollmentsForStatusChange = (student, sourceCategory) => {
    const enrollments = Array.isArray(student?.enrollments)
      ? student.enrollments
      : [];

    if (sourceCategory === "active") {
      return enrollments.filter((enrollment) =>
        ACTIVE_ENROLLMENT_STATUS_SET.has(
          normalizeEnrollmentStatus(enrollment.status),
        ),
      );
    }

    if (sourceCategory === "dropout") {
      return enrollments.filter(
        (enrollment) => normalizeEnrollmentStatus(enrollment.status) === "dropped",
      );
    }

    if (sourceCategory === "passout") {
      return enrollments.filter(
        (enrollment) =>
          normalizeEnrollmentStatus(enrollment.status) === "completed",
      );
    }

    return [];
  };

  const getAvailableStatusOptions = (sourceCategory) => {
    if (sourceCategory === "active") {
      return STUDENT_STATUS_OPTIONS.filter(
        (option) => option.value !== "Active",
      );
    }

    if (sourceCategory === "dropout" || sourceCategory === "passout") {
      return STUDENT_STATUS_OPTIONS.filter(
        (option) => option.value === "Active",
      );
    }

    return [];
  };

  const openStatusChangeModal = (student) => {
    if (!permissions.update) {
      message.error("You do not have permission to update students");
      return;
    }

    const options = getAvailableStatusOptions(activeStudentCategory);
    if (!options.length) return;

    setStudentStatusRecord(student);
    setSelectedStudentStatus(options[0].value);
    setStatusModalVisible(true);
  };

  const closeStatusChangeModal = () => {
    if (statusLoading) return;
    setStatusModalVisible(false);
    setStudentStatusRecord(null);
    setSelectedStudentStatus("Dropped");
  };

  const handleStudentStatusUpdate = async () => {
    if (!studentStatusRecord) return;

    const targetEnrollments = getTargetEnrollmentsForStatusChange(
      studentStatusRecord,
      activeStudentCategory,
    );

    if (!targetEnrollments.length) {
      message.warning("No enrollments found to update for this student.");
      closeStatusChangeModal();
      return;
    }

    setStatusLoading(true);
    try {
      await Promise.all(
        targetEnrollments.map((enrollment) =>
          updateEnrollmentStatus(enrollment._id, {
            status: selectedStudentStatus,
            completionDate:
              selectedStudentStatus === "Completed"
                ? dayjs().format("YYYY-MM-DD")
                : null,
          }),
        ),
      );

      const selectedOption = STUDENT_STATUS_OPTIONS.find(
        (option) => option.value === selectedStudentStatus,
      );

      message.success(
        `${studentStatusRecord.studentName || "Student"} marked as ${
          selectedOption?.label || selectedStudentStatus
        } successfully.`,
      );

      closeStatusChangeModal();
      await fetchStudents();
    } catch (error) {
      message.error(
        error?.message ||
          error?.response?.data?.message ||
          "Failed to update student status",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const resetStudentTableView = () => {
    setSearchText("");
    setGenderFilter("all");
    setEnrollmentFilter("all");
    setCourseFilter("all");
    setBatchFilter("all");
    setActiveStudentCategory("all");
    setTablePage(1);
  };

  const closeStudentModal = () => {
    setModalVisible(false);
    form.resetFields();
    setEditMode(false);
    setEditingStudent(null);
    setProfilePicture(null);
    setProfilePictureUrl(null);
    setStudentFormTab("photo");
  };

  const handleStudentStepAction = async () => {
    if (isLastStudentStep) {
      form.submit();
      return;
    }

    try {
      if (currentStudentStep.fields.length > 0) {
        await form.validateFields(currentStudentStep.fields);
      }

      if (nextStudentStep) {
        setStudentFormTab(nextStudentStep.key);
        message.success(
          `${currentStudentStep.label} completed. Please continue with ${nextStudentStep.label}.`,
        );
      }
    } catch {
      message.warning(
        `Please complete the ${currentStudentStep.label} tab before moving to the next step.`,
      );
    }
  };

  const handleCreateStudent = async (values) => {
    if (!permissions.create) {
      message.error("You do not have permission to create students");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (key === "registrationDate" || key === "dateOfBirth") {
          formData.append(key, values[key].format("YYYY-MM-DD"));
        } else {
          formData.append(key, values[key]);
        }
      });
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }
      const response = await api.post("/student/admission", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        message.success("Student created successfully!");
        closeStudentModal();
        resetStudentTableView();
        await fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to create student");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (values) => {
    if (!permissions.update) {
      message.error("You do not have permission to update students");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (key === "registrationDate" || key === "dateOfBirth") {
          formData.append(key, values[key].format("YYYY-MM-DD"));
        } else {
          formData.append(key, values[key]);
        }
      });
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }
      const response = await api.put(
        `/student/admission/${editingStudent._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (response.data.success) {
        message.success("Student updated successfully!");
        closeStudentModal();
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteStudentDialog = (student) => {
    if (!permissions.delete) {
      message.error("You do not have permission to delete students");
      return;
    }
    setStudentToDelete(student);
    setDeleteDialogVisible(true);
  };

  const closeDeleteStudentDialog = (force = false) => {
    if (deleteLoading && !force) return;
    setDeleteDialogVisible(false);
    setStudentToDelete(null);
  };

  const startBulkDeleteMode = () => {
    if (!permissions.delete) {
      message.error("You do not have permission to delete students");
      return;
    }

    const initialSelection = studentToDelete?._id ? [studentToDelete._id] : [];
    setSelectedDeleteIds(initialSelection);
    setBulkDeleteMode(true);
    closeDeleteStudentDialog(true);
  };

  const cancelBulkDeleteMode = () => {
    if (deleteLoading) return;
    setBulkDeleteMode(false);
    setSelectedDeleteIds([]);
  };

  const handleDeleteStudentChoice = async (scope) => {
    if (!permissions.delete) {
      message.error("You do not have permission to delete students");
      return;
    }

    setDeleteLoading(true);
    try {
      if (scope === "single" && studentToDelete?._id) {
        const response = await api.delete(
          `/student/admission/${studentToDelete._id}`,
        );

        if (response.data.success) {
          message.success("Selected student deleted successfully!");
        }
      }

      closeDeleteStudentDialog(true);
      await fetchStudents();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Failed to delete student record(s)",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteSelectedStudents = async () => {
    if (!permissions.delete) {
      message.error("You do not have permission to delete students");
      return;
    }

    if (selectedDeleteIds.length === 0) {
      message.warning("Select at least one student to delete");
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await api.post("/student/admissions/bulk-delete", {
        ids: selectedDeleteIds,
      });

      if (response.data.success) {
        message.success(
          response.data.message || "Selected student records deleted successfully!",
        );
      }

      cancelBulkDeleteMode();
      await fetchStudents();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Failed to delete selected students",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUnlinkCourse = async (enrollmentId, studentName, courseName) => {
    try {
      const response = await api.delete(`/enrollment/${enrollmentId}`);
      if (response.data.success) {
        message.success(`Course "${courseName}" unlinked from ${studentName} successfully!`);
        fetchStudents();
        const updatedStudent = students.find((s) => s._id === selectedStudent._id);
        if (updatedStudent) {
          const enrollmentRes = await api.get(`/enrollment/student/${updatedStudent._id}`);
          setSelectedStudent({
            ...updatedStudent,
            enrollments: enrollmentRes.data.data || [],
          });
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to unlink course");
    }
  };

  const handleUpdateInstallmentStatus = async (
    feeStructureId,
    installmentId,
    newStatus,
    paidAmount = 0,
  ) => {
    try {
      const response = await api.put(
        `/fee/structure/${feeStructureId}/installment/${installmentId}`,
        {
          status: newStatus,
          paidAmount: paidAmount,
          paidDate: newStatus === "Paid" ? new Date() : null,
        },
      );
      if (response.data.success) {
        message.success(`Installment payment status updated to ${newStatus}!`);
        const enrollmentRes = await api.get(`/enrollment/student/${selectedStudent._id}`);
        setSelectedStudent({
          ...selectedStudent,
          enrollments: enrollmentRes.data.data || [],
        });
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update installment status");
    }
  };

  const openEditModal = (student) => {
    if (!permissions.update) {
      message.error("You do not have permission to update students");
      return;
    }
    setEditMode(true);
    setEditingStudent(student);
    form.setFieldsValue({
      ...student,
      registrationDate: dayjs(student.registrationDate),
      dateOfBirth: dayjs(student.dateOfBirth),
    });
    if (student.profilePicture) {
      setProfilePictureUrl(student.profilePicture);
    }
    setStudentFormTab("photo");
    setModalVisible(true);
  };

  const openCourseAssignModal = (student) => {
    if (!permissions.create) {
      message.error("You do not have permission to assign courses");
      return;
    }
    setSelectedStudent(student);
    setEditingEnrollment(null);
    courseForm.resetFields();
    setCourseModalVisible(true);
  };

  const openEditCourseModal = (student, enrollment) => {
    if (!permissions.update) {
      message.error("You do not have permission to update assigned courses");
      return;
    }
    setSelectedStudent(student);
    setEditingEnrollment(enrollment);
    setCourseModalVisible(true);
  };

  const openFeeProfileModal = (student) => {
    if (!permissions.view) {
      message.error("You do not have permission to view fee profiles");
      return;
    }
    setSelectedStudent(student);
    setFeeProfileModalVisible(true);
  };

  const handleAssignCourse = async (values) => {
    if (!(editingEnrollment ? permissions.update : permissions.create)) {
      message.error("You do not have permission for this course assignment action");
      return;
    }
    setLoading(true);
    try {
      const totalDiscount =
        values.totalDiscount ?? values.discount ?? values.discountAmount ?? 0;
      const selectedCourse = courses.find((c) => c._id === values.courseId);
      const courseCategory = selectedCourse?.courseCategory || "Coaching";

      const enrollmentData = {
        ...(editingEnrollment ? {} : { studentId: selectedStudent._id }),
        courseId: values.courseId,
        courseCategory: courseCategory,
        batchId: values.batchId || null,
        enrollmentDate: values.enrollmentDate.format("YYYY-MM-DD"),
        status: "Active",
        admissionFee: values.admissionFee,
        courseFee: values.courseFee,
        certificateFee: values.certificateFee,
        examFee: values.examFee || 0,
        registrationFee: values.registrationFee || 0,
        practicalFee: values.practicalFee || 0,
        otherFee: values.otherFee || 0,
        additionalFees: values.additionalFees || [],
        includeExamFeeInInstallments: values.includeExamFeeInInstallments || false,
        includeRegistrationFeeInInstallments: values.includeRegistrationFeeInInstallments || false,
        includePracticalFeeInInstallments: values.includePracticalFeeInInstallments || false,
        includeOtherFeeInInstallments: values.includeOtherFeeInInstallments || false,
        totalFee: values.totalFee,
        discount: totalDiscount,
        discountType: values.discountType || "none",
        discountOnAdmission: values.discountOnAdmission || 0,
        discountOnCourseFee: values.discountOnCourseFee || 0,
        discountPercentage: values.discountPercentage || 0,
        paymentPlanType: values.paymentPlanType || "custom",
        finalFee: values.finalFee,
        numberOfInstallments: values.numberOfInstallments || values.installments?.length || 1,
        installments: values.installments || [],
      };

      let response;
      if (editingEnrollment) {
        // Edit mode - make PUT request
        response = await api.put(`/enrollment/${editingEnrollment._id}`, enrollmentData);
        if (response.data.success) {
          message.success("Course information updated successfully!");
        }
      } else {
        // Create mode - make POST request
        response = await api.post("/enrollment", enrollmentData);
        if (response.data.success) {
          message.success("Course assigned successfully with installment plan!");
        }
      }

      if (response.data.success) {
        courseForm.resetFields();
        setCourseModalVisible(false);
        setEditingEnrollment(null);
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to assign course");
    } finally {
      setLoading(false);
    }
  };

  // ─── DOWNLOAD STUDENT PROFILE PDF ─────────────────────────────────────────────
  const downloadStudentPDF = async (student) => {
    if (!permissions.print) {
      message.error("You do not have permission to download student reports");
      return;
    }
    try {
      const logoDataUrl = await loadLogoBase64(odysseyLogo);
      const doc        = new jsPDF({ unit: "mm", format: "a4" });
      const pageW      = doc.internal.pageSize.width;
      const pageH      = doc.internal.pageSize.height;
      const margin     = 14;
      const colW       = pageW - margin * 2;

      // ── Header (light bg) ──
      let y = drawPdfHeader(doc, logoDataUrl, "Student Profile");

      // ── Photo (top-right) ──
      const photoSize = 28;
      const photoX    = pageW - margin - photoSize - 2;
      const photoY    = y + 2;
      if (student.profilePicture) {
        try {
          const imgData = student.profilePicture;
          const imgFormat = imgData.startsWith('data:image/png') ? 'PNG' : 
                           imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg') ? 'JPEG' : 'JPEG';
          
          // Add white background for proper rendering
          setFill(doc, [255, 255, 255]);
          doc.rect(photoX, photoY, photoSize, photoSize, "F");
          
          doc.addImage(imgData, imgFormat, photoX, photoY, photoSize, photoSize);
        } catch (err) {
          console.log("Could not add profile picture:", err);
        }
      }

      const textColW = student.profilePicture ? colW - photoSize - 8 : colW;

      // ── A. Personal Information ──
      y = drawSectionHeading(doc, "A. Personal Information", margin, y, colW);

      const personalFields = [
        ["Student Name",    student.studentName],
        ["Registration No", getVisibleRegistrationNo(student) || "â€”"],
        ["Father Name",     student.fatherName],
        ["Gender",          student.gender],
        ["Date of Birth",   student.dateOfBirth ? dayjs(student.dateOfBirth).format("DD/MM/YYYY") : "—"],
        ["CNIC / B-Form",   student.cnicOrBForm],
        ["Religion",        student.religion],
        ["Caste",           student.caste],
        ["Vulnerability",   student.vulnerability || "N/A"],
        ["Disability",      student.disability ? "Yes" : "No"],
      ];

      y = drawFields(doc, personalFields, margin, y, textColW);
      y = Math.max(y, photoY + photoSize + 4);

      // ── B. Contact Information ──
      y = drawSectionHeading(doc, "B. Contact Information", margin, y, colW);
      const contactFields = [
        ["Mobile",         student.mobileNumber],
        ["Phone",          student.contactNumber],
        ["Email",          student.email],
        ["Mother Tongue",  student.motherTongue],
        ["Religion",       student.religion],
        ["Address",        student.address || student.permanentAddress],
        ["Postal Code",    student.postalCode],
        ["Perm. Address",  student.permanentAddress],
      ];
      y = drawFields(doc, contactFields, margin, y, colW);

      // ── C. Academic Information ──
      y = drawSectionHeading(doc, "C. Academic Information", margin, y, colW);
      const academicFields = [
        ["Institution",     "Odyssey Academy Khipro"],
        ["Admission Date",  student.registrationDate ? dayjs(student.registrationDate).format("DD/MM/YYYY") : "—"],
        ["Degree Program",  "Certificate Programs"],
        ["Courses Enrolled", String(student.enrollments?.length || 0)],
        ["Prev. School",    student.previousSchoolCollege],
        ["Last Class",      student.lastClassAttended],
      ];
      y = drawFields(doc, academicFields, margin, y, colW);

      // ── D. Family Information ──
      y = drawSectionHeading(doc, "D. Family Information", margin, y, colW);
      const familyFields = [
        ["Father Name",       student.fatherName],
        ["Father CNIC",       student.fatherCnic],
        ["Father Occupation", student.fatherOccupation],
        ["Father Contact",    student.fatherContact],
        ["Mother Name",       student.motherName],
        ["Guardian Name",     student.guardianName],
        ["Guardian Contact",  student.guardianContact],
        ["Emergency Contact", student.emergencyContactNumber],
      ];
      y = drawFields(doc, familyFields, margin, y, colW);

      // ── E. Banking Information ──
      if (student.bankName || student.accountNumber) {
        y = drawSectionHeading(doc, "E. Banking Information", margin, y, colW);
        const bankFields = [
          ["Account Title",  student.accountTitle],
          ["Account No",     student.accountNumber],
          ["Bank Name",      student.bankName],
          ["Branch Name",    student.branchName],
          ["Branch Code",    student.branchCode],
          ["Monthly Income", student.monthlyIncome ? `PKR ${student.monthlyIncome}` : "—"],
        ];
        y = drawFields(doc, bankFields, margin, y, colW);
      }

      // ── F. Enrolled Courses ──
      if (student.enrollments && student.enrollments.length > 0) {
        y = drawSectionHeading(doc, "F. Enrolled Courses", margin, y, colW);

        student.enrollments.forEach((enr, idx) => {
          if (y > pageH - 50) { doc.addPage(); y = 20; }

          setFill(doc, idx % 2 === 0 ? PDF_COLORS.accentLight : PDF_COLORS.white);
          doc.rect(margin, y, colW, 22, "F");

          setFill(doc, PDF_COLORS.accent);
          doc.rect(margin, y, 2.5, 22, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          setTxt(doc, PDF_COLORS.primary);
          doc.text(`${idx + 1}. ${enr.course?.courseName || "N/A"}`, margin + 6, y + 6);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          setTxt(doc, PDF_COLORS.mid);

          const col1x = margin + 6;
          const col2x = margin + colW / 2;

          doc.text(`Code: ${enr.course?.courseId || "N/A"}`, col1x, y + 12);
          doc.text(`Status: ${enr.status || "N/A"}`, col2x, y + 12);
          doc.text(
            `Enrolled: ${dayjs(enr.enrollmentDate).format("DD MMM YYYY")}`,
            col1x, y + 18,
          );
          if (enr.batch) {
            doc.text(
              `Batch: ${enr.batch.batchName} [${enr.batch.shift}]  •  Days: ${enr.batch.days || "—"}`,
              col2x, y + 18,
            );
          }

          y += 26;
        });
      }

      // ── Footer / Signature ──
      if (y > pageH - 30) { doc.addPage(); y = 20; }
      y = pageH - 28;

      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setTxt(doc, PDF_COLORS.mid);
      doc.text(`Recorded on: ${dayjs().format("DD/MM/YYYY")}`, margin, y + 5);
      doc.text("Signature of Student: ______________________", pageW - margin, y + 5, { align: "right" });

      y += 12;
      setTxt(doc, PDF_COLORS.light);
      doc.setFontSize(7);
      doc.text("This is a computer-generated document — Odyssey Academy Khipro", pageW / 2, y, { align: "center" });

      doc.save(`${student.studentName}_Student_Profile.pdf`);
      message.success("Student profile downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      message.error("Failed to generate student PDF");
    }
  };

  const formatExcelDate = (value) =>
    value ? dayjs(value).format("YYYY-MM-DD") : "";

  const downloadStudentsWorkbook = async () => {
    if (!permissions.export) {
      message.error("You do not have permission to export students");
      return;
    }

    try {
      setExportingWorkbook(true);

      const studentIds = new Set(students.map((student) => student._id));
      const studentsById = new Map(
        students.map((student) => [student._id, student]),
      );
      const feeStructureIds = new Set();
      const studentRows = [];
      const enrollmentRows = [];
      const installmentRows = [];
      const additionalFeeRows = [];

      students.forEach((student) => {
        const visibleRegistrationNo = getVisibleRegistrationNo(student);

        studentRows.push({
          "Student Name": student.studentName || "",
          "Registration No": visibleRegistrationNo,
          "Registration Date": formatExcelDate(student.registrationDate),
          Gender: student.gender || "",
          "Date of Birth": formatExcelDate(student.dateOfBirth),
          Religion: student.religion || "",
          "CNIC/B-Form": student.cnicOrBForm || "",
          "Mobile Number": student.mobileNumber || "",
          "Father Name": student.fatherName || "",
          "Father CNIC": student.fatherCnic || "",
          "Father Contact": student.fatherContact || "",
          "Emergency Contact": student.emergencyContactNumber || "",
          "Permanent Address": student.permanentAddress || "",
          "Current Address": student.currentAddress || "",
          "WhatsApp Number": student.whatsappNumber || "",
          Email: student.emailAddress || "",
          District: student.district || "",
          Tehsil: student.tehsil || "",
          "Union Council": student.unionCouncil || "",
          Reference: student.reference || "",
        });

        const enrollments = Array.isArray(student.enrollments)
          ? student.enrollments
          : [];

        enrollments.forEach((enrollment) => {
          const feeStructure = enrollment.feeStructure || {};

          if (feeStructure?._id) {
            feeStructureIds.add(feeStructure._id);
          }

          enrollmentRows.push({
            "Registration No": visibleRegistrationNo,
            "CNIC/B-Form": student.cnicOrBForm || "",
            "Course Name": enrollment.course?.courseName || "",
            "Course ID": enrollment.course?.courseId || "",
            "Batch Name": enrollment.batch?.batchName || "",
            "Batch Code": enrollment.batch?.batchCode || "",
            "Enrollment Date": formatExcelDate(enrollment.enrollmentDate),
            "Enrollment Status": enrollment.status || "Active",
            "Payment Plan Type": feeStructure.paymentPlanType || "custom",
            "Number Of Installments": feeStructure.numberOfInstallments || 1,
            "Admission Fee": feeStructure.admissionFee ?? "",
            "Course Fee": feeStructure.courseFee ?? "",
            "Certificate Fee": feeStructure.certificateFee ?? "",
            "Exam Fee": feeStructure.examFee ?? "",
            "Registration Fee": feeStructure.registrationFee ?? "",
            "Practical Fee": feeStructure.practicalFee ?? "",
            "Other Fee": feeStructure.otherFee ?? "",
            "Discount Percentage": feeStructure.discountPercentage ?? 0,
            "Discount On Course Fee":
              feeStructure.discountOnCourseFee ?? feeStructure.discount ?? 0,
            "Paid Amount": feeStructure.paidAmount ?? 0,
            "Enrollment Notes": enrollment.notes || "",
            "Fee Notes": feeStructure.notes || "",
          });

          (Array.isArray(feeStructure.installments)
            ? feeStructure.installments
            : []
          ).forEach((installment) => {
            installmentRows.push({
              "Registration No": visibleRegistrationNo,
              "CNIC/B-Form": student.cnicOrBForm || "",
              "Course Name": enrollment.course?.courseName || "",
              "Course ID": enrollment.course?.courseId || "",
              "Installment Number": installment.installmentNumber || "",
              Description: installment.description || "",
              "Due Date": formatExcelDate(installment.dueDate),
              Amount: installment.amount ?? 0,
              Status: installment.status || "Pending",
              "Paid Amount": installment.paidAmount ?? 0,
              "Admission Fee": installment.feeComponents?.admissionFee ?? 0,
              "Course Fee": installment.feeComponents?.courseFee ?? 0,
              "Certificate Fee": installment.feeComponents?.certificateFee ?? 0,
              "Exam Fee": installment.feeComponents?.examFee ?? 0,
              "Registration Fee": installment.feeComponents?.registrationFee ?? 0,
              "Practical Fee": installment.feeComponents?.practicalFee ?? 0,
              "Other Fee": installment.feeComponents?.otherFee ?? 0,
            });
          });

          (Array.isArray(feeStructure.additionalFees)
            ? feeStructure.additionalFees
            : []
          ).forEach((fee) => {
            additionalFeeRows.push({
              "Registration No": visibleRegistrationNo,
              "CNIC/B-Form": student.cnicOrBForm || "",
              "Course Name": enrollment.course?.courseName || "",
              "Course ID": enrollment.course?.courseId || "",
              "Fee Type": fee.feeType || "other",
              Title: fee.title || "",
              Amount: fee.amount ?? 0,
              "Payment Mode": fee.paymentMode || "one_time",
            });
          });
        });
      });

      const paymentsResponse = await api.get("/fee/payment", {
        params: { limit: 10000 },
      });

      const allPayments = paymentsResponse.data?.success
        ? paymentsResponse.data.data || []
        : [];

      const paymentRows = allPayments
        .filter((payment) => {
          const studentId = payment.student?._id || payment.student;
          const feeStructureId =
            payment.feeStructure?._id || payment.feeStructure;
          return studentIds.has(studentId) || feeStructureIds.has(feeStructureId);
        })
        .map((payment) => {
          const studentId = payment.student?._id || payment.student;
          const linkedStudent = studentsById.get(studentId);

          return {
            "Registration No":
              getVisibleRegistrationNo(linkedStudent || payment.student || {}),
            "CNIC/B-Form":
              payment.student?.cnicOrBForm || linkedStudent?.cnicOrBForm || "",
            "Course Name": payment.course?.courseName || "",
            "Course ID": payment.course?.courseId || "",
            "Installment Number": payment.installmentNumber || "",
            Amount: payment.amount ?? 0,
            "Payment Date": formatExcelDate(payment.paymentDate),
            "Payment Method": payment.paymentMethod || "Cash",
            "Voucher No": payment.voucherNo || "",
            Remarks: payment.remarks || "",
            "Payment Type": payment.paymentType || "",
          };
        });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(studentRows),
        "Students",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(enrollmentRows),
        "Enrollments",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(installmentRows),
        "Installments",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(additionalFeeRows),
        "Additional Fees",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(paymentRows),
        "Payments",
      );

      XLSX.writeFile(
        workbook,
        `students-complete-export-${dayjs().format("YYYY-MM-DD")}.xlsx`,
      );

      message.success("Excel workbook downloaded successfully");
    } catch (error) {
      console.error("Workbook export failed:", error);
      message.error(error.response?.data?.message || "Failed to export workbook");
    } finally {
      setExportingWorkbook(false);
    }
  };

  // Handle bulk import of students from CSV/Excel
  const downloadImportTemplate = () => {
    const workbook = XLSX.utils.book_new();

    const studentsSheet = XLSX.utils.json_to_sheet([
      {
        "Student Name": "Ali Raza",
        "Registration No": "0091",
        "Registration Date": "2026-05-17",
        Gender: "Male",
        "Date of Birth": "2010-01-20",
        Religion: "Muslim",
        "CNIC/B-Form": "4210112345678",
        "Mobile Number": "03001234567",
        "Father Name": "Ahmed Raza",
        "Father CNIC": "4210111111111",
        "Father Contact": "03007654321",
        "Emergency Contact": "03009998888",
        "Permanent Address": "Main Road, Khipro",
        "Current Address": "Main Road, Khipro",
        "WhatsApp Number": "03001234567",
        Email: "ali@example.com",
        District: "Sanghar",
        Tehsil: "Khipro",
        "Union Council": "UC-01",
        Reference: "Friend",
      },
    ]);

    const enrollmentsSheet = XLSX.utils.json_to_sheet([
      {
        "Registration No": "0091",
        "CNIC/B-Form": "4210112345678",
        "Course Name": "English Language",
        "Course ID": "",
        "Batch Name": "English 2:00 to 4:00",
        "Batch Code": "",
        "Enrollment Date": "2026-05-17",
        "Enrollment Status": "Active",
        "Payment Plan Type": "custom",
        "Number Of Installments": 3,
        "Admission Fee": 1000,
        "Course Fee": 5000,
        "Certificate Fee": 1000,
        "Exam Fee": 0,
        "Registration Fee": 0,
        "Practical Fee": 0,
        "Other Fee": 0,
        "Discount Percentage": 10,
        "Discount On Course Fee": 500,
        "Paid Amount": 1000,
        "Enrollment Notes": "Imported from workbook",
        "Fee Notes": "Custom plan import",
      },
    ]);

    const installmentsSheet = XLSX.utils.json_to_sheet([
      {
        "Registration No": "0091",
        "CNIC/B-Form": "4210112345678",
        "Course Name": "English Language",
        "Course ID": "",
        "Installment Number": 1,
        Description: "Admission + first installment",
        "Due Date": "2026-05-17",
        Amount: 2500,
        Status: "Pending",
        "Paid Amount": 1000,
        "Admission Fee": 1000,
        "Course Fee": 1500,
        "Certificate Fee": 0,
        "Exam Fee": 0,
        "Registration Fee": 0,
        "Practical Fee": 0,
        "Other Fee": 0,
      },
      {
        "Registration No": "0091",
        "CNIC/B-Form": "4210112345678",
        "Course Name": "English Language",
        "Course ID": "",
        "Installment Number": 2,
        Description: "Second installment",
        "Due Date": "2026-06-17",
        Amount: 2000,
        Status: "Pending",
        "Paid Amount": 0,
        "Admission Fee": 0,
        "Course Fee": 2000,
        "Certificate Fee": 0,
        "Exam Fee": 0,
        "Registration Fee": 0,
        "Practical Fee": 0,
        "Other Fee": 0,
      },
      {
        "Registration No": "0091",
        "CNIC/B-Form": "4210112345678",
        "Course Name": "English Language",
        "Course ID": "",
        "Installment Number": 3,
        Description: "Final installment + certificate fee",
        "Due Date": "2026-07-17",
        Amount: 2000,
        Status: "Pending",
        "Paid Amount": 0,
        "Admission Fee": 0,
        "Course Fee": 1500,
        "Certificate Fee": 500,
        "Exam Fee": 0,
        "Registration Fee": 0,
        "Practical Fee": 0,
        "Other Fee": 0,
      },
    ]);

    const additionalFeesSheet = XLSX.utils.json_to_sheet([
      {
        "Registration No": "0091",
        "CNIC/B-Form": "4210112345678",
        "Course Name": "English Language",
        "Course ID": "",
        "Fee Type": "other",
        Title: "Library Charges",
        Amount: 300,
        "Payment Mode": "one_time",
      },
    ]);

    const paymentsSheet = XLSX.utils.json_to_sheet([
      {
        "Registration No": "0091",
        "CNIC/B-Form": "4210112345678",
        "Course Name": "English Language",
        "Course ID": "",
        "Installment Number": 1,
        Amount: 1000,
        "Payment Date": "2026-05-17",
        "Payment Method": "Cash",
        "Voucher No": "001",
        Remarks: "Imported opening payment",
        "Payment Type": "Installment",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, studentsSheet, "Students");
    XLSX.utils.book_append_sheet(workbook, enrollmentsSheet, "Enrollments");
    XLSX.utils.book_append_sheet(workbook, installmentsSheet, "Installments");
    XLSX.utils.book_append_sheet(workbook, additionalFeesSheet, "Additional Fees");
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments");

    XLSX.writeFile(workbook, "students-complete-import-template.xlsx");
  };

  const handleBulkImport = async (file) => {
    if (!permissions.import) {
      message.error("You do not have permission to import students");
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/student/students/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        message.success(
          `Import completed: ${response.data.data.imported} new, ${response.data.data.updated || 0} updated, ${response.data.data.coursesAssigned || 0} enrollments, ${response.data.data.paymentsImported || 0} payments`,
        );
        setImportResult(response.data.data);
        fetchStudents();
      } else {
        message.error(response.data.message || "Import failed");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to import students");
    } finally {
      setImporting(false);
    }
  };

  const triggerFileInput = () => {
    if (!permissions.import) {
      message.error("You do not have permission to import students");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ];
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (
        !validTypes.includes(file.type) &&
        !["csv", "xls", "xlsx"].includes(fileExt)
      ) {
        message.error("Please upload a valid CSV or Excel file");
        return;
      }
      handleBulkImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "#01134C" }}
        >
          <MdPeople size={22} style={{ color: "#E8FC0A" }} />
        </div>
        <div>
          <h2 className="module-title">Students</h2>
          <p className="module-subtitle">
            Manage student records & enrollment
          </p>
        </div>
      </div>
      <div>
        {/* Header Section */}
        <div
          style={{
            background: "white",
            borderRadius: "05px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div>
              <p
                style={{
                  color: "#718096",
                  margin: "8px 0 0 0",
                  fontSize: "14px",
                }}
              >
                Total Students: <strong>{students.length}</strong> | Showing:{" "}
                <strong>{filteredStudents.length}</strong> | Category:{" "}
                <strong>{STUDENT_CATEGORY_LABELS[activeStudentCategory]}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              {permissions.export && (
                <Button
                  type="default"
                  icon={<FaFileDownload />}
                  onClick={downloadStudentsWorkbook}
                  loading={exportingWorkbook}
                  size="middle"
                  style={{
                    background: "#EFF6FF",
                    borderColor: "#BFDBFE",
                    color: "#1D4ED8",
                    borderRadius: "10px",
                    height: "40px",
                    paddingInline: "16px",
                    fontWeight: 600,
                  }}
                >
                  Download Excel
                </Button>
              )}
              {permissions.import && (
                <Button
                  type="default"
                  icon={<FaFileImport />}
                  onClick={() => setImportModalVisible(true)}
                  size="middle"
                  style={{
                    background: "#F0FDF4",
                    borderColor: "#BBF7D0",
                    color: "#166534",
                    borderRadius: "10px",
                    height: "40px",
                    paddingInline: "16px",
                    fontWeight: 600,
                  }}
                >
                  Import Excel/CSV
                </Button>
              )}
              {permissions.create && (
                <Button
                  type="primary"
                  icon={<FaUserPlus />}
                  onClick={() => {
                    setModalVisible(true);
                    setEditMode(false);
                    setStudentFormTab("photo");
                    form.resetFields();
                  }}
                  size="middle"
                  style={{
                    background: "#01134C",
                    borderColor: "#01134C",
                    borderRadius: "10px",
                    height: "40px",
                    paddingInline: "16px",
                    fontWeight: 600,
                  }}
                >
                  Add New Student
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Input
              placeholder="Search..."
              prefix={<FaSearch style={{ color: "#667eea" }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="large"
              style={{
                width: 250,
                borderRadius: "10px",
                border: "2px solid #E2E8F0",
              }}
              allowClear
            />
            <Select
              value={genderFilter}
              onChange={setGenderFilter}
              size="large"
              style={{ width: 130, borderRadius: "10px" }}
            >
              <Option value="all">All Genders</Option>
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
            </Select>
            <Select
              value={enrollmentFilter}
              onChange={setEnrollmentFilter}
              size="large"
              style={{ width: 150, borderRadius: "10px" }}
            >
              <Option value="all">All Students</Option>
              <Option value="enrolled">Enrolled</Option>
              <Option value="not-enrolled">Not Enrolled</Option>
            </Select>
            <Select
              value={activeStudentCategory}
              onChange={setActiveStudentCategory}
              size="large"
              style={{ width: 170, borderRadius: "10px" }}
            >
              <Option value="all">All Categories</Option>
              <Option value="active">Active Students</Option>
              <Option value="dropout">Dropout Students</Option>
              <Option value="passout">Passout Students</Option>
            </Select>
            <Select
              value={courseFilter}
              onChange={setCourseFilter}
              size="large"
              style={{ width: 180, borderRadius: "10px" }}
              placeholder="Course"
            >
              <Option value="all">All Courses</Option>
              {courses.map((course) => (
                <Option key={course._id} value={course._id}>
                  {course.courseName}
                </Option>
              ))}
            </Select>
            <Select
              value={batchFilter}
              onChange={setBatchFilter}
              size="large"
              style={{ width: 180, borderRadius: "10px" }}
              placeholder="Batch"
            >
              <Option value="all">All Batches</Option>
              {availableBatches.map((batch) => (
                <Option key={batch._id} value={batch._id}>
                  {batch.batchName} [{batch.shift}]
                </Option>
              ))}
            </Select>
            <Tooltip title="Clear Filters">
              <Button
                icon={<FaFilter />}
                size="large"
                onClick={() => {
                  setSearchText("");
                  setGenderFilter("all");
                  setEnrollmentFilter("all");
                  setActiveStudentCategory("all");
                  setCourseFilter("all");
                  setBatchFilter("all");
                }}
                style={{
                  borderRadius: "10px",
                  borderColor: "#667eea",
                  color: "#667eea",
                }}
              >
                Clear
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Students Table */}
        <Card
          style={{
            borderRadius: "5px",
            border: "none",
          }}
        >
          <Collapse
            defaultActiveKey={["student-categories"]}
            style={{ marginBottom: "20px", borderRadius: "10px", overflow: "hidden" }}
            items={[
              {
                key: "student-categories",
                label: (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-[#01134C]">
                      Student Categories
                    </span>
                    <Tag color="blue">
                      All: {studentCategoryStats.all}
                    </Tag>
                    <Tag color="green">
                      Active: {studentCategoryStats.active}
                    </Tag>
                    <Tag color="red">
                      Dropout: {studentCategoryStats.dropout}
                    </Tag>
                    <Tag color="purple">
                      Passout: {studentCategoryStats.passout}
                    </Tag>
                  </div>
                ),
                children: (
                  <div className="flex flex-wrap gap-3">
                    {[
                      {
                        key: "all",
                        label: `All Students (${studentCategoryStats.all})`,
                      },
                      {
                        key: "active",
                        label: `Active Students (${studentCategoryStats.active})`,
                      },
                      {
                        key: "dropout",
                        label: `Dropout Students (${studentCategoryStats.dropout})`,
                      },
                      {
                        key: "passout",
                        label: `Passout Students (${studentCategoryStats.passout})`,
                      },
                    ].map((category) => (
                      <Button
                        key={category.key}
                        type={activeStudentCategory === category.key ? "primary" : "default"}
                        onClick={() => setActiveStudentCategory(category.key)}
                        style={{
                          borderRadius: "999px",
                          minWidth: "fit-content",
                        }}
                      >
                        {category.label}
                      </Button>
                    ))}
                  </div>
                ),
              },
            ]}
          />
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "100px 0",
              }}
            >
              <LoaderSpnar />
            </div>
          ) : filteredStudents.length === 0 ? (
            <Empty
              description={
                searchText ||
                genderFilter !== "all" ||
                enrollmentFilter !== "all" ||
                courseFilter !== "all" ||
                batchFilter !== "all"
                  ? `No ${STUDENT_CATEGORY_LABELS[
                      activeStudentCategory
                    ].toLowerCase()} match your search criteria`
                  : `No ${STUDENT_CATEGORY_LABELS[
                      activeStudentCategory
                    ].toLowerCase()} found`
              }
              style={{ padding: "60px 0" }}
            />
          ) : (
            <div className="bg-[#fff]  rounded-md overflow-x-auto">
              {bulkDeleteMode && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    padding: "12px 16px",
                    borderBottom: "1px solid #E5E7EB",
                    background: "#FFF7ED",
                  }}
                >
                  <div
                    style={{
                      color: "#9A3412",
                      fontSize: "14px",
                      lineHeight: 1.6,
                    }}
                  >
                    Delete more mode is active. Use the checkboxes in the table to
                    select students, or use the header checkbox to select all visible
                    records.
                  </div>
                  <Space wrap>
                    <Button
                      onClick={cancelBulkDeleteMode}
                      disabled={deleteLoading}
                      style={{ borderRadius: "8px" }}
                    >
                      Cancel Selection
                    </Button>
                    <Button
                      danger
                      type="primary"
                      loading={deleteLoading}
                      disabled={selectedDeleteIds.length === 0}
                      onClick={handleDeleteSelectedStudents}
                      style={{ borderRadius: "8px" }}
                    >
                      Delete Selected ({selectedDeleteIds.length})
                    </Button>
                  </Space>
                </div>
              )}
              <Table
                dataSource={filteredStudents}
                rowKey="_id"
                className="custom-pagination-table"
                rowSelection={
                  bulkDeleteMode
                    ? {
                        selectedRowKeys: selectedDeleteIds,
                        onChange: (selectedRowKeys) =>
                          setSelectedDeleteIds(selectedRowKeys),
                        preserveSelectedRowKeys: false,
                      }
                    : undefined
                }
                pagination={{
                  current: tablePage,
                  pageSize: tablePageSize,
                  showSizeChanger: true,
                  pageSizeOptions: [3, 5, 10, 25, 50, 100],
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} students`,
                  style: { marginTop: "20px" },
                  onChange: (page, size) => {
                    setTablePage(page);
                    setTablePageSize(size);
                  },
                  onShowSizeChange: (current, size) => {
                    setTablePageSize(size);
                    setTablePage(1);
                  },
                }}
                locale={{
                  emptyText: (
                    <div className="w-full h-[300px] flex justify-center items-center">
                      <span className="text-[14px] text-gray-500">
                        No students found
                      </span>
                    </div>
                  ),
                }}
              >
                {/* Profile Picture & Name Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      Student
                    </span>
                  }
                  key="student"
                  width={280}
                  fixed="left"
                  render={(record) => (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <Avatar
                          size={50}
                          src={record.profilePicture || null}
                          icon={
                            record.gender === "Male" ? (
                              <FaMale style={{ fontSize: "24px" }} />
                            ) : (
                              <FaFemale style={{ fontSize: "24px" }} />
                            )
                          }
                          style={{
                            background:
                              record.gender === "Male"
                                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          }}
                        />
                        <Badge
                          count={record.enrollments?.length || 0}
                          style={{
                            position: "absolute",
                            top: -5,
                            right: -5,
                            background: "#4ECDC4",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "#2D3748",
                            marginBottom: "2px",
                          }}
                        >
                          {record.studentName}
                        </div>
                        {getVisibleRegistrationNo(record) && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#667eea",
                              fontWeight: "500",
                            }}
                          >
                            {getVisibleRegistrationNo(record)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                />

                {/* Contact Info Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      Contact Details
                    </span>
                  }
                  key="contact"
                  width={220}
                  render={(record) => (
                    <div style={{ fontSize: "13px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginBottom: "6px",
                          color: "#4A5568",
                        }}
                      >
                        <FaPhone style={{ color: "#16a34a", fontSize: "12px" }} />
                        <span>{record.mobileNumber || "N/A"}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#4A5568",
                        }}
                      >
                        <FaCalendar style={{ color: "#d97706", fontSize: "12px" }} />
                        <span>
                          {record.registrationDate
                            ? dayjs(record.registrationDate).format("DD/MM/YYYY")
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                />

                {/* Father Info Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      Father Information
                    </span>
                  }
                  key="father"
                  width={220}
                  render={(record) => (
                    <div style={{ fontSize: "13px" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#2D3748",
                          marginBottom: "4px",
                        }}
                      >
                        {record.fatherName || "N/A"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#718096",
                        }}
                      >
                        <FaPhone style={{ fontSize: "11px", color: "#e11d48" }} />
                        <span>{record.fatherContact || "N/A"}</span>
                      </div>
                    </div>
                  )}
                />

                {/* Enrollment Summary Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      {activeStudentCategory === "active" ? "Enrollment" : "Student Status"}
                    </span>
                  }
                  key="courses"
                  width={260}
                  render={(record) => {
                    const lifecycleStatus = getStudentLifecycleStatus(record);
                    const activeEnrollments = Array.isArray(record.enrollments)
                      ? record.enrollments.filter(
                          (enrollment) =>
                            ACTIVE_ENROLLMENT_STATUS_SET.has(
                              normalizeEnrollmentStatus(enrollment.status),
                            ),
                        )
                      : [];

                    if (activeStudentCategory !== "active") {
                      return (
                        <div>
                          <Tag
                            color={lifecycleStatus.color}
                            style={{
                              width: "fit-content",
                              margin: 0,
                              fontSize: "12px",
                              fontWeight: 600,
                              paddingInline: "10px",
                              borderRadius: "999px",
                            }}
                          >
                            {lifecycleStatus.label}
                          </Tag>
                        </div>
                      );
                    }

                    return (
                    <div>
                      {activeEnrollments.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {activeEnrollments.slice(0, 1).map((enrollment) => (
                            <Tooltip
                              key={enrollment._id}
                              title={
                                <div>
                                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                                    {enrollment.course?.courseName}
                                  </div>
                                  {enrollment.batch && (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        marginBottom: "4px",
                                        padding: "4px 8px",
                                        background: "rgba(102, 126, 234, 0.2)",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      <strong>Batch:</strong>{" "}
                                      {enrollment.batch.batchName} [{enrollment.batch.shift}]
                                    </div>
                                  )}
                                  <div style={{ fontSize: "11px", marginBottom: "2px" }}>
                                    <strong>Instructors:</strong>
                                  </div>
                                  {enrollment.course?.teacherId?.map((teacher, idx) => (
                                    <div
                                      key={idx}
                                      style={{ fontSize: "11px", marginLeft: "8px" }}
                                    >
                                      • {teacher.fullName || "N/A"}
                                    </div>
                                  ))}
                                  <div style={{ fontSize: "11px", marginTop: "4px" }}>
                                    <strong>Enrolled:</strong>{" "}
                                    {dayjs(enrollment.enrollmentDate).format("DD MMM YYYY")}
                                  </div>
                                </div>
                              }
                            >
                              <div
                                style={{
                                  background:
                                    "linear-gradient(135deg, #E0E7FF 0%, #F3E8FF 100%)",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid #C7D2FE",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateX(4px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 8px rgba(102, 126, 234, 0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateX(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#4C51BF",
                                        display: "block",
                                      }}
                                    >
                                      {enrollment.course?.courseName || "N/A"}
                                    </span>
                                    {enrollment.batch && (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          color: "#6B7280",
                                          fontWeight: "500",
                                          display: "block",
                                          marginTop: "2px",
                                        }}
                                      >
                                        Batch: {enrollment.batch.batchName} [{enrollment.batch.shift}]
                                      </span>
                                    )}
                                  </div>
                                  <Tag color="green" style={{ fontSize: "10px", margin: 0 }}>
                                    Active
                                  </Tag>
                                </div>
                                {enrollment.batch && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      fontSize: "11px",
                                      color: "#6B7280",
                                      marginBottom: "4px",
                                      background: "rgba(102, 126, 234, 0.1)",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    <FaBook style={{ fontSize: "10px" }} />
                                    <span style={{ fontWeight: "500" }}>
                                      {enrollment.batch.days}
                                    </span>
                                  </div>
                                )}
                                {enrollment.course?.teacherId &&
                                  enrollment.course.teacherId.length > 0 && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "11px",
                                        color: "#6B7280",
                                      }}
                                    >
                                      <FaChalkboardTeacher style={{ fontSize: "10px" }} />
                                      <span>
                                        {enrollment.course.teacherId.length}{" "}
                                        {enrollment.course.teacherId.length === 1
                                          ? "Instructor"
                                          : "Instructors"}
                                      </span>
                                    </div>
                                  )}
                                <div
                                  style={{
                                    marginTop: "10px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#64748B",
                                    }}
                                  >
                                    Assigned on{" "}
                                    {dayjs(enrollment.enrollmentDate).format("DD MMM YYYY")}
                                  </div>
                                  {permissions.update && (
                                    <Button
                                      size="small"
                                      icon={<FaEdit />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditCourseModal(record, enrollment);
                                      }}
                                      style={{
                                        borderColor: "#C7D2FE",
                                        color: "#312E81",
                                        background: "#EEF2FF",
                                        borderRadius: "999px",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Edit Course
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Tooltip>
                          ))}
                          {activeEnrollments.length > 1 && (
                            <Tag
                              color="blue"
                              style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                textAlign: "center",
                                width: "fit-content",
                              }}
                            >
                              {activeEnrollments.length} active courses
                            </Tag>
                          )}
                        </div>
                      ) : (
                        <Tag color="default" style={{ fontSize: "12px" }}>
                          No active enrollments
                        </Tag>
                      )}
                    </div>
                    );
                  }}
                />

                {/* Actions Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      Actions
                    </span>
                  }
                  key="actions"
                  width={270}
                  fixed="right"
                  render={(record) => {
                    const showManagementActions = activeStudentCategory === "all";
                    const showStatusAction =
                      permissions.update &&
                      ["active", "dropout", "passout"].includes(
                        activeStudentCategory,
                      );

                    return (
                      <Space size="small" wrap>
                        {showManagementActions && permissions.create && (
                          <Tooltip title="Assign Course">
                            <Button
                              onClick={() => openCourseAssignModal(record)}
                              style={{
                                background: "#ECFDF5",
                                borderColor: "#A7F3D0",
                                color: "#065F46",
                                borderRadius: "999px",
                                fontWeight: 600,
                              }}
                              size="small"
                            >
                              Assign Course
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title="View Full Profile">
                          <Button
                            type="primary"
                            icon={<FaEye />}
                            onClick={() => navigate(`/dashboard/students/${record._id}`)}
                            style={{
                              background: "#01134C",
                              borderColor: "#01134C",
                              borderRadius: "8px",
                            }}
                            size="small"
                          />
                        </Tooltip>
                        {showStatusAction && (
                          <Tooltip title="Change Student Status">
                            <Button
                              icon={<FaEdit />}
                              onClick={() => openStatusChangeModal(record)}
                              style={{
                                borderColor: "#C7D2FE",
                                color: "#312E81",
                                background: "#EEF2FF",
                                borderRadius: "8px",
                                fontWeight: 600,
                              }}
                              size="small"
                            >
                              Change Status
                            </Button>
                          </Tooltip>
                        )}
                        {showManagementActions && permissions.update && (
                          <Tooltip title="Edit Student">
                            <Button
                              icon={<FaEdit />}
                              onClick={() => openEditModal(record)}
                              style={{
                                borderColor: "#667eea",
                                color: "#667eea",
                                borderRadius: "8px",
                              }}
                              size="small"
                            />
                          </Tooltip>
                        )}
                        {showManagementActions && permissions.delete && (
                          <Tooltip title="Delete Student">
                            <Button
                              danger
                              icon={<FaTrash />}
                              onClick={() => openDeleteStudentDialog(record)}
                              style={{ borderRadius: "8px" }}
                              size="small"
                            />
                          </Tooltip>
                        )}
                      </Space>
                    );
                  }}
                />
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={statusModalVisible}
        centered
        onCancel={closeStatusChangeModal}
        onOk={handleStudentStatusUpdate}
        confirmLoading={statusLoading}
        okText="Confirm Status Change"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: "#01134C",
            borderColor: "#01134C",
            height: 42,
            borderRadius: 10,
            fontWeight: 600,
          },
        }}
        cancelButtonProps={{
          style: {
            height: 42,
            borderRadius: 10,
            fontWeight: 600,
          },
        }}
        width={560}
        title={null}
      >
        <div
          style={{
            padding: "8px 4px 4px",
            fontFamily: "inherit",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #01134C 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <FaEdit style={{ color: "#E8FC0A", fontSize: 22 }} />
          </div>

          <h3
            style={{
              marginBottom: 8,
              color: "#0F172A",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            Update Student Status
          </h3>
          <p style={{ color: "#475569", marginBottom: 18 }}>
            Change the status for{" "}
            <strong>{studentStatusRecord?.studentName || "this student"}</strong>.
            After confirmation, the student will move to the matching category
            automatically.
          </p>

          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 6 }}>
              Student
            </div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>
              {studentStatusRecord?.studentName || "N/A"}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              Registration No:{" "}
              {studentStatusRecord?.registrationNo || "No registration no"}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#0F172A",
                marginBottom: 8,
              }}
            >
              Select new status
            </div>
            <Select
              value={selectedStudentStatus}
              onChange={setSelectedStudentStatus}
              style={{ width: "100%" }}
              size="large"
              options={getAvailableStatusOptions(activeStudentCategory).map(
                (option) => ({
                  label: option.label,
                  value: option.value,
                }),
              )}
            />
            <div
              style={{
                marginTop: 12,
                borderRadius: 12,
                padding: "12px 14px",
                background:
                  STUDENT_STATUS_OPTIONS.find(
                    (option) => option.value === selectedStudentStatus,
                  )?.bg || "#F8FAFC",
                color:
                  STUDENT_STATUS_OPTIONS.find(
                    (option) => option.value === selectedStudentStatus,
                  )?.color || "#334155",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {
                STUDENT_STATUS_OPTIONS.find(
                  (option) => option.value === selectedStudentStatus,
                )?.helper
              }
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteDialogVisible}
        onCancel={() => closeDeleteStudentDialog()}
        footer={null}
        centered
        width={520}
      >
        <div style={{ padding: "8px 4px" }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1F2937",
              marginBottom: "10px",
            }}
          >
            Delete Student Record
          </div>
          <p
            style={{
              color: "#6B7280",
              fontSize: "14px",
              lineHeight: 1.6,
              marginBottom: "18px",
            }}
          >
            Choose whether you want to delete only{" "}
            <strong>{studentToDelete?.studentName || "this student"}</strong> or switch
            to multi-select mode and choose several student records from the table.
          </p>

          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: "12px",
              padding: "12px 14px",
              color: "#9A3412",
              fontSize: "13px",
              marginBottom: "18px",
            }}
          >
            Delete more will open checkboxes for all records in the current table so the
            admin can choose exactly which students to remove.
          </div>

          <div className="flex gap-3 justify-end flex-wrap">
            <Button
              onClick={() => closeDeleteStudentDialog()}
              disabled={deleteLoading}
              style={{ borderRadius: "10px", height: "40px", paddingInline: "16px" }}
            >
              Cancel
            </Button>
            <Button
              danger
              loading={deleteLoading}
              onClick={() => handleDeleteStudentChoice("single")}
              style={{ borderRadius: "10px", height: "40px", paddingInline: "16px" }}
            >
              Only This Student
            </Button>
            <Button
              type="primary"
              loading={deleteLoading}
              onClick={startBulkDeleteMode}
              style={{ borderRadius: "10px", height: "40px", paddingInline: "16px" }}
            >
              Delete More
            </Button>
          </div>
        </div>
      </Modal>

      {/* Student Form Modal */}
      <Modal
        title={
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2D3748" }}>
            {editMode ? "Edit Student" : "Add New Student"}
          </div>
        }
        open={modalVisible}
        onCancel={closeStudentModal}
        footer={null}
        width={960}
        centered
        styles={{
          body: {
            paddingTop: 12,
            maxHeight: "78vh",
            overflow: "hidden",
          },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editMode ? handleEditStudent : handleCreateStudent}
          style={{ marginTop: "12px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <Tag color="blue">{editMode ? "Edit Student" : "New Student"}</Tag>
              {!editMode && <Tag color="purple">Step-by-step form</Tag>}
              {!editMode && (
                <Tag color="geekblue">
                  Step {currentStudentStepIndex + 1} of {STUDENT_FORM_STEPS.length}
                </Tag>
              )}
            </div>

            {!editMode && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
                  border: "1px solid #C7D2FE",
                  color: "#4338CA",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                {isLastStudentStep
                  ? "Final step: review this tab and click Create Student to save the record."
                  : `Complete the ${currentStudentStep.label} tab, then click ${
                      nextStudentStep?.label ? `Next: ${nextStudentStep.label}` : "Next"
                    } to continue.`}
              </div>
            )}

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                paddingRight: "4px",
              }}
            >
              <Tabs
                activeKey={studentFormTab}
                onChange={setStudentFormTab}
                items={[
                  {
                    key: "photo",
                    label: "Photo",
                    children: (
                      <div
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                          padding: "25px",
                          borderRadius: "16px",
                          border: "2px dashed #667eea",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "120px",
                              height: "120px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                              border: "4px solid white",
                              position: "relative",
                            }}
                          >
                            {profilePictureUrl ? (
                              <img
                                src={profilePictureUrl}
                                alt="Profile"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <FaUser style={{ fontSize: "50px", color: "#667eea", opacity: 0.5 }} />
                            )}
                          </div>
                          <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setProfilePictureUrl(e.target.result);
                              };
                              reader.readAsDataURL(file);
                              setProfilePicture(file);
                              return false;
                            }}
                          >
                            <Button
                              icon={<FaCamera />}
                              style={{
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                border: "none",
                                color: "white",
                                borderRadius: "8px",
                                height: "40px",
                                padding: "0 25px",
                                fontWeight: "600",
                              }}
                            >
                              {profilePictureUrl ? "Change Photo" : "Upload Photo"}
                            </Button>
                          </Upload>
                          <p style={{ margin: 0, fontSize: "12px", color: "#718096" }}>
                            Recommended: Square image, max 5MB
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "basic",
                    label: "Basic Info",
                    children: (
                      <div
                        style={{
                          background: "#F7FAFC",
                          padding: "20px",
                          borderRadius: "12px",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 15px 0",
                            color: "#667eea",
                            fontSize: "14px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <FaUser /> BASIC INFORMATION
                        </h4>
                        <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="registrationNo"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Registration No{" "}
                      <span style={{ fontSize: "11px", color: "#999" }}>
                        (optional, usually imported from Excel/CSV)
                      </span>
                    </span>
                  }
                  initialValue={null}
                >
                  <Input
                    size="large"
                    placeholder="Leave empty if not provided in import file"
                    disabled
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="registrationDate"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Registration Date
                    </span>
                  }
                  rules={[{ required: true, message: "Please select Registration Date" }]}
                >
                  <DatePicker style={{ width: "100%" }} size="large" />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="studentName"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Student Name
                    </span>
                  }
                  rules={[{ required: true, message: "Please enter Student Name" }]}
                >
                  <Input
                    size="large"
                    placeholder="Full Name"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="gender"
                  label={
                    <span className="text-md !text-[14px] opacity-40">Gender</span>
                  }
                  rules={[{ required: true, message: "Please select Gender" }]}
                >
                  <Select placeholder="Select Gender" size="large">
                    <Option value="Male">Male</Option>
                    <Option value="Female">Female</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="dateOfBirth"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Date of Birth
                    </span>
                  }
                  rules={[{ required: true, message: "Please select Date of Birth" }]}
                >
                  <DatePicker style={{ width: "100%" }} size="large" />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="cnicOrBForm"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      CNIC/B-Form
                    </span>
                  }
                  rules={[
                    { required: true, message: "Required" },
                    { pattern: /^\d{13}$/, message: "Must be exactly 13 digits" },
                  ]}
                  validateTrigger="onChange"
                >
                  <Input
                    size="large"
                    placeholder="XXXXXXXXXXXXX"
                    className="form-input !font-ArialLight"
                    maxLength={13}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="religion"
                  label={
                    <span className="text-md !text-[14px] opacity-40">Religion</span>
                  }
                  rules={[{ required: true, message: "Please select Religion" }]}
                >
                  <Select placeholder="Select Religion" size="large">
                    <Option value="Muslim">Muslim</Option>
                    <Option value="Non-Muslim">Non-Muslim</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="caste"
                  label={
                    <span className="text-md !text-[14px] opacity-40">Caste</span>
                  }
                >
                  <Input
                    size="large"
                    placeholder="Caste"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="mobileNumber"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Mobile Number
                    </span>
                  }
                  rules={[
                    { required: true, message: "Required" },
                    { pattern: /^\d{10,11}$/, message: "Must be 10-11 digits" },
                  ]}
                  validateTrigger="onChange"
                >
                  <Input
                    size="large"
                    placeholder="03XXXXXXXXX"
                    className="form-input !font-ArialLight"
                    maxLength={11}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="disability"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Disability
                    </span>
                  }
                  rules={[{ required: true, message: "Please select" }]}
                >
                  <Radio.Group size="large" className="w-full">
                    <Radio value={false}>No</Radio>
                    <Radio value={true}>Yes</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
                        </Row>
                      </div>
                    ),
                  },
                  {
                    key: "family",
                    label: "Family",
                    children: (
                      <div
                        style={{
                          background: "#FFF5F5",
                          padding: "20px",
                          borderRadius: "12px",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 15px 0",
                            color: "#F56565",
                            fontSize: "14px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <FaUser /> FAMILY INFORMATION
                        </h4>
                        <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="fatherName"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Father Name
                    </span>
                  }
                  rules={[{ required: true, message: "Please enter Father Name" }]}
                >
                  <Input
                    size="large"
                    placeholder="Father's Full Name"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="fatherCnic"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Father CNIC
                    </span>
                  }
                  rules={[
                    { required: true, message: "Required" },
                    { pattern: /^\d{13}$/, message: "Must be exactly 13 digits" },
                  ]}
                  validateTrigger="onChange"
                >
                  <Input
                    size="large"
                    placeholder="XXXXXXXXXXXXX"
                    className="form-input !font-ArialLight"
                    maxLength={13}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="fatherOccupation"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Father Occupation
                    </span>
                  }
                >
                  <Input
                    size="large"
                    placeholder="Occupation"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="fatherContact"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Father Contact
                    </span>
                  }
                  rules={[
                    { required: true, message: "Required" },
                    { pattern: /^\d{10,11}$/, message: "Must be 10-11 digits" },
                  ]}
                  validateTrigger="onChange"
                >
                  <Input
                    size="large"
                    placeholder="03XXXXXXXXX"
                    className="form-input !font-ArialLight"
                    maxLength={11}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="motherName"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Mother Name
                    </span>
                  }
                >
                  <Input
                    size="large"
                    placeholder="Mother's Full Name"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={16}>
                <Form.Item
                  name="guardianName"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Guardian Name
                    </span>
                  }
                >
                  <Input
                    size="large"
                    placeholder="Guardian's Full Name"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="guardianContact"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Guardian Contact
                    </span>
                  }
                  rules={[
                    { pattern: /^\d{10,11}$/, message: "Must be 10-11 digits" },
                  ]}
                  validateTrigger="onChange"
                >
                  <Input
                    size="large"
                    placeholder="03XXXXXXXXX"
                    className="form-input !font-ArialLight"
                    maxLength={11}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    }}
                  />
                </Form.Item>
              </Col>
                        </Row>
                      </div>
                    ),
                  },
                  {
                    key: "additional",
                    label: "Additional",
                    children: (
                      <div
                        style={{
                          background: "#F0FFF4",
                          padding: "20px",
                          borderRadius: "12px",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 15px 0",
                            color: "#48BB78",
                            fontSize: "14px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <FaBook /> ADDITIONAL INFORMATION
                        </h4>
                        <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="previousSchoolCollege"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Previous School/College
                    </span>
                  }
                >
                  <Input
                    size="large"
                    placeholder="School/College Name"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="lastClassAttended"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Last Class Attended
                    </span>
                  }
                >
                  <Input
                    size="large"
                    placeholder="e.g., 10th, 12th"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="emergencyContactNumber"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Emergency Contact
                    </span>
                  }
                  rules={[
                    { required: true, message: "Required" },
                    { pattern: /^\d{10,11}$/, message: "Must be 10-11 digits" },
                  ]}
                  validateTrigger="onChange"
                >
                  <Input
                    size="large"
                    placeholder="Emergency Contact Number"
                    className="form-input !font-ArialLight"
                    maxLength={11}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="permanentAddress"
                  label={
                    <span className="text-md !text-[14px] opacity-40">
                      Permanent Address
                    </span>
                  }
                  rules={[{ required: true, message: "Required" }]}
                >
                  <TextArea
                    rows={2}
                    placeholder="Complete Permanent Address"
                    className="form-input !font-ArialLight"
                  />
                </Form.Item>
              </Col>
                        </Row>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                marginTop: "20px",
                paddingTop: "20px",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Space wrap>
                {STUDENT_FORM_STEPS.map((step) => (
                  <Button
                    key={step.key}
                    type={studentFormTab === step.key ? "primary" : "default"}
                    onClick={() => setStudentFormTab(step.key)}
                    style={
                      studentFormTab === step.key
                        ? {
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            border: "none",
                            borderRadius: "8px",
                          }
                        : { borderRadius: "8px" }
                    }
                  >
                    {step.label}
                  </Button>
                ))}
              </Space>
              <Space>
                <Button
                  onClick={closeStudentModal}
                  style={{ borderRadius: "6px" }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  onClick={editMode ? () => form.submit() : handleStudentStepAction}
                  loading={loading}
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none",
                    borderRadius: "6px",
                  }}
                >
                  {editMode
                    ? "Update Student"
                    : isLastStudentStep
                      ? "Create Student"
                      : `Next: ${nextStudentStep?.label || "Continue"}`}
                </Button>
              </Space>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Course Assignment Modal */}
      <CourseAssignmentForm
        visible={courseModalVisible}
        onCancel={() => {
          setCourseModalVisible(false);
          courseForm.resetFields();
          setEditingEnrollment(null);
        }}
        onFinish={handleAssignCourse}
        form={courseForm}
        courses={courses}
        selectedStudent={selectedStudent}
        loading={loading}
        editingEnrollment={editingEnrollment}
      />

      {/* Fee Profile Modal */}
      <Modal
        title={
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2D3748" }}>
            Fee Profile - {selectedStudent?.studentName}
          </div>
        }
        open={feeProfileModalVisible}
        onCancel={() => setFeeProfileModalVisible(false)}
        footer={
          permissions.print ? (
            <Button
              type="primary"
              icon={<FaFileDownload />}
              onClick={() => downloadFeePDF(selectedStudent)}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "6px",
              }}
            >
              Download Fee Report
            </Button>
          ) : null
        }
        width={1200}
        centered
      >
        {selectedStudent ? (
          <StudentFeeProfile
            studentId={selectedStudent._id}
            studentInfo={selectedStudent}
            onEnrollmentChanged={fetchStudents}
          />
        ) : (
          <Empty description="No student selected" style={{ margin: "40px 0" }} />
        )}
      </Modal>

      {/* Partial Payment Modal */}
      <Modal
        title={
          <div style={{ fontSize: "16px", fontWeight: "600" }}>
            💰 Enter Partial Payment
          </div>
        }
        open={partialPaymentModalVisible}
        onOk={() => {
          const amount = parseFloat(partialAmount);
          if (!partialAmount || isNaN(amount) || amount <= 0) {
            message.error("Please enter a valid amount");
            return;
          }
          if (amount > currentInstallment?.maxAmount) {
            message.error(`Amount cannot exceed ${currentInstallment?.maxAmount} PKR`);
            return;
          }
          handleUpdateInstallmentStatus(
            currentInstallment.feeStructureId,
            currentInstallment.installmentId,
            amount >= currentInstallment.maxAmount ? "Paid" : "Partial",
            amount,
          );
          setPartialPaymentModalVisible(false);
          setPartialAmount("");
          setCurrentInstallment(null);
        }}
        onCancel={() => {
          setPartialPaymentModalVisible(false);
          setPartialAmount("");
          setCurrentInstallment(null);
        }}
        okText="Submit Payment"
        cancelText="Cancel"
        width={450}
        centered
      >
        <div style={{ padding: "20px 0" }}>
          <p style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
            Installment #{currentInstallment?.installmentNumber}
          </p>
          <p
            style={{
              marginBottom: "20px",
              fontSize: "13px",
              color: "#888",
              background: "#F3F4F6",
              padding: "10px",
              borderRadius: "6px",
            }}
          >
            Maximum Amount:{" "}
            <strong style={{ color: "#059669" }}>
              {currentInstallment?.maxAmount} PKR
            </strong>
          </p>
          <Form.Item
            label={<span style={{ fontWeight: "500" }}>Payment Amount (PKR)</span>}
            required
          >
            <Input
              type="number"
              placeholder="Enter amount"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              min={1}
              max={currentInstallment?.maxAmount}
              style={{ height: "40px", fontSize: "15px", borderRadius: "6px" }}
              autoFocus
              onPressEnter={() => {
                const amount = parseFloat(partialAmount);
                if (amount > 0 && amount <= currentInstallment?.maxAmount) {
                  handleUpdateInstallmentStatus(
                    currentInstallment.feeStructureId,
                    currentInstallment.installmentId,
                    amount >= currentInstallment.maxAmount ? "Paid" : "Partial",
                    amount,
                  );
                  setPartialPaymentModalVisible(false);
                  setPartialAmount("");
                  setCurrentInstallment(null);
                }
              }}
            />
          </Form.Item>
          {partialAmount && parseFloat(partialAmount) > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px",
                background:
                  parseFloat(partialAmount) >= currentInstallment?.maxAmount
                    ? "#ECFDF5"
                    : "#FEF3C7",
                border: `1px solid ${
                  parseFloat(partialAmount) >= currentInstallment?.maxAmount
                    ? "#10B981"
                    : "#F59E0B"
                }`,
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              <strong>
                {parseFloat(partialAmount) >= currentInstallment?.maxAmount
                  ? "✓ Full Payment"
                  : "⚡ Partial Payment"}
              </strong>
              <div style={{ marginTop: "4px", color: "#666" }}>
                {parseFloat(partialAmount) < currentInstallment?.maxAmount && (
                  <>
                    Remaining:{" "}
                    {currentInstallment?.maxAmount - parseFloat(partialAmount)} PKR
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        title={
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#107c41",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FaFileExcel style={{ fontSize: "24px" }} />
            Import Students Workbook
          </div>
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportResult(null);
        }}
        footer={null}
        width={600}
        centered
      >
        <div style={{ padding: "20px 0" }}>
          <div
            style={{
              border: "2px dashed #107c41",
              borderRadius: "12px",
              padding: "40px",
              textAlign: "center",
              background: "#f0fdf4",
              marginBottom: "20px",
            }}
          >
            <FaFileExcel
              style={{ fontSize: "48px", color: "#107c41", marginBottom: "16px" }}
            />
            <p
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#166534",
                marginBottom: "8px",
              }}
            >
              Drop your Excel/CSV file here, or click to browse
            </p>
            <p
              style={{ fontSize: "13px", color: "#15803d", marginBottom: "16px" }}
            >
              Supported formats: .xlsx, .xls, .csv
            </p>
            <Button
              type="primary"
              onClick={triggerFileInput}
              loading={importing}
              style={{
                background: "#107c41",
                borderColor: "#107c41",
                height: "40px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              <FaFileImport style={{ marginRight: "8px" }} />
              {importing ? "Importing..." : "Select File"}
            </Button>
            <Button
              onClick={downloadImportTemplate}
              style={{
                marginLeft: "10px",
                height: "40px",
                borderColor: "#107c41",
                color: "#107c41",
                fontWeight: "600",
              }}
            >
              <FaFileDownload style={{ marginRight: "8px" }} />
              Download Template
            </Button>
          </div>

          <div
            style={{
              background: "#F3F4F6",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                fontSize: "14px",
                color: "#374151",
                fontWeight: "600",
              }}
            >
              Workbook Tabs:
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: "20px",
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              <li><strong>Students</strong>: basic student information. Required for new students.</li>
              <li><strong>Enrollments</strong>: course assignment, batch, fee values, discount, plan type.</li>
              <li><strong>Installments</strong>: optional custom installment rows for each student-course.</li>
              <li><strong>Additional Fees</strong>: optional extra charges like exam, registration, or other fees.</li>
              <li><strong>Payments</strong>: optional imported payments so receipt/accounting tables also update.</li>
            </ul>
          </div>

          {importResult && (
            <div
              style={{
                background: importResult.errors?.length > 0 ? "#FEF3C7" : "#ECFDF5",
                padding: "16px",
                borderRadius: "8px",
                border: `1px solid ${
                  importResult.errors?.length > 0 ? "#F59E0B" : "#10B981"
                }`,
              }}
            >
              <h4
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  color: importResult.errors?.length > 0 ? "#92400E" : "#065F46",
                  fontWeight: "600",
                }}
              >
                Import Summary
              </h4>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#374151" }}>
                <strong>{importResult.imported}</strong> new students imported
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#374151" }}>
                <strong>{importResult.coursesAssigned || 0}</strong> course assignments created
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#374151" }}>
                <strong>{importResult.enrollmentsUpdated || 0}</strong> existing enrollments updated
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#374151" }}>
                <strong>{importResult.paymentsImported || 0}</strong> payments imported
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#374151" }}>
                <strong>{importResult.courseSkipped || 0}</strong> course assignments skipped
              </p>
              {importResult.errors?.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: "13px",
                      color: "#B45309",
                      fontWeight: "600",
                    }}
                  >
                    <strong>{importResult.errors.length}</strong> errors
                  </p>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      marginTop: "8px",
                      padding: "8px",
                      background: "white",
                      borderRadius: "4px",
                    }}
                  >
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <p
                        key={idx}
                        style={{ margin: "4px 0", fontSize: "12px", color: "#DC2626" }}
                      >
                        Row {err.row}: {err.error}
                      </p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p
                        style={{
                          margin: "8px 0 0 0",
                          fontSize: "12px",
                          color: "#6B7280",
                          fontStyle: "italic",
                        }}
                      >
                        ...and {importResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Hidden file input for bulk import */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".csv,.xlsx,.xls"
        onChange={onFileChange}
      />
    </>
  );
};

// ─── FEE PDF (per-enrollment pages) ───────────────────────────────────────────
const downloadFeePDF = async (student) => {
  if (!permissions.print) {
    message.error("You do not have permission to download fee reports");
    return;
  }
  if (!student?.enrollments || student.enrollments.length === 0) {
    message.warning("No enrollments found for this student");
    return;
  }

  try {
    const logoDataUrl = await loadLogoBase64(odysseyLogo);
    const doc         = new jsPDF({ unit: "mm", format: "a4" });

    student.enrollments.forEach((enrollment, index) => {
      if (index > 0) doc.addPage();

      const pageW   = doc.internal.pageSize.width;
      const margin  = 14;
      const colW    = pageW - margin * 2;

      // ── Header (light bg) ──
      let y = drawPdfHeader(
        doc,
        logoDataUrl,
        enrollment.course?.courseName || "Fee Report",
      );

      // ── Student info strip ──
      setFill(doc, PDF_COLORS.neutralBg);
      doc.rect(margin, y, colW, 14, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      setTxt(doc, PDF_COLORS.primary);
      doc.text("Student", margin + 4, y + 5);

      doc.setFont("helvetica", "normal");
      setTxt(doc, PDF_COLORS.dark);
      doc.text(student.studentName || "—", margin + 4, y + 10);

      doc.setFont("helvetica", "bold");
      setTxt(doc, PDF_COLORS.primary);
      doc.text("Reg. No", margin + 55, y + 5);
      doc.setFont("helvetica", "normal");
      setTxt(doc, PDF_COLORS.dark);
      doc.text(getVisibleRegistrationNo(student) || "—", margin + 55, y + 10);

      doc.setFont("helvetica", "bold");
      setTxt(doc, PDF_COLORS.primary);
      doc.text("Father", margin + 105, y + 5);
      doc.setFont("helvetica", "normal");
      setTxt(doc, PDF_COLORS.dark);
      doc.text(student.fatherName || "—", margin + 105, y + 10);

      y += 20;

      // ── Fee summary boxes ──
      const admissionFee   = enrollment.admissionFee   || enrollment.feeStructure?.admissionFee   || 0;
      const courseFee      = enrollment.courseFee      || enrollment.feeStructure?.courseFee      || 0;
      const certificateFee = enrollment.certificateFee || enrollment.feeStructure?.certificateFee || 0;
      const totalFee       = enrollment.totalFee       || enrollment.feeStructure?.totalFee       || (admissionFee + courseFee + certificateFee);
      const discount       = enrollment.discount       || enrollment.feeStructure?.discount       || 0;
      const paidAmount     = enrollment.paidAmount     || enrollment.feeStructure?.paidAmount     || 0;
      const remaining      = totalFee - paidAmount;

      const boxW  = (colW - 8) / 3;
      const boxH  = 22;

      const feeBoxes = [
        { label: "Admission Fee",   value: admissionFee,   x: margin },
        { label: "Course Fee",      value: courseFee,      x: margin + boxW + 4 },
        { label: "Certificate Fee", value: certificateFee, x: margin + (boxW + 4) * 2 },
      ];

      feeBoxes.forEach(({ label, value, x }) => {
        setFill(doc, PDF_COLORS.primaryLight);
        doc.roundedRect(x, y, boxW, boxH, 2, 2, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setTxt(doc, PDF_COLORS.mid);
        doc.text(label, x + boxW / 2, y + 7, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setTxt(doc, PDF_COLORS.primary);
        doc.text(`${value.toLocaleString()}`, x + boxW / 2, y + 16, { align: "center" });
      });

      y += boxH + 6;

      // ── Total fee banner ──
      setFill(doc, PDF_COLORS.primary);
      doc.roundedRect(margin, y, colW, 14, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setTxt(doc, [180, 200, 240]);
      doc.text("TOTAL FEE", margin + 6, y + 9);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      setTxt(doc, PDF_COLORS.white);
      doc.text(`PKR ${totalFee.toLocaleString()}`, pageW - margin - 4, y + 9, { align: "right" });
      y += 20;

      // ── Discount / Paid / Remaining row ──
      const qW = colW / 3;
      const statBoxes = [
        { label: "Discount Applied", value: `- ${discount.toLocaleString()} PKR`, color: PDF_COLORS.warnFg,    bg: PDF_COLORS.warnBg },
        { label: "Paid Amount",      value: `${paidAmount.toLocaleString()} PKR`, color: PDF_COLORS.successFg, bg: PDF_COLORS.successBg },
        { label: "Remaining Balance",value: `${remaining.toLocaleString()} PKR`,  color: [190, 35, 35],        bg: PDF_COLORS.dangerBg },
      ];

      statBoxes.forEach(({ label, value, color, bg }, i) => {
        const bx = margin + i * qW + (i > 0 ? 2 : 0);
        setFill(doc, bg);
        doc.roundedRect(bx, y, qW - 2, 16, 2, 2, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setTxt(doc, PDF_COLORS.mid);
        doc.text(label, bx + (qW - 2) / 2, y + 5.5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setTxt(doc, color);
        doc.text(value, bx + (qW - 2) / 2, y + 12, { align: "center" });
      });

      y += 22;

      // ── Installment table ──
      const installments = enrollment.feeStructure?.installments;
      if (installments && installments.length > 0) {
        y = drawSectionHeading(doc, "Installment Schedule", margin, y, colW);

        // Table header
        setFill(doc, PDF_COLORS.headerBg);
        doc.rect(margin, y, colW, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        setTxt(doc, PDF_COLORS.white);
        const cols = { no: margin + 4, due: margin + 18, amt: margin + 72, paid: margin + 110, status: margin + 148 };
        doc.text("#",        cols.no,     y + 6);
        doc.text("Due Date", cols.due,    y + 6);
        doc.text("Amount",   cols.amt,    y + 6);
        doc.text("Paid",     cols.paid,   y + 6);
        doc.text("Status",   cols.status, y + 6);
        y += 9;

        installments.forEach((inst, idx) => {
          const rowH    = 10;
          const isPaid  = inst.status === "Paid";
          const isPartial = inst.status === "Partial";
          const isOverdue = inst.status === "Pending" && dayjs(inst.dueDate).isBefore(dayjs());

          setFill(doc, idx % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.rowAlt);
          doc.rect(margin, y, colW, rowH, "F");

          let statusBg, statusLabel;
          if (isPaid)         { statusBg = PDF_COLORS.successFg; statusLabel = "Paid";    }
          else if (isPartial) { statusBg = [200, 130, 0];        statusLabel = "Partial"; }
          else if (isOverdue) { statusBg = [190, 35, 35];        statusLabel = "Overdue"; }
          else                { statusBg = PDF_COLORS.light;     statusLabel = "Pending"; }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          setTxt(doc, PDF_COLORS.primary);
          doc.text(`${inst.installmentNumber}`, cols.no, y + 6.5);

          doc.setFont("helvetica", "normal");
          setTxt(doc, PDF_COLORS.dark);
          doc.text(dayjs(inst.dueDate).format("DD MMM YYYY"), cols.due,  y + 6.5);
          doc.text(`${inst.amount.toLocaleString()}`,          cols.amt,  y + 6.5);
          doc.text(`${(inst.paidAmount || 0).toLocaleString()}`, cols.paid, y + 6.5);

          setFill(doc, statusBg);
          doc.roundedRect(cols.status, y + 2, 26, 6, 1.5, 1.5, "F");
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          setTxt(doc, PDF_COLORS.white);
          doc.text(statusLabel, cols.status + 13, y + 6.2, { align: "center" });

          y += rowH;
        });

        // Totals row
        y += 2;
        setFill(doc, PDF_COLORS.primaryLight);
        doc.rect(margin, y, colW, 10, "F");

        const tAmt  = installments.reduce((s, i) => s + i.amount, 0);
        const tPaid = installments.reduce((s, i) => s + (i.paidAmount || 0), 0);
        const tBal  = tAmt - tPaid;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setTxt(doc, PDF_COLORS.primary);
        doc.text("TOTALS", cols.due, y + 7);
        setTxt(doc, PDF_COLORS.dark);
        doc.text(`${tAmt.toLocaleString()}`,  cols.amt,  y + 7);
        doc.text(`${tPaid.toLocaleString()}`, cols.paid, y + 7);
        setTxt(doc, [190, 35, 35]);
        doc.text(`Balance: ${tBal.toLocaleString()} PKR`, pageW - margin - 4, y + 7, { align: "right" });
        y += 14;
      }

      // ── Page footer ──
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setTxt(doc, PDF_COLORS.light);
      doc.text(
        `Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}   —   Odyssey Academy Khipro`,
        pageW / 2, 288, { align: "center" },
      );
    });

    doc.save(`${student.studentName}_Fee_Report.pdf`);
    message.success("Fee report downloaded successfully!");
  } catch (error) {
    console.error("Error generating fee PDF:", error);
    message.error("Failed to generate fee PDF");
  }
};

export default Students;
