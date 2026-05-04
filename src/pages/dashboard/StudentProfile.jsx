import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Tabs,
  Tag,
  Button,
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

const THEME = "#01134C";
const ACCENT = "#E8FC0A";

/* ──────────────────────────────────────────────────────────────────────────
   Small helpers
   ──────────────────────────────────────────────────────────────────────── */
const fmt = (v) => (v ? dayjs(v).format("DD MMM YYYY") : "—");
const fmtPKR = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

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
        {/* Avatar */}
        <div className="shrink-0">
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
      `}</style>
    </div>
  );
};

export default StudentProfile;
