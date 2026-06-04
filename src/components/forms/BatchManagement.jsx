import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Button,
  Modal,
  Table,
  Space,
  message,
  Popconfirm,
  Tag,
  Card,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { formatDateOnlyForApi } from "../../utils/date";
import {
  createBatch,
  updateBatch,
  deleteBatch,
  getAllBatches,
  getBatchesByCourse,
} from "../../services/batchService";

const { Option } = Select;

const resolveCourseRef = (course) => course?._id || course?.id || course || null;

const BatchManagement = ({
  courseId = null,
  courseName = "",
  courses = [],
  onCourseChange = null,
}) => {
  const normalizedCourseId = resolveCourseRef(courseId);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(normalizedCourseId || null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setSelectedCourseId(normalizedCourseId || null);
  }, [normalizedCourseId]);

  const courseOptions = useMemo(
    () =>
      courses.map((course) => ({
        label: `${course.courseName} (${course.courseId})`,
        value: course._id,
      })),
    [courses],
  );

  const currentCourseLabel = useMemo(() => {
    if (courseName && normalizedCourseId && !selectedCourseId) {
      return courseName;
    }

    const selectedCourse = courses.find((course) => course._id === selectedCourseId);
    return selectedCourse ? selectedCourse.courseName : "All Courses";
  }, [courseName, normalizedCourseId, courses, selectedCourseId]);

  const selectedCourseDetails = useMemo(() => {
    if (!selectedCourseId) return null;
    return courses.find((course) => course._id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const summaryStats = useMemo(() => {
    const totalBatches = batches.length;
    const activeBatches = batches.filter((batch) => batch.status === "Active").length;
    const upcomingBatches = batches.filter((batch) => batch.status === "Upcoming").length;
    const completedBatches = batches.filter((batch) => batch.status === "Completed").length;
    const totalStudents = batches.reduce(
      (sum, batch) => sum + Number(batch.currentStudents || 0),
      0,
    );
    const totalCapacity = batches.reduce(
      (sum, batch) => sum + Number(batch.maxStudents || 0),
      0,
    );
    const linkedCourses = new Set(
      batches
        .map((batch) => resolveCourseRef(batch.course))
        .filter(Boolean),
    ).size;
    const morningBatches = batches.filter((batch) => batch.shift === "Morning").length;
    const eveningBatches = batches.filter((batch) => batch.shift === "Evening").length;

    return {
      totalBatches,
      activeBatches,
      upcomingBatches,
      completedBatches,
      totalStudents,
      totalCapacity,
      linkedCourses,
      morningBatches,
      eveningBatches,
    };
  }, [batches]);

  useEffect(() => {
    fetchBatches(normalizedCourseId || selectedCourseId || null);
  }, [normalizedCourseId, selectedCourseId]);

  const fetchBatches = async (targetCourseId = normalizedCourseId || selectedCourseId || null) => {
    setLoading(true);
    try {
      const response = targetCourseId
        ? await getBatchesByCourse(targetCourseId)
        : await getAllBatches();

      if (response.success) {
        setBatches(response.data || []);
      }
    } catch (error) {
      message.error("Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedCourse = (value) => {
    setSelectedCourseId(value || null);
    setFilterDropdownOpen(false);
    if (typeof onCourseChange === "function") {
      onCourseChange(value || null);
    }
  };

  const handleAddBatch = () => {
    setEditingBatch(null);
    form.resetFields();
    form.setFieldsValue({
      course: normalizedCourseId || selectedCourseId || undefined,
      shift: "Morning",
      days: "Monday to Saturday",
      hoursPerDay: 2,
      maxStudents: 30,
      status: "Active",
    });
    setModalVisible(true);
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    form.setFieldsValue({
      ...batch,
      course: resolveCourseRef(batch.course),
      startDate: batch.startDate ? dayjs(batch.startDate) : null,
      endDate: batch.endDate ? dayjs(batch.endDate) : null,
    });
    setModalVisible(true);
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      const response = await deleteBatch(batchId);
      if (response.success) {
        message.success("Batch deleted successfully");
        fetchBatches();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to delete batch");
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const batchData = {
        ...values,
        course: normalizedCourseId || values.course,
        startDate: formatDateOnlyForApi(values.startDate),
        endDate: formatDateOnlyForApi(values.endDate),
      };

      let response;
      if (editingBatch) {
        response = await updateBatch(editingBatch._id, batchData);
        message.success("Batch updated successfully");
      } else {
        response = await createBatch(batchData);
        message.success("Batch created successfully");
      }

      if (response.success) {
        setModalVisible(false);
        form.resetFields();

        if (!normalizedCourseId && batchData.course) {
          updateSelectedCourse(batchData.course);
        }

        fetchBatches(batchData.course || normalizedCourseId || selectedCourseId || null);
      }
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          `Failed to ${editingBatch ? "update" : "create"} batch`,
      );
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    ...(!normalizedCourseId
      ? [
          {
            title: "Course",
            key: "course",
            render: (_, record) => (
              <div>
                <div className="font-semibold text-primary">
                  {record.course?.courseName || "No course"}
                </div>
                <div className="text-xs text-slate-500">
                  {record.course?.courseId || "No ID"}
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      title: "Batch Code",
      dataIndex: "batchCode",
      key: "batchCode",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Batch Name",
      dataIndex: "batchName",
      key: "batchName",
    },
    {
      title: "Shift",
      dataIndex: "shift",
      key: "shift",
      render: (shift) => (
        <Tag color={shift === "Morning" ? "gold" : "purple"}>{shift}</Tag>
      ),
    },
    {
      title: "Days",
      dataIndex: "days",
      key: "days",
    },
    {
      title: "Hours/Day",
      dataIndex: "hoursPerDay",
      key: "hoursPerDay",
      render: (hours) => `${hours}h`,
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "N/A"),
    },
    {
      title: "Students",
      key: "students",
      render: (_, record) => (
        <span>
          {record.currentStudents || 0} / {record.maxStudents}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colors = {
          Active: "green",
          Upcoming: "blue",
          Completed: "default",
          Cancelled: "red",
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setViewingBatch(record)}
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditBatch(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this batch?"
            onConfirm={() => handleDeleteBatch(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      className="theme-font courses-module"
      title="Batch Management"
      extra={
        <Space wrap>
          <Select
            allowClear
            showSearch
            placeholder="Filter by course"
            value={selectedCourseId || undefined}
            open={filterDropdownOpen}
            options={courseOptions}
            optionFilterProp="label"
            style={{ width: 260 }}
            onDropdownVisibleChange={setFilterDropdownOpen}
            onChange={updateSelectedCourse}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchBatches()}
            disabled={loading}
            title="Refresh batches"
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddBatch}
            className="bg-primary"
          >
            Add Batch
          </Button>
        </Space>
      }
      style={{ marginTop: 20 }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>Link each batch with a course from here.</span>
        {!normalizedCourseId && (
          <span>
            Current view: <span className="font-semibold text-primary">{currentCourseLabel}</span>
          </span>
        )}
        {normalizedCourseId && selectedCourseId && (
          <span>
            Current view: <span className="font-semibold text-primary">{currentCourseLabel}</span>
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Selected Course
          </div>
          <div className="mt-1 text-[14px] font-semibold leading-tight text-primary">
            {selectedCourseDetails?.courseName || currentCourseLabel}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {selectedCourseDetails?.courseId
              ? `Course ID: ${selectedCourseDetails.courseId}`
              : `${summaryStats.linkedCourses} linked course${summaryStats.linkedCourses === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Total Batches
          </div>
          <div className="mt-1 text-[21px] font-bold leading-none text-primary">
            {summaryStats.totalBatches}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summaryStats.activeBatches} active batch{summaryStats.activeBatches === 1 ? "" : "es"}
          </div>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Students Assigned
          </div>
          <div className="mt-1 text-[21px] font-bold leading-none text-primary">
            {summaryStats.totalStudents}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            of {summaryStats.totalCapacity} total seats
          </div>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Upcoming Batches
          </div>
          <div className="mt-1 text-[21px] font-bold leading-none text-primary">
            {summaryStats.upcomingBatches}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summaryStats.completedBatches} completed
          </div>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Batch Timing
          </div>
          <div className="mt-1 text-[16px] font-bold leading-none text-primary">
            {summaryStats.morningBatches} morning / {summaryStats.eveningBatches} evening
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Total morning and evening batches
          </div>
        </div>
      </div>

      <Table
        dataSource={batches}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 6 }}
        tableLayout="auto"
      />

      <Modal
        title="Batch Details"
        open={!!viewingBatch}
        onCancel={() => setViewingBatch(null)}
        footer={null}
        width={760}
        centered
        className="theme-font courses-module"
      >
        {viewingBatch && (
          <div className="space-y-4">
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Batch Overview
              </div>
              <div className="mt-1 text-[18px] font-bold text-primary">
                {viewingBatch.batchName}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {viewingBatch.batchCode}
              </div>
            </div>

            <Descriptions
              bordered
              size="small"
              column={2}
              labelStyle={{ fontWeight: 600, width: "160px" }}
            >
              <Descriptions.Item label="Course">
                {viewingBatch.course?.courseName || "No course"}
              </Descriptions.Item>
              <Descriptions.Item label="Course ID">
                {viewingBatch.course?.courseId || "No ID"}
              </Descriptions.Item>
              <Descriptions.Item label="Shift">
                {viewingBatch.shift || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {viewingBatch.status || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Days">
                {viewingBatch.days || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Hours Per Day">
                {viewingBatch.hoursPerDay ? `${viewingBatch.hoursPerDay}h` : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {viewingBatch.startDate
                  ? dayjs(viewingBatch.startDate).format("DD MMM YYYY")
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {viewingBatch.endDate
                  ? dayjs(viewingBatch.endDate).format("DD MMM YYYY")
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Students">
                {viewingBatch.currentStudents || 0} / {viewingBatch.maxStudents || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {viewingBatch.createdAt
                  ? dayjs(viewingBatch.createdAt).format("DD MMM YYYY")
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {viewingBatch.description || "No description added"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title={editingBatch ? "Edit Batch" : "Create New Batch"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={860}
        centered
        destroyOnClose
        className="theme-font courses-module"
      >
        <div className="pb-2">
          <p className="mb-1 text-sm font-medium text-slate-700">
            {normalizedCourseId ? currentCourseLabel : "Assign batch to a course"}
          </p>
          <p className="m-0 text-xs text-slate-500">
            Create, update, and link batches with the correct course from one place.
          </p>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
          className="pt-3"
        >
          <div className="grid grid-cols-1 gap-x-5 md:grid-cols-2">
            {!normalizedCourseId && (
              <Form.Item
                name="course"
                label="Assigned Course"
                rules={[{ required: true, message: "Please select a course" }]}
              >
                <Select
                  size="large"
                  showSearch
                  placeholder="Select course"
                  options={courseOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            )}

            <Form.Item
              name="batchCode"
              label="Batch Code"
              rules={[{ required: true, message: "Please enter batch code" }]}
            >
              <Input placeholder="e.g., BATCH-2024-01" size="large" />
            </Form.Item>

            <Form.Item
              name="batchName"
              label="Batch Name"
              rules={[{ required: true, message: "Please enter batch name" }]}
            >
              <Input
                placeholder="e.g., Morning Batch January 2024"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="shift"
              label="Shift"
              rules={[{ required: true, message: "Please select shift" }]}
            >
              <Select size="large">
                <Option value="Morning">Morning</Option>
                <Option value="Evening">Evening</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="days"
              label="Days"
              rules={[{ required: true, message: "Please select days" }]}
            >
              <Select size="large">
                <Option value="Monday to Saturday">Monday to Saturday</Option>
                <Option value="Monday to Thursday">Monday to Thursday</Option>
                <Option value="Saturday & Sunday">Saturday & Sunday</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="hoursPerDay"
              label="Hours Per Day"
              rules={[{ required: true, message: "Please select hours per day" }]}
            >
              <Select size="large">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((hour) => (
                  <Option key={hour} value={hour}>
                    {hour} Hour{hour > 1 ? "s" : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="maxStudents"
              label="Maximum Students"
              rules={[{ required: true, message: "Please enter maximum students" }]}
            >
              <InputNumber
                min={1}
                max={100}
                size="large"
                style={{ width: "100%" }}
                placeholder="e.g., 30"
              />
            </Form.Item>

            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: "Please select start date" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                size="large"
              />
            </Form.Item>

            <Form.Item name="endDate" label="End Date (Optional)">
              <DatePicker
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Please select status" }]}
            >
              <Select size="large">
                <Option value="Active">Active</Option>
                <Option value="Upcoming">Upcoming</Option>
                <Option value="Completed">Completed</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea
              rows={4}
              placeholder="Enter batch description..."
              style={{ resize: "none" }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary"
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                {editingBatch ? "Update Batch" : "Create Batch"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default BatchManagement;
