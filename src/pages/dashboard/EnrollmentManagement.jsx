import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Card, Space, Statistic, Table, Tag, Tooltip, message } from "antd";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { FaFemale, FaMale } from "react-icons/fa";
import { MdAssignment } from "react-icons/md";
import dayjs from "dayjs";
import api from "../../api/axiosInstance";
import { getAllEnrollments } from "../../services/feeService";

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const EnrollmentManagement = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEnrollments();
    fetchStudents();
  }, []);

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
      if (status !== "active" && status !== "enrolled") {
        return;
      }

      const student = enrollment.student;
      const studentId = student?._id || student;
      if (!studentId || !student) return;
      const fullStudent = studentMap.get(String(studentId)) || student;

      if (!grouped.has(studentId)) {
        grouped.set(studentId, {
          _id: studentId,
          student: fullStudent,
          activeEnrollments: [],
          firstEnrollmentDate: enrollment.enrollmentDate || null,
          latestEnrollmentDate: enrollment.enrollmentDate || null,
          pendingInstallments: 0,
        });
      }

      const record = grouped.get(studentId);
      record.student = {
        ...record.student,
        ...fullStudent,
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
      render: () => <Tag color="green">Active Enrolled</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Tooltip title="View full student details, course, installments, and payments">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/students/${record._id}`)}
            style={{ background: "#01134C", borderColor: "#01134C" }}
          />
        </Tooltip>
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
        <Button icon={<ReloadOutlined />} onClick={fetchEnrollments}>
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
    </div>
  );
};

export default EnrollmentManagement;
