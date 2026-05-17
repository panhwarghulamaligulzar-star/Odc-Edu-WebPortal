import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import {
  Card,
  Button,
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
  Popconfirm,
  Upload,
  Table,
  Space,
  Divider,
  Row,
  Col,
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
import { MdPeople } from "react-icons/md";
import academyConfig from "../../config/academyConfig";
import odysseyLogo from "../../assets/images/logos/LOGO.png";

const { TextArea } = Input;
const { Option } = Select;

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
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
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
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [
    students,
    searchText,
    genderFilter,
    enrollmentFilter,
    courseFilter,
    batchFilter,
  ]);

  useEffect(() => {
    const filteredIds = new Set(filteredStudents.map((student) => student._id));
    setSelectedStudentIds((prev) => prev.filter((id) => filteredIds.has(id)));
  }, [filteredStudents]);

  const filterStudents = () => {
    let filtered = [...students];

    if (searchText) {
      filtered = filtered.filter(
        (student) =>
          student.studentName
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||
          student.registrationNo
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

    setFilteredStudents(filtered);
    setTablePage(1);
  };

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

  const handleCreateStudent = async (values) => {
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
        form.resetFields();
        setProfilePicture(null);
        setProfilePictureUrl(null);
        setModalVisible(false);
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to create student");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (values) => {
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
        form.resetFields();
        setProfilePicture(null);
        setProfilePictureUrl(null);
        setModalVisible(false);
        setEditMode(false);
        setEditingStudent(null);
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      const response = await api.delete(`/student/admission/${studentId}`);
      if (response.data.success) {
        message.success("Student deleted successfully!");
        setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to delete student");
    }
  };

  const handleBulkDeleteStudents = async () => {
    const normalizedSelectedIds = selectedStudentIds
      .map((id) => (typeof id === "string" ? id.trim() : String(id || "").trim()))
      .filter(Boolean);

    if (normalizedSelectedIds.length === 0) {
      message.warning("Please select at least one student");
      return;
    }
    setBulkDeleting(true);
    try {
      const response = await api.post("/student/admissions/bulk-delete", {
        ids: normalizedSelectedIds,
      });
      if (response.data.success) {
        message.success(
          response.data.message ||
            `${normalizedSelectedIds.length} student(s) deleted successfully!`,
        );
        setSelectedStudentIds([]);
        fetchStudents();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to bulk delete students");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectAllFilteredStudents = () => {
    if (filteredStudents.length === 0) {
      message.warning("No students available to select");
      return;
    }
    setSelectedStudentIds(
      filteredStudents
        .map((student) => student?._id)
        .filter(Boolean)
        .map((id) => (typeof id === "string" ? id.trim() : String(id).trim())),
    );
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
    setModalVisible(true);
  };

  const openCourseAssignModal = (student) => {
    setSelectedStudent(student);
    setEditingEnrollment(null);
    courseForm.resetFields();
    setCourseModalVisible(true);
  };

  const openEditCourseModal = (student, enrollment) => {
    setSelectedStudent(student);
    setEditingEnrollment(enrollment);
    setCourseModalVisible(true);
  };

  const openFeeProfileModal = (student) => {
    setSelectedStudent(student);
    setFeeProfileModalVisible(true);
  };

  const handleAssignCourse = async (values) => {
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
        ["Registration No", student.registrationNo],
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

  // Handle bulk import of students from CSV/Excel
  const downloadImportTemplate = () => {
    const headers = [
      "Student Name",
      "Registration No",
      "Registration Date",
      "Gender",
      "Date of Birth",
      "Religion",
      "CNIC/B-Form",
      "Mobile Number",
      "Father Name",
      "Father CNIC",
      "Father Contact",
      "Emergency Contact",
      "Permanent Address",
      "Course Name",
      "Course ID",
      "Batch Name",
      "Batch Code",
      "Enrollment Date",
      "Enrollment Status",
      "Admission Fee",
      "Course Fee",
      "Certificate Fee",
      "Exam Fee",
      "Registration Fee",
      "Practical Fee",
      "Other Fee",
      "Discount",
      "Paid Amount",
      "Due Date",
      "Enrollment Notes",
      "Fee Notes",
    ];

    const rows = filteredStudents.flatMap((student) => {
      const baseStudentCols = [
        student.studentName || "",
        student.registrationNo || "",
        student.registrationDate ? dayjs(student.registrationDate).format("YYYY-MM-DD") : "",
        student.gender || "",
        student.dateOfBirth ? dayjs(student.dateOfBirth).format("YYYY-MM-DD") : "",
        student.religion || "",
        student.cnicOrBForm || "",
        student.mobileNumber || "",
        student.fatherName || "",
        student.fatherCnic || "",
        student.fatherContact || "",
        student.emergencyContactNumber || "",
        student.permanentAddress || "",
      ];

      const enrollments = Array.isArray(student.enrollments) ? student.enrollments : [];
      if (enrollments.length === 0) {
        return [[
          ...baseStudentCols,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]];
      }

      return enrollments.map((enrollment) => {
        const fs = enrollment.feeStructure || {};
        return [
          ...baseStudentCols,
          enrollment.course?.courseName || "",
          enrollment.course?.courseId || "",
          enrollment.batch?.batchName || "",
          enrollment.batch?.batchCode || "",
          enrollment.enrollmentDate
            ? dayjs(enrollment.enrollmentDate).format("YYYY-MM-DD")
            : "",
          enrollment.status || "Active",
          fs.admissionFee ?? enrollment.course?.admissionFee ?? "",
          fs.courseFee ?? enrollment.course?.courseFee ?? "",
          fs.certificateFee ?? enrollment.course?.certificateFee ?? "",
          fs.examFee ?? enrollment.course?.examFee ?? "",
          fs.registrationFee ?? enrollment.course?.registrationFee ?? "",
          fs.practicalFee ?? enrollment.course?.practicalFee ?? "",
          fs.otherFee ?? enrollment.course?.otherFee ?? "",
          fs.discount ?? "",
          fs.paidAmount ?? "",
          fs.installments?.[0]?.dueDate
            ? dayjs(fs.installments[0].dueDate).format("YYYY-MM-DD")
            : "",
          enrollment.notes || "",
          fs.notes || "",
        ];
      });
    });

    const exportRows = rows.length > 0 ? rows : [[
      "Ali Raza",
      "0091",
      "2026-05-17",
      "Male",
      "2010-01-20",
      "Muslim",
      "4210112345678",
      "03001234567",
      "Ahmed Raza",
      "4210111111111",
      "03007654321",
      "03009998888",
      "Main Road, Khipro",
      "English Language",
      "",
      "English 2:00 to 4:00",
      "",
      "2026-05-17",
      "Active",
      "1000",
      "5000",
      "1000",
      "0",
      "0",
      "0",
      "0",
      "500",
      "1000",
      "2026-06-10",
      "Imported from CSV",
      "First installment received",
    ]];

    const csvContent = [headers, ...exportRows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "students-course-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async (file) => {
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/student/students/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        message.success(
          `Import completed: ${response.data.data.imported} students and ${response.data.data.coursesAssigned || 0} course assignment(s) added`,
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
          <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
            Students
          </h2>
          <p className="text-sm m-0" style={{ color: "#6b7280" }}>
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
                <strong>{filteredStudents.length}</strong> | Selected:{" "}
                <strong>{selectedStudentIds.length}</strong>
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                type="default"
                size="large"
                className="btn-lg"
                onClick={handleSelectAllFilteredStudents}
                disabled={filteredStudents.length === 0 || loading}
              >
                Select All ({filteredStudents.length})
              </Button>
              <Button
                type="default"
                size="large"
                className="btn-lg"
                onClick={() => setSelectedStudentIds([])}
                disabled={selectedStudentIds.length === 0 || loading}
              >
                Clear Selection
              </Button>
              <Popconfirm
                title="Delete Selected Students"
                description={`Are you sure you want to delete ${selectedStudentIds.length} selected student(s)?`}
                onConfirm={handleBulkDeleteStudents}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true, loading: bulkDeleting }}
                disabled={selectedStudentIds.length === 0 || loading}
              >
                <Button
                  danger
                  icon={<FaTrash />}
                  size="large"
                  className="btn-lg"
                  loading={bulkDeleting}
                  disabled={selectedStudentIds.length === 0 || loading}
                >
                  Delete Selected
                </Button>
              </Popconfirm>
              <Button
                type="default"
                icon={<FaFileImport />}
                onClick={() => setImportModalVisible(true)}
                size="large"
                className="btn-lg"
                style={{
                  background: "#107c41",
                  borderColor: "#107c41",
                  color: "white",
                }}
              >
                Import Excel/CSV
              </Button>
              <Button
                type="primary"
                icon={<FaUserPlus />}
                onClick={() => {
                  setModalVisible(true);
                  setEditMode(false);
                  form.resetFields();
                }}
                size="large"
                className="btn-lg"
                style={{ marginRight: 10 }}
              >
                Add New Student
              </Button>
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
                  ? "No students match your search criteria"
                  : "No students found. Add your first student!"
              }
              style={{ padding: "60px 0" }}
            />
          ) : (
            <div className="bg-[#fff]  rounded-md overflow-x-auto">
              <Table
                dataSource={filteredStudents}
                rowKey="_id"
                className="custom-pagination-table"
                rowSelection={{
                  selectedRowKeys: selectedStudentIds,
                  onChange: (newSelectedRowKeys, selectedRows) =>
                    setSelectedStudentIds(
                      selectedRows
                        .map((student) => student?._id)
                        .filter(Boolean)
                        .map((id) =>
                          typeof id === "string" ? id.trim() : String(id).trim(),
                        ),
                    ),
                  preserveSelectedRowKeys: true,
                }}
                pagination={{
                  current: tablePage,
                  pageSize: tablePageSize,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 25, 50, 100],
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
                        {record.registrationNo && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#667eea",
                              fontWeight: "500",
                            }}
                          >
                            {record.registrationNo}
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

                {/* Enrolled Courses Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      Enrolled Courses
                    </span>
                  }
                  key="courses"
                  width={320}
                  render={(record) => (
                    <div>
                      {record.enrollments && record.enrollments.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {record.enrollments.slice(0, 2).map((enrollment) => (
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
                                  <Tag
                                    color={enrollment.status === "Active" ? "green" : "orange"}
                                    style={{ fontSize: "10px", margin: 0 }}
                                  >
                                    {enrollment.status}
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
                                    display: "flex",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}
                                >
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<FaEdit />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditCourseModal(record, enrollment);
                                    }}
                                    style={{
                                      background: "#667eea",
                                      borderColor: "#667eea",
                                      fontSize: "11px",
                                      height: "24px",
                                      flex: 1,
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            </Tooltip>
                          ))}
                          {record.enrollments.length > 2 && (
                            <Tag
                              color="blue"
                              style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                textAlign: "center",
                              }}
                            >
                              +{record.enrollments.length - 2} more courses
                            </Tag>
                          )}
                        </div>
                      ) : (
                        <Tag color="default" style={{ fontSize: "12px" }}>
                          No enrollments
                        </Tag>
                      )}
                    </div>
                  )}
                />

                {/* Actions Column */}
                <Table.Column
                  title={
                    <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
                      Actions
                    </span>
                  }
                  key="actions"
                  width={280}
                  fixed="right"
                  render={(record) => (
                    <Space size="small" wrap>
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
                      <Tooltip title="Assign Course">
                        <Button
                          type="primary"
                          icon={<FaGraduationCap />}
                          onClick={() => openCourseAssignModal(record)}
                          style={{
                            background: "#4ECDC4",
                            borderColor: "#4ECDC4",
                            borderRadius: "8px",
                          }}
                          size="small"
                        />
                      </Tooltip>
                      <Tooltip title="Fee Profile">
                        <Button
                          icon={<FaDollarSign />}
                          onClick={() => openFeeProfileModal(record)}
                          style={{
                            borderColor: "#667eea",
                            color: "#667eea",
                            borderRadius: "8px",
                          }}
                          size="small"
                        />
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <Button
                          icon={<FaFileDownload />}
                          onClick={() => downloadStudentPDF(record)}
                          style={{ borderRadius: "8px" }}
                          size="small"
                        />
                      </Tooltip>
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
                      <Popconfirm
                        title="Delete Student"
                        description="Are you sure you want to delete this student?"
                        onConfirm={() => handleDeleteStudent(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete Student">
                          <Button
                            danger
                            icon={<FaTrash />}
                            style={{ borderRadius: "8px" }}
                            size="small"
                          />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  )}
                />
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Student Form Modal */}
      <Modal
        title={
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2D3748" }}>
            {editMode ? "Edit Student" : "Add New Student"}
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditMode(false);
          setEditingStudent(null);
        }}
        footer={null}
        width={900}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editMode ? handleEditStudent : handleCreateStudent}
          style={{ marginTop: "20px" }}
        >
          {/* Profile Picture Upload Section */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
              padding: "25px",
              borderRadius: "16px",
              marginBottom: "25px",
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

          {/* Basic Information Section */}
          <div
            style={{
              background: "#F7FAFC",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
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

          {/* Family Information Section */}
          <div
            style={{
              background: "#FFF5F5",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
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

          {/* Additional Information Section */}
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

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Button
              onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              style={{ borderRadius: "6px" }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "6px",
              }}
            >
              {editMode ? "Update Student" : "Create Student"}
            </Button>
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
            Import Students + Course Assignments
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
              Required Columns:
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: "20px",
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              <li>Student Name, Mobile Number, Gender, Date of Birth, Religion</li>
              <li>CNIC/B-Form, Father Name, Father CNIC, Permanent Address, Emergency Contact</li>
              <li>Course Name or Course ID (optional but needed for course assignment)</li>
              <li>Batch Name or Batch Code (optional)</li>
              <li>Registration No is optional and only saved if provided in file</li>
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
      doc.text(student.registrationNo || "—", margin + 55, y + 10);

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
