import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { CheckCircleOutlined, EditOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { FaFemale, FaMale } from "react-icons/fa";
import { MdAssignment } from "react-icons/md";
import dayjs from "dayjs";
import api from "../../api/axiosInstance";
import { getAllEnrollments, updateEnrollmentStatus } from "../../services/feeService";
import { useModulePermissions } from "../../hooks/usePermissions";

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const STATUS_OPTIONS = [
  {
    label: "Dropout",
    value: "Dropped",
    helper: "Remove the student from active enrolled students and show in dropout filters.",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    label: "Passout",
    value: "Completed",
    helper: "Remove the student from active enrolled students and show in passout filters.",
    color: "#0F766E",
    bg: "#ECFEFF",
  },
];

const ACTIVE_STATUS_SET = new Set(["active", "enrolled"]);

const EnrollmentManagement = () => {
  const navigate = useNavigate();
  const permissions = useModulePermissions("students");
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("Dropped");

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    await Promise.all([fetchEnrollments(), fetchStudents()]);
  };

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const response = await getAllEnrollments({ limit: 10000 });
      if (response.success) {
        setEnrollments(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch enrollments");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get("/student/admissions", { params: { limit: 10000 } });
      if (response.data.success) {
        setStudents(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch student records");
    }
  };

  const activeEnrolledStudents = useMemo(() => {
    const grouped = new Map();
    const studentMap = new Map(
      students.map((student) => [String(student._id), student]),
    );

    enrollments.forEach((enrollment) => {
      const status = normalizeStatus(enrollment.status);
      if (!ACTIVE_STATUS_SET.has(status)) {
        return;
      }

      const enrolledStudent = enrollment.student;
      const studentId = enrolledStudent?._id || enrolledStudent;
      if (!studentId) return;

      const fullStudent = studentMap.get(String(studentId)) || enrolledStudent || {};

      if (!grouped.has(String(studentId))) {
        grouped.set(String(studentId), {
          _id: String(studentId),
          student: fullStudent,
          activeEnrollments: [],
          firstEnrollmentDate: enrollment.enrollmentDate || null,
          latestEnrollmentDate: enrollment.enrollmentDate || null,
          pendingInstallments: 0,
        });
      }

      const record = grouped.get(String(studentId));
      record.student = {
        ...(record.student || {}),
        ...(enrolledStudent || {}),
        ...(fullStudent || {}),
      };
      record.activeEnrollments.push(enrollment);

      if (
        !record.firstEnrollmentDate ||
        dayjs(enrollment.enrollmentDate).isBefore(dayjs(record.firstEnrollmentDate))
      ) {
        record.firstEnrollmentDate = enrollment.enrollmentDate;
      }

      if (
        !record.latestEnrollmentDate ||
        dayjs(enrollment.enrollmentDate).isAfter(dayjs(record.latestEnrollmentDate))
      ) {
        record.latestEnrollmentDate = enrollment.enrollmentDate;
      }

      const installments = enrollment.feeStructure?.installments || [];
      record.pendingInstallments += installments.filter(
        (item) => normalizeStatus(item.status) !== "paid",
      ).length;
    });

    return Array.from(grouped.values()).sort((a, b) =>
      dayjs(b.latestEnrollmentDate).valueOf() - dayjs(a.latestEnrollmentDate).valueOf(),
    );
  }, [enrollments, students]);

  const openStatusModal = (record) => {
    setSelectedRecord(record);
    setSelectedStatus("Dropped");
    setStatusModalOpen(true);
  };

  const closeStatusModal = (force = false) => {
    if (statusSubmitting && !force) return;
    setStatusModalOpen(false);
    setSelectedRecord(null);
    setSelectedStatus("Dropped");
  };

  const handleStatusChange = async () => {
    if (!selectedRecord || !selectedStatus) return;

    setStatusSubmitting(true);
    try {
      await Promise.all(
        selectedRecord.activeEnrollments.map((enrollment) =>
          updateEnrollmentStatus(enrollment._id, {
            status: selectedStatus,
            completionDate:
              selectedStatus === "Completed" ? dayjs().format("YYYY-MM-DD") : null,
          }),
        ),
      );

      const selectedStatusMeta = STATUS_OPTIONS.find(
        (option) => option.value === selectedStatus,
      );
      message.success(
        `${selectedRecord.student?.studentName || "Student"} marked as ${
          selectedStatusMeta?.label || selectedStatus
        } successfully.`,
      );
      closeStatusModal(true);
      await refreshData();
    } catch (error) {
      message.error(error?.message || error?.response?.data?.message || "Failed to update student status");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const pendingInstallments = activeEnrolledStudents.reduce(
      (sum, student) => sum + student.pendingInstallments,
      0,
    );
    const activeCourses = activeEnrolledStudents.reduce(
      (sum, student) => sum + student.activeEnrollments.length,
      0,
    );
    const newThisMonth = activeEnrolledStudents.filter((student) =>
      student.firstEnrollmentDate
        ? dayjs(student.firstEnrollmentDate).isSame(dayjs(), "month")
        : false,
    ).length;

    return {
      students: activeEnrolledStudents.length,
      activeCourses,
      pendingInstallments,
      newThisMonth,
    };
  }, [activeEnrolledStudents]);

  const columns = [
    {
      title: "Student",
      key: "student",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={44}
            src={record.student?.profilePicture || null}
            icon={
              normalizeStatus(record.student?.gender) === "male" ? (
                <FaMale />
              ) : (
                <FaFemale />
              )
            }
            style={{
              background:
                normalizeStatus(record.student?.gender) === "male"
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            }}
          />
          <div>
            <div className="font-semibold text-[#1F2937]">
              {record.student?.studentName || "N/A"}
            </div>
            <div className="text-xs text-[#64748B]">
              {record.student?.registrationNo || "No registration no"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Gender",
      key: "gender",
      render: (_, record) => (
        <Tag color={normalizeStatus(record.student?.gender) === "male" ? "blue" : "pink"}>
          {record.student?.gender || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Mobile",
      key: "mobile",
      render: (_, record) => record.student?.mobileNumber || "N/A",
    },
    {
      title: "Father",
      key: "father",
      render: (_, record) => (
        <div>
          <div>{record.student?.fatherName || "N/A"}</div>
          <div className="text-xs text-[#64748B]">
            {record.student?.fatherContact || "N/A"}
          </div>
        </div>
      ),
    },
    {
      title: "Enrollment Date",
      key: "enrollmentDate",
      render: (_, record) =>
        record.firstEnrollmentDate
          ? dayjs(record.firstEnrollmentDate).format("DD/MM/YYYY")
          : "N/A",
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <div className="flex flex-col gap-2">
          <Tag color="green" style={{ width: "fit-content", marginInlineEnd: 0 }}>
            Active Enrolled
          </Tag>
          <span className="text-xs text-[#64748B]">
            {record.activeEnrollments.length} active course
            {record.activeEnrollments.length > 1 ? "s" : ""}
          </span>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View full student details, course, installments, and payments">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/dashboard/students/${record._id}`)}
              style={{ background: "#01134C", borderColor: "#01134C" }}
            />
          </Tooltip>
          {permissions.update && (
            <Tooltip title="Change student status to dropout or passout">
              <Button
                icon={<EditOutlined />}
                onClick={() => openStatusModal(record)}
                style={{
                  borderColor: "#C7D2FE",
                  color: "#312E81",
                  background: "#EEF2FF",
                  fontWeight: 600,
                }}
              >
                Change Status
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdAssignment size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="module-title">Enroll Students</h2>
            <p className="module-subtitle">
              Show only active enrolled students. Course, installment, fee, and
              payment details are available on the detailed student page.
            </p>
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={refreshData}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Card>
          <Statistic title="Active Enrolled Students" value={stats.students} />
        </Card>
        <Card>
          <Statistic title="Active Courses" value={stats.activeCourses} />
        </Card>
        <Card>
          <Statistic title="Pending Installments" value={stats.pendingInstallments} />
        </Card>
        <Card>
          <Statistic title="New This Month" value={stats.newThisMonth} />
        </Card>
      </div>

      <Card>
        <div className="mb-4 text-sm text-[#64748B]">
          This table only shows students who already have an active assigned course.
          Use the eye button to open the full student details page.
        </div>
        <Table
          columns={columns}
          dataSource={activeEnrolledStudents}
          rowKey="_id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} active enrolled students`,
          }}
          locale={{ emptyText: "No active enrolled students found" }}
        />
      </Card>

      <Modal
        open={statusModalOpen}
        centered
        onCancel={closeStatusModal}
        onOk={handleStatusChange}
        confirmLoading={statusSubmitting}
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
            <CheckCircleOutlined style={{ color: "#E8FC0A", fontSize: 24 }} />
          </div>

          <Typography.Title level={4} style={{ marginBottom: 8, color: "#0F172A" }}>
            Update Student Status
          </Typography.Title>
          <Typography.Paragraph style={{ color: "#475569", marginBottom: 18 }}>
            Change the status for{" "}
            <strong>{selectedRecord?.student?.studentName || "this student"}</strong>.
            After confirmation, the student will be removed from the active enrolled
            students list and shown in the related student category tables.
          </Typography.Paragraph>

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
              {selectedRecord?.student?.studentName || "N/A"}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              Registration No: {selectedRecord?.student?.registrationNo || "No registration no"}
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
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: "100%" }}
              size="large"
              options={STATUS_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
            />
            <div
              style={{
                marginTop: 12,
                borderRadius: 12,
                padding: "12px 14px",
                background:
                  STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.bg ||
                  "#F8FAFC",
                color:
                  STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.color ||
                  "#334155",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.helper}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EnrollmentManagement;
