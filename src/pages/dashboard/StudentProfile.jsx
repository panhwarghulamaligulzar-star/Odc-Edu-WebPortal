import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Tabs,
  Tag,
  Button,
  Radio,
  Descriptions,
  Row,
  Col,
  Statistic,
  Table,
  Space,
  Badge,
  Avatar,
  Divider,
  Progress,
  Empty,
  Spin,
  Tooltip,
  message,
  QRCode,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  BookOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  TeamOutlined,
  CalendarOutlined,
  ReloadOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaIdCard,
  FaMale,
  FaFemale,
  FaGraduationCap,
  FaDollarSign,
  FaBookOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaChalkboardTeacher,
  FaCertificate,
  FaCalendarAlt,
  FaRegIdCard,
} from "react-icons/fa";
import { MdPeople } from "react-icons/md";
import dayjs from "dayjs";
import api from "../../api/axiosInstance";
import StudentFeeProfile from "./StudentFeeProfile";
import jsPDF from "jspdf";
import "jspdf-autotable";
import odysseyLogo from "../../assets/images/logos/LOGO.png";

const THEME = "#01134C";
const ACCENT = "#E8FC0A";
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;

/* ──────────────────────────────────────────────────────────────────────────
   Small helpers
   ──────────────────────────────────────────────────────────────────────── */
const fmt = (v) => (v ? dayjs(v).format("DD MMM YYYY") : "—");
const fmtPKR = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
const fmtIdDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "00/00/0000");

const statusColor = {
  active: "green",
  enrolled: "blue",
  completed: "cyan",
  dropped: "red",
  suspended: "orange",
};

/* ──────────────────────────────────────────────────────────────────────────
   Personal-tab sub-components
   ──────────────────────────────────────────────────────────────────────── */

