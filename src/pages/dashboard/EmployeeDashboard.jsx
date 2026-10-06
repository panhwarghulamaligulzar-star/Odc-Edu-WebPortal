import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Statistic,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { BookOpen, GraduationCap, Layers } from "lucide-react";
import {
  changeMyEmployeePassword,
  getEmployeeDashboard,
  updateMyEmployeeProfile,
} from "../../services/employeeService";

const beforeUpload = (file) => {
  const isAllowed = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (!isAllowed) {
    message.error("Profile picture must be JPG, PNG, or WEBP.");
    return Upload.LIST_IGNORE;
  }
  if (file.size > 2 * 1024 * 1024) {
    message.error("Profile picture must be 2MB or smaller.");
    return Upload.LIST_IGNORE;
  }
  return false;
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await getEmployeeDashboard();
      setDashboard(response.data);
      const firstCourse = response.data?.courses?.[0];
      setSelectedCourseId((prev) => prev || firstCourse?._id || null);
      setSelectedBatchId((prev) => prev || firstCourse?.batches?.[0]?._id || null);
    } catch (error) {
      message.error(error.message || "Failed to load employee dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const profile = dashboard?.profile || {};
  const courses = dashboard?.courses || [];
  const summary = dashboard?.summary || {};
  const selectedCourse = courses.find((course) => course._id === selectedCourseId) || courses[0];
  const selectedBatch =
    selectedCourse?.batches?.find((batch) => batch._id === selectedBatchId) ||
    selectedCourse?.batches?.[0];

  const filteredStudents = useMemo(() => {
    const keyword = studentSearchTerm.trim().toLowerCase();
    const students = selectedBatch?.students || [];
    if (!keyword) return students;
    return students.filter((student) =>
      [student.name, student.email, student.registrationNo, student.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [studentSearchTerm, selectedBatch]);

  const openProfileModal = () => {
    profileForm.setFieldsValue({
      name: profile.name,
      phone: profile.phone,
      profile: [],
    });
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    if (location.search) navigate("/employee-dashboard", { replace: true });
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    if (location.search) navigate("/employee-dashboard", { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("profile") === "edit" && profile.name) {
      openProfileModal();
    }
    if (params.get("password") === "change") {
      setPasswordModalOpen(true);
    }
  }, [location.search, profile.name]);

  const handleProfileSave = async (values) => {
    setSaving(true);
    try {
      const response = await updateMyEmployeeProfile({
        name: values.name,
        phone: values.phone,
        profile: values.profile?.fileList || values.profile || [],
      });
      setDashboard((prev) => ({ ...prev, profile: response.data }));
      closeProfileModal();
      message.success("Profile updated successfully");
    } catch (error) {
      message.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (values) => {
    setSaving(true);
    try {
      await changeMyEmployeePassword(values);
      passwordForm.resetFields();
      closePasswordModal();
      message.success("Password changed successfully");
    } catch (error) {
      message.error(error.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const studentColumns = [
    { title: "Student", dataIndex: "name", key: "name" },
    { title: "Registration", dataIndex: "registrationNo", key: "registrationNo", render: (value) => value || "N/A" },
    { title: "Email", dataIndex: "email", key: "email", render: (value) => value || "N/A" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value, student) => (
        <Tag color={student.isActive ? "green" : "red"}>{value || (student.isActive ? "Active" : "Inactive")}</Tag>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Avatar size={58} src={profile.profile} icon={<UserOutlined />} />
          <div>
            <h2 className="module-title">Employee Dashboard</h2>
            <p className="module-subtitle">{profile.name || "Employee"} · {profile.designation || "Employee"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-[16px]"><Statistic title="Assigned Courses" value={summary.totalCourses || 0} prefix={<BookOpen size={18} />} /></Card>
        <Card className="rounded-[16px]"><Statistic title="Total Batches" value={summary.totalBatches || 0} prefix={<Layers size={18} />} /></Card>
        <Card className="rounded-[16px]"><Statistic title="Total Students" value={summary.totalStudents || 0} prefix={<GraduationCap size={18} />} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <Card title="Personal Information" loading={loading} className="rounded-[16px]">
          <div className="space-y-3 text-sm">
            <div><span className="text-slate-400">Name:</span> <span className="font-semibold text-primary">{profile.name || "N/A"}</span></div>
            <div><span className="text-slate-400">Email:</span> <span className="font-semibold text-primary">{profile.email || "N/A"}</span></div>
            <div><span className="text-slate-400">Phone:</span> <span className="font-semibold text-primary">{profile.phone || "N/A"}</span></div>
            <div><span className="text-slate-400">Designation:</span> <span className="font-semibold text-primary">{profile.designation || "Employee"}</span></div>
            <div><span className="text-slate-400">Status:</span> <Tag color={profile.isActive ? "green" : "red"}>{profile.isActive ? "Active" : "Inactive"}</Tag></div>
            <div><span className="text-slate-400">Joining Date:</span> <span className="font-semibold text-primary">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "N/A"}</span></div>
          </div>
        </Card>

        <Card title="Assigned Courses" loading={loading} className="rounded-[16px]">
          {courses.length ? (
            <Tabs
              activeKey={selectedCourse?._id}
              onChange={(courseId) => {
                const course = courses.find((item) => item._id === courseId);
                setSelectedCourseId(courseId);
                setSelectedBatchId(course?.batches?.[0]?._id || null);
                setStudentSearchTerm("");
              }}
              items={courses.map((course) => ({
                key: course._id,
                label: course.courseName,
                children: (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(course.batches || []).map((batch) => (
                        <Button
                          key={batch._id}
                          type={selectedBatch?._id === batch._id ? "primary" : "default"}
                          onClick={() => {
                            setSelectedBatchId(batch._id);
                            setStudentSearchTerm("");
                          }}
                        >
                          {batch.batchName} ({batch.students?.length || 0})
                        </Button>
                      ))}
                    </div>
                    {selectedBatch ? (
                      <>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-ArialBold text-primary">{selectedBatch.batchName}</div>
                            <div className="text-xs text-slate-500">{selectedBatch.batchCode} · {selectedBatch.shift} · {selectedBatch.status}</div>
                          </div>
                          <Input.Search
                            allowClear
                            className="md:w-[320px]"
                            placeholder="Search students..."
                            value={studentSearchTerm}
                            onChange={(event) => setStudentSearchTerm(event.target.value)}
                          />
                        </div>
                        <Table
                          rowKey={(record) => record.enrollmentId || record.studentId}
                          columns={studentColumns}
                          dataSource={filteredStudents}
                          pagination={{ pageSize: 8 }}
                          scroll={{ x: "max-content" }}
                        />
                      </>
                    ) : (
                      <Empty description="No batches found for this course" />
                    )}
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="No courses assigned yet" />
          )}
        </Card>
      </div>

      <Modal
        title="Update Profile"
        open={profileModalOpen}
        onCancel={closeProfileModal}
        onOk={() => profileForm.submit()}
        confirmLoading={saving}
      >
        <Form form={profileForm} layout="vertical" onFinish={handleProfileSave}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input className="form-input" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input className="form-input" />
          </Form.Item>
          <Form.Item name="profile" label="Profile Picture">
            <Upload beforeUpload={beforeUpload} maxCount={1} listType="picture">
              <Button icon={<UploadOutlined />}>Select JPG, PNG, or WEBP</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Change Password"
        open={passwordModalOpen}
        onCancel={closePasswordModal}
        onOk={() => passwordForm.submit()}
        confirmLoading={saving}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSave}>
          <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
            <Input.Password className="form-input password-input" />
          </Form.Item>
          <Form.Item name="newPassword" label="New Password" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password className="form-input password-input" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["newPassword"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password className="form-input password-input" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeDashboard;
