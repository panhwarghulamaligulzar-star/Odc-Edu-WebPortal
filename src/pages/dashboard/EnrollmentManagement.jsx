import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Space,
  message,
  Tag,
  Row,
  Col,
} from "antd";
import { PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  createEnrollment,
  getAllEnrollments,
  updateEnrollmentStatus,
  getCourses,
} from "../../services/feeService";
import api from "../../api/axiosInstance";
import dayjs from "dayjs";
import { MdAssignment } from "react-icons/md";
import EnrollmentFeeConfiguration from "../../components/forms/EnrollmentFeeConfiguration";
import { formatDateOnlyForApi } from "../../utils/date";

const EnrollmentManagement = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [installmentPlan, setInstallmentPlan] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchEnrollments();
    fetchStudents();
    fetchCourses();
  }, [pagination.current, statusFilter]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const filters = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (statusFilter) filters.status = statusFilter;

      const response = await getAllEnrollments(filters);
      if (response.success) {
        setEnrollments(response.data);
        setPagination({
          ...pagination,
          total: response.pagination.total,
        });
      }
    } catch (error) {
      message.error("Failed to fetch enrollments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get("/student/admissions");
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const handleInstallmentPlanCalculated = (plan) => {
    setInstallmentPlan(plan);
  };

  const handleCreateEnrollment = async (values) => {
    setProcessing(true);
    try {
      if (!installmentPlan) {
        message.error("Please wait for fee calculation to complete");
        setProcessing(false);
        return;
      }

      const enrollmentData = {
        studentId: values.studentId,
        courseId: values.courseId,
        enrollmentDate:
          formatDateOnlyForApi(values.enrollmentDate) ||
          formatDateOnlyForApi(dayjs()),
        notes: values.notes,
        // Fee structure data
        admissionFee: values.admissionFee || 0,
        courseFee: values.courseFee || 0,
        certificateFee: values.certificateFee || 0,
        totalFee: installmentPlan.summary.totalFee,
        discount: installmentPlan.summary.totalDiscount,
        discountType: values.discountType || "none",
        discountOnAdmission: values.discountOnAdmission || 0,
        discountOnCourseFee: values.discountOnCourseFee || 0,
        numberOfInstallments: installmentPlan.installments.length,
        installments: installmentPlan.installments,
      };

      const response = await createEnrollment(enrollmentData);
      if (response.success) {
        message.success("Student enrolled successfully with fee structure!");
        setModalVisible(false);
        form.resetFields();
        setInstallmentPlan(null);
        fetchEnrollments();
      }
    } catch (error) {
      message.error(error.message || "Failed to enroll student");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (enrollmentId, status) => {
    try {
      const response = await updateEnrollmentStatus(enrollmentId, { status });
      if (response.success) {
        message.success("Enrollment status updated successfully!");
        fetchEnrollments();
      }
    } catch (error) {
      message.error(error.message || "Failed to update status");
    }
  };

  const columns = [
    {
      title: "Student",
      dataIndex: ["student", "studentName"],
      key: "studentName",
      render: (text, record) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-xs opacity-50">
            {record.student?.registrationNo}
          </div>
        </div>
      ),
    },
    {
      title: "Gender",
      dataIndex: ["student", "gender"],
      key: "gender",
      render: (gender) => (
        <Tag color={gender === "Male" ? "blue" : "pink"}>{gender}</Tag>
      ),
    },
    {
      title: "Mobile",
      dataIndex: ["student", "mobileNumber"],
      key: "mobile",
    },
    {
      title: "Course",
      dataIndex: ["course", "courseName"],
      key: "courseName",
      render: (text, record) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-xs opacity-50">{record.course?.courseId}</div>
          <div className="text-xs opacity-50">
            {record.course?.shift} • {record.course?.duration} Months
          </div>
        </div>
      ),
    },
    {
      title: "Enrollment Date",
      dataIndex: "enrollmentDate",
      key: "enrollmentDate",
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.enrollmentDate) - new Date(b.enrollmentDate),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colors = {
          Active: "green",
          Completed: "blue",
          Dropped: "red",
          "On Hold": "orange",
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
      filters: [
        { text: "Active", value: "Active" },
        { text: "Completed", value: "Completed" },
        { text: "Dropped", value: "Dropped" },
        { text: "On Hold", value: "On Hold" },
      ],
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Select
          size="small"
          value={record.status}
          onChange={(value) => handleUpdateStatus(record._id, value)}
          style={{ width: 120 }}
        >
          <Select.Option value="Active">Active</Select.Option>
          <Select.Option value="Completed">Completed</Select.Option>
          <Select.Option value="Dropped">Dropped</Select.Option>
          <Select.Option value="On Hold">On Hold</Select.Option>
        </Select>
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
            <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
              Enrollment Management
            </h2>
            <p className="text-sm m-0" style={{ color: "#6b7280" }}>
              Manage & track student enrollments
            </p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          size="large"
          onClick={() => setModalVisible(true)}
        >
          Enroll Student
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Space>
            <span className="opacity-60">Filter by Status:</span>
            <Select
              style={{ width: 150 }}
              placeholder="All Statuses"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
              <Select.Option value="Dropped">Dropped</Select.Option>
              <Select.Option value="On Hold">On Hold</Select.Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={enrollments}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} enrollments`,
          }}
          onChange={(newPagination) => setPagination(newPagination)}
        />
      </Card>

      {/* Enrollment Modal */}
      <Modal
        title="Enroll Student in Course"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setInstallmentPlan(null);
        }}
        footer={null}
        width={1100}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateEnrollment}
          disabled={processing}
          initialValues={{
            enrollmentDate: dayjs(),
            discountType: "none",
            discountOnAdmission: 0,
            discountOnCourseFee: 0,
          }}
        >
          <Form.Item
            name="studentId"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Select Student
              </span>
            }
            rules={[{ required: true, message: "Please select a student" }]}
          >
            <Select
              size="large"
              placeholder="Search and select student"
              className="form-input !font-ArialLight"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {students.map((student) => (
                <Select.Option key={student._id} value={student._id}>
                  {student.studentName}
                  {student.registrationNo ? ` (${student.registrationNo})` : ""}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Fee Configuration Section */}
          <EnrollmentFeeConfiguration
            form={form}
            courses={courses}
            onInstallmentPlanCalculated={handleInstallmentPlanCalculated}
          />

          <Form.Item
            name="notes"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Notes (Optional)
              </span>
            }
          >
            <Input.TextArea
              size="large"
              className="form-input !font-ArialLight"
              placeholder="Any additional notes about this enrollment"
              rows={3}
            />
          </Form.Item>

          <div className="mt-4 pt-4 border-t">
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              className="btn-xl hover:!bg-blue-900"
              loading={processing}
              disabled={!installmentPlan}
            >
              <span>Enroll Student with Fee Structure</span>
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EnrollmentManagement;