/** Color-coded section card with gradient header */
const SectionCard = ({ title, icon: Icon, color = THEME, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
    <div
      className="flex items-center gap-2.5 px-5 py-3"
      style={{
        background: `linear-gradient(120deg, ${color}18 0%, ${color}06 100%)`,
        borderBottom: `2px solid ${color}22`,
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color }}
      >
        {Icon && <Icon size={13} color="white" />}
      </div>
      <span className="font-bold text-sm" style={{ color }}>
        {title}
      </span>
    </div>
    <div className="p-4 flex-1">{children}</div>
  </div>
);

/** Single field row: icon left, small-caps label above, value below */
const FieldItem = ({
  icon: Icon,
  label,
  value,
  accent = false,
  iconColor,
  children,
}) => (
  <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ background: Icon ? `${iconColor || THEME}14` : "transparent" }}
    >
      {Icon && <Icon size={12} style={{ color: iconColor || THEME }} />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none mb-0.5">
        {label}
      </div>
      {children ? (
        children
      ) : (
        <div
          className={`text-sm break-all leading-snug ${accent ? "font-bold" : "font-medium"} ${
            value ? "text-gray-800" : "text-gray-300"
          }`}
        >
          {value || "—"}
        </div>
      )}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════════════ */
const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const [profilePhotoMode, setProfilePhotoMode] = useState("upload");
  const [photoUpdating, setPhotoUpdating] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadInputRef = React.useRef(null);
  const cameraVideoRef = React.useRef(null);
  const cameraStreamRef = React.useRef(null);

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, enrRes, certRes] = await Promise.all([
        api.get(`/student/admission/${id}`),
        api.get(`/enrollment/student/${id}`),
        api
          .get(`/student/certificate/${id}`)
          .catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (stuRes.data?.success) setStudent(stuRes.data.data);
      else message.error("Could not load student data");

      if (enrRes.data?.success) setEnrollments(enrRes.data.data);
      if (certRes.data?.success) setCertifications(certRes.data.data);
    } catch (err) {
      console.error(err);
      message.error("Error loading student profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const validateProfilePicture = (file) => {
    if (!file) {
      return false;
    }

    if (!file.type?.startsWith("image/")) {
      message.error("Please select a valid image file for the profile photo.");
      return false;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      message.error("Profile photo must be smaller than 5 MB.");
      return false;
    }

    return true;
  };

  const updateProfilePhoto = async (file) => {
    if (!student?._id || !validateProfilePicture(file)) {
      return;
    }

    setPhotoUpdating(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await api.put(`/student/admission/${student._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.success) {
        message.success("Profile photo updated successfully.");
        await fetchAll();
      } else {
        message.error("Failed to update profile photo.");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update profile photo.");
    } finally {
      setPhotoUpdating(false);
    }
  };

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await updateProfilePhoto(file);
  };

  const triggerProfilePhotoInput = () => {
    if (profilePhotoMode === "camera") {
      startCamera();
      return;
    }

    uploadInputRef.current?.click();
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  };

  const bindStreamToCameraVideo = async (stream) => {
    let attempts = 0;

    while (!cameraVideoRef.current && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts += 1;
    }

    const videoElement = cameraVideoRef.current;

    if (!videoElement) {
      throw new Error("Camera preview element is not ready.");
    }

    videoElement.srcObject = stream;

    await new Promise((resolve, reject) => {
      const handleLoaded = () => {
        videoElement
          .play()
          .then(resolve)
          .catch(reject);
      };

      videoElement.onloadedmetadata = handleLoaded;
      videoElement.onerror = () => reject(new Error("Failed to load camera preview."));

      if (videoElement.readyState >= 1) {
        handleLoaded();
      }
    });
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      message.error("Camera is not supported in this browser.");
      return;
    }

    try {
      stopCamera();
      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      cameraStreamRef.current = stream;
      setCameraOpen(true);
      await bindStreamToCameraVideo(stream);
    } catch (error) {
      console.error("Failed to open camera:", error);
      message.error("Could not open the system camera. Please allow camera access.");
    }
  };

  const captureCameraPhoto = async () => {
    const video = cameraVideoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      message.error("Camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          message.error("Failed to capture photo from camera.");
          return;
        }

        const capturedFile = new File(
          [blob],
          `student-profile-camera-${Date.now()}.jpg`,
          { type: "image/jpeg" },
        );

        stopCamera();
        await updateProfilePhoto(capturedFile);
      },
      "image/jpeg",
      0.92,
    );
  };

  useEffect(() => () => stopCamera(), []);

  /* ── Stats derived from enrollments ── */
  const totalPaid = enrollments.reduce((sum, e) => {
    if (!e.feeStructure?.installments) return sum;
    return (
      sum +
      e.feeStructure.installments
        .filter((i) => i.status?.toLowerCase() === "paid")
        .reduce((s, i) => s + (i.paidAmount || 0), 0)
    );
  }, 0);

  const totalDue = enrollments.reduce((sum, e) => {
    if (!e.feeStructure?.installments) return sum;
    return (
      sum +
      e.feeStructure.installments
        .filter((i) => i.status?.toLowerCase() !== "paid")
        .reduce((s, i) => s + (i.amount || 0), 0)
    );
  }, 0);

  const activeEnrollments = enrollments.filter(
    (e) =>
      e.status?.toLowerCase() === "active" ||
      e.status?.toLowerCase() === "enrolled",
  ).length;
  const primaryEnrollment =
    enrollments.find(
      (e) =>
        e.status?.toLowerCase() === "active" ||
        e.status?.toLowerCase() === "enrolled",
    ) || enrollments[0] || null;
  const idCardExpiry = student?.registrationDate
    ? dayjs(student.registrationDate).add(1, "year")
    : null;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Empty description="Student not found" />
        <Button onClick={() => navigate("/dashboard/students")}>
          Back to Students
        </Button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     TAB: Personal Information  — rich redesign
     ══════════════════════════════════════════════════════════════════════ */
  const PersonalTab = () => {
    const age = student.dateOfBirth
      ? dayjs().diff(dayjs(student.dateOfBirth), "year")
      : null;

    /* quick attribute chips — label + value + icon */
    const chips = [
      student.gender && {
        label: "Gender",
        value: student.gender,
        icon: student.gender === "Male" ? FaMale : FaFemale,
        color: student.gender === "Male" ? "#2563eb" : "#db2777",
        bg: student.gender === "Male" ? "#eff6ff" : "#fdf2f8",
        border: student.gender === "Male" ? "#bfdbfe" : "#fbcfe8",
      },
      age && {
        label: "Age",
        value: `${age} years`,
        icon: FaCalendarAlt,
        color: "#0891b2",
        bg: "#ecfeff",
        border: "#a5f3fc",
      },
      student.religion && {
        label: "Religion",
        value: student.religion,
        icon: null,
        color: "#7c3aed",
        bg: "#f5f3ff",
        border: "#ddd6fe",
      },
      student.district && {
        label: "District",
        value: student.district,
        icon: FaMapMarkerAlt,
        color: "#16a34a",
        bg: "#f0fdf4",
        border: "#bbf7d0",
      },
      student.reference && {
        label: "Reference",
        value: student.reference,
        icon: null,
        color: "#d97706",
        bg: "#fffbeb",
        border: "#fde68a",
      },
      {
        label: "Disability",
        value: student.disability ? "Has Disability" : "None",
        icon: student.disability ? FaTimesCircle : FaCheckCircle,
        color: student.disability ? "#ea580c" : "#16a34a",
        bg: student.disability ? "#fff7ed" : "#f0fdf4",
        border: student.disability ? "#fed7aa" : "#bbf7d0",
      },
    ].filter(Boolean);

    return (
      <div className="flex flex-col gap-5 pt-2">
        {/* ── Row 1: Personal / Contact / Address ── */}
        <Row gutter={[16, 16]}>
          {/* Personal Details */}
          <Col xs={24} md={12} xl={8}>
            <SectionCard title="Personal Details" icon={FaUser} color={THEME}>
              <FieldItem
                icon={FaRegIdCard}
                label="Registration No."
                value={student.registrationNo}
                accent
                iconColor={THEME}
              />
              <FieldItem
                icon={FaIdCard}
                label="CNIC / B-Form"
                value={student.cnicOrBForm}
                iconColor="#0891b2"
              />
              <FieldItem
                icon={FaCalendarAlt}
                label="Date of Birth"
                value={fmt(student.dateOfBirth)}
                iconColor="#7c3aed"
              />
              <FieldItem
                icon={FaCalendarAlt}
                label="Registration Date"
                value={fmt(student.registrationDate)}
                iconColor="#d97706"
              />
              <FieldItem icon={null} label="Caste" value={student.caste} />
              <FieldItem
                icon={null}
                label="Religion"
                value={student.religion}
              />
            </SectionCard>
          </Col>

          {/* Contact Information */}
          <Col xs={24} md={12} xl={8}>
            <SectionCard title="Contact" icon={FaPhone} color="#0891b2">
              <FieldItem
                icon={FaPhone}
                label="Mobile Number"
                value={student.mobileNumber}
                iconColor="#16a34a"
              />
              <FieldItem
                icon={FaPhone}
                label="WhatsApp"
                value={student.whatsappNumber}
                iconColor="#25d366"
              />
              <FieldItem
                icon={FaEnvelope}
                label="Email Address"
                value={student.emailAddress}
                iconColor="#2563eb"
              />
              <FieldItem
                icon={FaPhone}
                label="Emergency Contact"
                value={student.emergencyContactNumber}
                iconColor="#ef4444"
              />
            </SectionCard>
          </Col>

          {/* Address */}
          <Col xs={24} md={12} xl={8}>
            <SectionCard title="Address" icon={FaMapMarkerAlt} color="#16a34a">
              <FieldItem
                icon={FaMapMarkerAlt}
                label="Permanent Address"
                value={student.permanentAddress}
                iconColor="#16a34a"
              />
              <FieldItem
                icon={FaMapMarkerAlt}
                label="Current Address"
                value={student.currentAddress}
                iconColor="#0891b2"
              />
              <FieldItem
                icon={null}
                label="Union Council"
                value={student.unionCouncil}
              />
              <FieldItem icon={null} label="Tehsil" value={student.tehsil} />
              <FieldItem
                icon={null}
                label="District"
                value={student.district}
              />
            </SectionCard>
          </Col>
        </Row>

        {/* ── Row 2: Family / Academic / Quick Profile ── */}
        <Row gutter={[16, 16]}>
          {/* Family */}
          <Col xs={24} md={12}>
            <SectionCard
              title="Family Information"
              icon={FaUser}
              color="#7c3aed"
            >
              <Row gutter={[0, 0]}>
                <Col xs={24} sm={12}>
                  <FieldItem
                    icon={FaUser}
                    label="Father Name"
                    value={student.fatherName}
                    accent
                    iconColor="#7c3aed"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <FieldItem
                    icon={FaIdCard}
                    label="Father CNIC"
                    value={student.fatherCnic}
                    iconColor="#0891b2"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <FieldItem
                    icon={null}
                    label="Father Occupation"
                    value={student.fatherOccupation}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <FieldItem
                    icon={FaUser}
                    label="Guardian Name"
                    value={student.guardianName}
                    iconColor="#d97706"
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <FieldItem
                    icon={null}
                    label="Relationship"
                    value={student.relationshipWithStudent}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <FieldItem
                    icon={FaDollarSign}
                    label="Annual Income"
                    value={
                      student.annualIncome ? fmtPKR(student.annualIncome) : null
                    }
                    iconColor="#16a34a"
                  />
                </Col>
              </Row>
            </SectionCard>
          </Col>

          {/* Academic Background */}
          <Col xs={24} md={7}>
            <SectionCard
              title="Academic Background"
              icon={FaGraduationCap}
              color="#d97706"
            >
              <FieldItem
                icon={FaBookOpen}
                label="Previous School / College"
                value={student.previousSchoolCollege}
                iconColor="#d97706"
              />
              <FieldItem
                icon={FaGraduationCap}
                label="Last Class Attended"
                value={student.lastClassAttended}
                iconColor="#0891b2"
              />
              {student.enrolledCourses?.length > 0 && (
                <FieldItem
                  icon={FaBookOpen}
                  label="Enrolled Courses"
                  iconColor="#7c3aed"
                >
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {student.enrolledCourses.map((c, i) => (
                      <Tag key={i} color="purple" className="text-xs m-0">
                        {c.courseName || c}
                      </Tag>
                    ))}
                  </div>
                </FieldItem>
              )}
            </SectionCard>
          </Col>

          {/* Quick Profile Chips — beside Academic */}
          <Col xs={24} md={5}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
              <div
                className="flex items-center gap-2.5 px-4 py-3"
                style={{
                  background: `linear-gradient(120deg, ${THEME}18 0%, ${THEME}06 100%)`,
                  borderBottom: `2px solid ${THEME}22`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: THEME }}
                >
                  <FaUser size={12} color="white" />
                </div>
                <span className="font-bold text-sm" style={{ color: THEME }}>
                  Quick Info
                </span>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                {chips.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-2 w-full"
                    style={{ background: c.bg, borderColor: c.border }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${c.color}20` }}
                    >
                      {c.icon ? (
                        <c.icon size={12} style={{ color: c.color }} />
                      ) : (
                        <span
                          className="text-[10px] font-black"
                          style={{ color: c.color }}
                        >
                          {c.label[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col leading-none min-w-0">
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest truncate"
                        style={{ color: `${c.color}88` }}
                      >
                        {c.label}
                      </span>
                      <span
                        className="text-xs font-bold mt-0.5 truncate"
                        style={{ color: c.color }}
                      >
                        {c.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════════
     TAB: Enrollments & Courses
     ══════════════════════════════════════════════════════════════════════ */
  const EnrollmentsTab = () => {
    const statusSummary = enrollments.reduce(
      (summary, enrollment) => {
        const status = String(enrollment?.status || "").toLowerCase();

        if (status === "completed") {
          summary.passout += 1;
        } else if (status === "dropped") {
          summary.dropout += 1;
        } else if (status === "active" || status === "enrolled") {
          summary.active += 1;
        } else {
          summary.other += 1;
        }

        return summary;
      },
      { active: 0, passout: 0, dropout: 0, other: 0 },
    );

    const installmentColumns = [
      {
        title: "#",
        dataIndex: "installmentNumber",
        key: "no",
        width: 50,
        render: (v) => <span className="font-semibold text-xs">#{v}</span>,
      },
      {
        title: "Amount",
        dataIndex: "amount",
        key: "amount",
        render: (v) => (
          <span className="font-semibold text-sm">{fmtPKR(v)}</span>
        ),
      },
      {
        title: "Paid",
        dataIndex: "paidAmount",
        key: "paid",
        render: (v) => (
          <span className="text-green-600 font-semibold text-sm">
            {v ? fmtPKR(v) : "—"}
          </span>
        ),
      },
      {
        title: "Due Date",
        dataIndex: "dueDate",
        key: "due",
        render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (s) =>
          s?.toLowerCase() === "paid" ? (
            <Tag color="green" icon={<FaCheckCircle />}>
              Paid
            </Tag>
          ) : (
            <Tag color="red" icon={<FaTimesCircle />}>
              {s || "Pending"}
            </Tag>
          ),
      },
      {
        title: "Paid On",
        dataIndex: "paidDate",
        key: "paidDate",
        render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
      },
    ];

    const columns = [
      {
        title: "Course",
        key: "course",
        render: (_, r) => (
          <div>
            <div className="font-semibold text-sm" style={{ color: THEME }}>
              {r.course?.courseName || "—"}
            </div>
            <div className="text-xs text-gray-400">{r.course?.courseId}</div>
          </div>
        ),
      },
      {
        title: "Teacher",
        key: "teacher",
        render: (_, r) => r.course?.teacherId?.fullName || "—",
      },
      {
        title: "Batch",
        key: "batch",
        render: (_, r) =>
          r.batch ? (
            <div>
              <div className="font-medium text-sm">{r.batch.batchName}</div>
              <div className="text-xs text-gray-400">{r.batch.batchCode}</div>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: "Shift",
        key: "shift",
        render: (_, r) => r.batch?.shift || r.course?.shift || "—",
      },
      {
        title: "Start Date",
        key: "start",
        render: (_, r) => (
          <span className="text-xs">{fmt(r.batch?.startDate)}</span>
        ),
      },
      {
        title: "Enrollment Date",
        dataIndex: "enrollmentDate",
        key: "enrDate",
        render: (v) => <span className="text-xs">{fmt(v)}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (s) => (
          <Tag color={statusColor[s?.toLowerCase()] || "default"}>
            {s || "Unknown"}
          </Tag>
        ),
      },
      {
        title: "Total Fee",
        key: "fee",
        render: (_, r) => (
          <span className="font-semibold text-sm">
            {fmtPKR(r.feeStructure?.totalAmount || r.course?.totalFee)}
          </span>
        ),
      },
    ];

    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {[
            {
              label: "Active Courses",
              value: statusSummary.active,
              color: "#16A34A",
              bg: "#F0FDF4",
            },
            {
              label: "Passout Courses",
              value: statusSummary.passout,
              color: "#7C3AED",
              bg: "#F5F3FF",
            },
            {
              label: "Dropout Courses",
              value: statusSummary.dropout,
              color: "#DC2626",
              bg: "#FEF2F2",
            },
            {
              label: "Other Status",
              value: statusSummary.other,
              color: "#475569",
              bg: "#F8FAFC",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border px-4 py-3"
              style={{ background: item.bg, borderColor: `${item.color}22` }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: item.color }}
              >
                {item.label}
              </div>
              <div
                className="text-2xl font-bold mt-1"
                style={{ color: item.color }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {enrollments.length === 0 ? (
          <Empty description="No enrollments found" />
        ) : (
          <Table
            dataSource={enrollments}
            columns={columns}
            rowKey="_id"
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
            expandable={{
              expandedRowRender: (record) => {
                if (!record.feeStructure?.installments?.length) {
                  return (
                    <div className="p-3 text-gray-500 text-sm">
                      No installment data available
                    </div>
                  );
                }

                const paid = record.feeStructure.installments.filter(
                  (i) => i.status?.toLowerCase() === "paid",
                );
                const total = record.feeStructure.installments.length;
                const pct = total ? Math.round((paid.length / total) * 100) : 0;

                return (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        Installments ({paid.length}/{total} paid)
                      </span>
                      <Progress
                        percent={pct}
                        size="small"
                        style={{ width: 160 }}
                        strokeColor={THEME}
                      />
                    </div>
                    <Table
                      dataSource={record.feeStructure.installments}
                      columns={installmentColumns}
                      rowKey="installmentNumber"
                      pagination={false}
                      size="small"
                    />
                  </div>
                );
              },
              rowExpandable: (r) => !!r.feeStructure?.installments?.length,
            }}
          />
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════════
     TAB: Certifications
     ══════════════════════════════════════════════════════════════════════ */
  const CertificationsTab = () => {
    const certColumns = [
      {
        title: "Certificate No.",
        dataIndex: "certificateNo",
        key: "certNo",
        render: (v) => (
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: THEME }}
          >
            {v}
          </span>
        ),
      },
      {
        title: "Course",
        dataIndex: "courseName",
        key: "course",
        render: (v) => <span className="font-medium text-sm">{v || "—"}</span>,
      },
      {
        title: "Issue Date",
        dataIndex: "issueDate",
        key: "issue",
        render: (v) => <span className="text-sm">{fmt(v)}</span>,
      },
      {
        title: "Expiry Date",
        dataIndex: "expiryDate",
        key: "expiry",
        render: (v) => (
          <span className="text-sm">{v ? fmt(v) : "No Expiry"}</span>
        ),
      },
      {
        title: "Grade",
        dataIndex: "grade",
        key: "grade",
        render: (v) =>
          v ? (
            <Tag
              color={
                v === "A+" || v === "A"
                  ? "green"
                  : v === "B"
                    ? "blue"
                    : "default"
              }
            >
              {v}
            </Tag>
          ) : (
            "—"
          ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (s) =>
          s === "Active" ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag color="red">{s || "—"}</Tag>
          ),
      },
    ];

    return certifications.length === 0 ? (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No certifications issued yet"
      />
    ) : (
      <Table
        dataSource={certifications}
        columns={certColumns}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
        size="small"
      />
    );
  };

  const IdCardTab = () => {
    if (!student?.isActive) {
      return (
        <div className="py-10">
          <Empty description="ID card is available for active students only" />
        </div>
      );
    }

    const courseName =
      primaryEnrollment?.course?.courseName ||
      student?.lastClassAttended ||
      "Student";
    const studentCode = student?.registrationNo || "N/A";
    const joinDate = fmtIdDate(student?.registrationDate || student?.createdAt);
    const expiryDate = fmtIdDate(idCardExpiry);
    const contactNumber =
      student?.mobileNumber ||
      student?.whatsappNumber ||
      student?.emergencyContactNumber ||
      "N/A";
    const emailAddress = student?.emailAddress || "N/A";
    const guardianName = student?.fatherName || student?.guardianName || "N/A";
    const attendanceQrValue = JSON.stringify({
      type: "student_attendance",
      studentId: student?._id || student?.id || "",
      studentCode,
      studentName: student?.studentName || "",
    });

    return (
      <div className="student-id-print-area py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
          <div>
            <div className="text-xl font-bold" style={{ color: THEME }}>
              Student ID Card
            </div>
            <div className="text-sm text-gray-500">
              Front and back print layout for active students
            </div>
          </div>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            style={{
              background: THEME,
              borderColor: THEME,
              color: ACCENT,
              fontWeight: 700,
            }}
          >
            Print ID Card
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 id-card-grid">
          <div className="id-card-shell">
            <div className="student-id-card student-id-front">
              <div className="id-front-side-navy" />
              <div className="id-front-side-gold" />
              <div className="id-front-bottom-gold" />
              <div className="id-front-bottom-navy-band" />

              <div className="id-card-photo-wrap">
                {student?.profilePicture ? (
                  <img
                    src={student.profilePicture}
                    alt={student.studentName}
                    className="id-card-photo"
                  />
                ) : (
                  <div className="id-card-photo id-card-photo-fallback">
                    <FaUser size={74} color="#94A3B8" />
                  </div>
                )}
              </div>

              <div className="id-card-brand-simple">
                <div className="id-card-brand-simple-title">
                  {student?.studentName || "Student Name"}
                </div>
                <div className="id-card-brand-simple-subtitle">{courseName}</div>
              </div>

              <div className="id-card-details">
                <div><span>ID</span><strong>{studentCode}</strong></div>
                <div><span>DOB</span><strong>{fmtIdDate(student?.dateOfBirth)}</strong></div>
                <div><span>Phone</span><strong>{contactNumber}</strong></div>
                <div><span>Join</span><strong>{joinDate}</strong></div>
                <div><span>Email</span><strong>{emailAddress}</strong></div>
              </div>

              <div className="id-front-qr-block">
                <div className="id-front-qr-shell">
                  <QRCode
                    value={attendanceQrValue}
                    size={72}
                    bordered={false}
                    color="#152b57"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="id-card-shell">
            <div className="student-id-card student-id-back">
              <div className="id-back-main">
                <div className="id-back-logo-badge">
                  <img src={odysseyLogo} alt="Odyssey Academy" className="id-back-logo-large" />
                </div>
                <div className="id-back-logo-title">ODYSSEY ACADEMY</div>
                <div className="id-back-logo-subtitle">Student Identity Card</div>
              </div>

              <div className="id-card-back-title">Terms & Conditions</div>

              <div className="id-card-back-points">
                <div>This card is valid only for the enrolled active student.</div>
                <div>Carry this card during classes, exams and campus visits.</div>
                <div>Report loss of this card to the academy immediately.</div>
              </div>

              <div className="id-back-dates">
                <div>JOIN DATE : {joinDate}</div>
                <div>EXPIRE DATE : {expiryDate}</div>
              </div>

              <div className="id-back-bottom-gold" />
              <div className="id-back-bottom-navy-band">
                <div className="id-back-bottom-text">odysseyacademy.edu.pk</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════════
     TAB items
     ══════════════════════════════════════════════════════════════════════ */
  const tabItems = [
    {
      key: "personal",
      label: (
        <span className="flex items-center gap-1.5">
          <FaUser size={13} />
          Personal Info
        </span>
      ),
      children: <PersonalTab />,
    },
    {
      key: "enrollments",
      label: (
        <span className="flex items-center gap-1.5">
          <FaBookOpen size={13} />
          Enrollments &amp; Courses
          <Badge count={enrollments.length} color={THEME} size="small" />
        </span>
      ),
      children: <EnrollmentsTab />,
    },
    {
      key: "fees",
      label: (
        <span className="flex items-center gap-1.5">
          <FaDollarSign size={13} />
          Fees &amp; Payments
        </span>
      ),
      children: (
        <StudentFeeProfile studentId={student._id} studentInfo={student} />
      ),
    },
    {
      key: "certifications",
      label: (
        <span className="flex items-center gap-1.5">
          <FaCertificate size={13} />
          Certifications
          <Badge count={certifications.length} color="cyan" size="small" />
        </span>
      ),
      children: <CertificationsTab />,
    },
    {
      key: "id-card",
      label: (
        <span className="flex items-center gap-1.5">
          <IdcardOutlined />
          ID Card
          {student?.isActive ? <Badge count="Active" color="green" size="small" /> : null}
        </span>
      ),
      children: <IdCardTab />,
    },
  ];

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* ── Back + Page Header ── */}
      <div className="flex items-center gap-3">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/dashboard/students")}
          style={{ borderColor: THEME, color: THEME }}
        >
          Students
        </Button>
        <Divider type="vertical" />
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: THEME }}
          >
            <MdPeople size={17} style={{ color: ACCENT }} />
          </div>
          <span className="text-base font-bold" style={{ color: THEME }}>
            Student Profile
          </span>
        </div>
        <div className="ml-auto">
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAll}
              loading={loading}
              size="small"
              style={{ borderColor: THEME, color: THEME }}
            />
          </Tooltip>
        </div>
      </div>

      {/* ── Profile Hero Card ── */}
      <div
        className="rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6"
        style={{
          background: `linear-gradient(135deg, ${THEME} 0%, #0a2480 100%)`,
        }}
      >
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfilePhotoChange}
          style={{ display: "none" }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfilePhotoChange}
          style={{ display: "none" }}
        />
        <div className="shrink-0 flex flex-col items-center gap-3">
          {student.profilePicture ? (
            <img
              src={student.profilePicture}
              alt={student.studentName}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center border-4 border-white/20"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <FaUser size={40} color="rgba(255,255,255,0.8)" />
            </div>
          )}
          <Radio.Group
            value={profilePhotoMode}
            onChange={(e) => {
              const nextMode = e.target.value;
              setProfilePhotoMode(nextMode);
              if (nextMode !== "camera") {
                stopCamera();
              }
            }}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="upload">System</Radio.Button>
            <Radio.Button value="camera">Camera</Radio.Button>
          </Radio.Group>
          <Button
            onClick={triggerProfilePhotoInput}
            loading={photoUpdating}
            size="small"
            style={{
              background: "#ffffff",
              borderColor: "#ffffff",
              color: THEME,
              fontWeight: 600,
            }}
          >
            {profilePhotoMode === "camera" ? "Capture & Update" : "Upload & Update"}
          </Button>
          {profilePhotoMode === "camera" && cameraOpen && (
            <div
              style={{
                width: "240px",
                background: "rgba(255,255,255,0.14)",
                borderRadius: "16px",
                padding: "12px",
              }}
            >
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  minHeight: "220px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  background: "#0f172a",
                }}
              />
              <div className="flex gap-2 justify-center mt-3 flex-wrap">
                <Button type="primary" size="small" onClick={captureCameraPhoto}>
                  Capture Photo
                </Button>
                <Button size="small" onClick={stopCamera}>
                  Close
                </Button>
              </div>
            </div>
          )}
          <span className="text-white/70 text-xs text-center">
            Max size 5 MB
          </span>
        </div>

        {/* Name + basic meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white m-0 truncate">
              {student.studentName}
            </h1>
            {student.isActive ? (
              <Tag color="green" className="text-xs">
                Active
              </Tag>
            ) : (
              <Tag color="red" className="text-xs">
                Inactive
              </Tag>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-white/70 text-sm mt-1">
            <span className="flex items-center gap-1">
              <FaRegIdCard size={12} />
              {student.registrationNo}
            </span>
            {student.gender && (
              <span className="flex items-center gap-1">
                {student.gender === "Male" ? (
                  <FaMale size={12} />
                ) : (
                  <FaFemale size={12} />
                )}
                {student.gender}
              </span>
            )}
            {student.mobileNumber && (
              <span className="flex items-center gap-1">
                <FaPhone size={12} />
                {student.mobileNumber}
              </span>
            )}
            {student.emailAddress && (
              <span className="flex items-center gap-1">
                <FaEnvelope size={12} />
                {student.emailAddress}
              </span>
            )}
            {student.district && (
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt size={12} />
                {student.district}
              </span>
            )}
          </div>
          <div className="mt-2 text-white/50 text-xs">
            Registered on {fmt(student.registrationDate || student.createdAt)}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3 shrink-0">
          {[
            {
              label: "Courses",
              value: enrollments.length,
              color: ACCENT,
            },
            {
              label: "Active",
              value: activeEnrollments,
              color: "#4ade80",
            },
            {
              label: "Total Paid",
              value: fmtPKR(totalPaid),
              color: "#60a5fa",
              small: true,
            },
            {
              label: "Outstanding",
              value: fmtPKR(totalDue),
              color: "#f87171",
              small: true,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3 min-w-[90px] text-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div
                className={`font-bold ${s.small ? "text-sm" : "text-2xl"} leading-tight`}
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-white/60 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="middle"
          className="student-profile-tabs"
          tabBarStyle={{ padding: "0 24px", marginBottom: 0 }}
          style={{ "--tab-active-color": THEME }}
          tabBarExtraContent={null}
        />
      </div>

      {/* override tab active color */}
      <style>{`
        .student-profile-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: ${THEME} !important;
        }
        .student-profile-tabs .ant-tabs-ink-bar {
          background: ${THEME} !important;
        }
        .student-profile-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: ${THEME} !important;
        }
        .student-profile-tabs .ant-tabs-content-holder {
          padding: 0 24px 24px;
        }
        .id-card-shell {
          display: flex;
          justify-content: center;
        }
        .student-id-card {
          position: relative;
          width: min(100%, 392px);
          aspect-ratio: 0.66;
          background: #ffffff;
          border-radius: 0;
          overflow: hidden;
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.22);
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 0;
        }
        .student-id-front,
        .student-id-back {
          color: #0f172a;
        }
        .student-id-front {
          background: #ffffff;
        }
        .student-id-back {
          background: #152b57;
          color: #ffffff;
        }
        .id-front-side-navy,
        .id-front-side-gold,
        .id-front-bottom-gold,
        .id-front-bottom-navy-band,
        .id-back-bottom-gold,
        .id-back-bottom-navy-band {
          position: absolute;
          pointer-events: none;
        }
        .id-front-side-navy {
          top: 0;
          right: 0;
          width: 42px;
          height: 100%;
          background: #152b57;
        }
        .id-front-side-gold {
          top: 158px;
          right: 0;
          width: 42px;
          height: 124px;
          background: #d79d19;
          clip-path: polygon(0 0, 100% 30%, 100% 100%, 0 100%);
        }
        .id-front-bottom-gold {
          left: 0;
          right: 42px;
          bottom: 96px;
          height: 220px;
          background: #d79d19;
          clip-path: ellipse(112% 100% at 0% 100%);
        }
        .id-front-bottom-navy-band {
          left: 0;
          right: 0;
          bottom: 0;
          height: 96px;
          background: #152b57;
        }
        .id-back-bottom-gold {
          left: 0;
          right: 0;
          bottom: 96px;
          height: 196px;
          background: #d79d19;
          clip-path: ellipse(128% 100% at 100% 100%);
        }
        .id-back-bottom-navy-band {
          left: 0;
          right: 0;
          bottom: 0;
          height: 96px;
          background: #102244;
        }
        .id-card-brand {
          display: none;
        }
        .id-card-logo {
          width: 94px;
          height: 94px;
          object-fit: contain;
          border-radius: 999px;
          background: #ffffff;
          padding: 8px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
          border: 4px solid #d79d19;
        }
        .id-card-photo-wrap {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          margin: 30px 0 10px;
        }
        .id-card-photo {
          width: 168px;
          height: 168px;
          border-radius: 999px;
          object-fit: cover;
          border: 6px solid #d79d19;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
          background: #f8fafc;
        }
        .id-card-photo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .id-card-brand-simple {
          position: relative;
          z-index: 2;
          text-align: center;
          margin-bottom: 0;
        }
        .id-card-brand-simple-title {
          color: #d79d19;
          font-size: 19px;
          font-weight: 900;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .id-card-brand-simple-subtitle {
          color: #9ca3af;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .id-card-details {
          position: absolute;
          z-index: 2;
          left: 50%;
          transform: translateX(-50%);
          width: min(100%, 198px);
          max-width: 198px;
          top: 286px;
          display: grid;
          gap: 10px;
          justify-items: center;
        }
        .id-card-details div,
        .id-card-back-lines div,
        .id-card-back-extra div {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: baseline;
          border-bottom: none;
          padding-bottom: 0;
          width: 100%;
        }
        .id-card-details span,
        .id-card-back-lines span,
        .id-card-back-extra span {
          font-size: 12px;
          color: #111827;
          min-width: 52px;
          flex-shrink: 0;
          text-transform: none;
          letter-spacing: 0;
          font-weight: 800;
          text-align: right;
        }
        .id-card-details strong,
        .id-card-back-lines strong,
        .id-card-back-extra strong {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          text-align: right;
          word-break: break-word;
          min-width: 122px;
        }
        .id-card-details div:nth-child(1) strong,
        .id-card-details div:nth-child(2) strong,
        .id-card-details div:nth-child(3) strong,
        .id-card-details div:nth-child(4) strong,
        .id-card-details div:nth-child(5) strong {
          min-width: 0;
        }
        .id-card-details div:nth-child(5) strong {
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .id-back-main {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #ffffff;
          margin-top: 54px;
        }
        .id-back-logo-badge {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          background: #d79d19;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }
        .id-back-logo-large {
          width: 80px;
          height: 80px;
          object-fit: contain;
          background: #ffffff;
          border-radius: 999px;
          padding: 7px;
          display: block;
        }
        .id-back-logo-title {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: 0.08em;
        }
        .id-back-logo-subtitle {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin-top: 3px;
          text-transform: uppercase;
        }
        .id-card-back-title {
          position: relative;
          z-index: 2;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          margin: 104px 0 10px;
          color: #ffffff;
          text-transform: uppercase;
        }
        .id-card-back-lines {
          display: none;
        }
        .id-card-back-points {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 6px;
          margin-bottom: 28px;
          padding: 0 42px;
        }
        .id-card-back-points div {
          position: relative;
          padding-left: 0;
          color: rgba(229, 231, 235, 0.9);
          font-size: 9px;
          line-height: 1.45;
          text-align: center;
          font-weight: 600;
        }
        .id-card-back-points div::before {
          display: none;
        }
        .id-back-dates {
          position: relative;
          z-index: 2;
          text-align: center;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          display: grid;
          gap: 5px;
          margin-bottom: 110px;
        }
        .id-back-bottom-text {
          position: absolute;
          left: 0;
          right: 0;
          top: 34px;
          text-align: center;
          font-size: 10px;
          color: #ffffff;
          font-weight: 700;
          letter-spacing: 0.42em;
          text-transform: uppercase;
        }
        .id-front-qr-block {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 10px;
          z-index: 2;
          display: flex;
          justify-content: center;
        }
        .id-front-qr-shell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          background: #ffffff;
          border-radius: 6px;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18);
        }
        .id-front-qr-shell canvas,
        .id-front-qr-shell svg {
          display: block;
        }
        @media (max-width: 768px) {
          .student-id-card {
            width: min(100%, 352px);
          }
          .id-card-logo {
            width: 86px;
            height: 86px;
          }
          .id-card-photo {
            width: 154px;
            height: 154px;
          }
          .id-card-details {
            left: 50%;
            transform: translateX(-50%);
            width: min(100%, 184px);
            max-width: 184px;
            top: 274px;
          }
          .id-card-details strong {
            min-width: 106px;
          }
          .id-back-logo-title {
            font-size: 15px;
          }
          .id-card-back-points {
            padding: 0 28px;
          }
          .id-card-back-points div {
            font-size: 8.5px;
          }
          .id-back-logo-badge {
            width: 90px;
            height: 90px;
          }
          .id-back-logo-large {
            width: 76px;
            height: 76px;
          }
          .id-front-qr-shell {
            padding: 5px;
          }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .student-id-print-area,
          .student-id-print-area * {
            visibility: visible !important;
          }
          .student-id-print-area {
            position: absolute !important;
            inset: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
          }
          .id-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .student-id-card {
            box-shadow: none !important;
            break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ant-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentProfile;
