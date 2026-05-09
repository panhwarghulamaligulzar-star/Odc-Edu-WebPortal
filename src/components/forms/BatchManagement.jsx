import React, { useState, useEffect } from "react";
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { formatDateOnlyForApi } from "../../utils/date";
import {
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchesByCourse,
} from "../../services/batchService";

const { Option } = Select;

const BatchManagement = ({ courseId, courseName }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (courseId) {
      fetchBatches();
    }
  }, [courseId]);

  // Auto-refresh batches every 3 seconds to update student counts
  //   useEffect(() => {
  //     if (courseId && !modalVisible) {
  //       const interval = setInterval(() => {
  //         fetchBatches();
  //       }, 3000);
  //       return () => clearInterval(interval);
  //     }
  //   }, [courseId, modalVisible]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await getBatchesByCourse(courseId);
      if (response.success) {
        setBatches(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = () => {
    setEditingBatch(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    form.setFieldsValue({
      ...batch,
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
        course: courseId,
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
        fetchBatches();
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
    {
      title: "Batch Code",
      dataIndex: "batchCode",
      key: "batchCode",
      width: 120,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Batch Name",
      dataIndex: "batchName",
      key: "batchName",
      width: 200,
    },
    {
      title: "Shift",
      dataIndex: "shift",
      key: "shift",
      width: 100,
      render: (shift) => (
        <Tag color={shift === "Morning" ? "gold" : "purple"}>{shift}</Tag>
      ),
    },
    {
      title: "Days",
      dataIndex: "days",
      key: "days",
      width: 150,
    },
    {
      title: "Hours/Day",
      dataIndex: "hoursPerDay",
      key: "hoursPerDay",
      width: 100,
      render: (hours) => `${hours}h`,
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
      render: (date) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      width: 120,
      render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "N/A"),
    },
    {
      title: "Students",
      key: "students",
      width: 100,
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
      width: 100,
      render: (status) => {
        const colors = {
          Active: "green",
          Upcoming: "blue",
          Completed: "gray",
          Cancelled: "red",
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
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
      title={`Batches for ${courseName}`}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBatches}
            disabled={loading}
            title="Refresh student counts"
          >
            Refresh
          </Button>
          <Button
            type="primery"
            icon={<PlusOutlined />}
            onClick={handleAddBatch}
            className="bg-primary text-[#ffff]  "
          >
            Add Batch
          </Button>
        </Space>
      }
      style={{ marginTop: 20 }}
    >
      <Table
        dataSource={batches}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 5 }}
      />

      <Modal
        title={editingBatch ? "Edit Batch" : "Create New Batch"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
        >
          <Form.Item
            name="batchCode"
            label="Batch Code"
            rules={[{ required: true, message: "Please enter batch code" }]}
          >
            <Input
              placeholder="e.g., BATCH-2024-01"
              disabled={!!editingBatch}
            />
          </Form.Item>

          <Form.Item
            name="batchName"
            label="Batch Name"
            rules={[{ required: true, message: "Please enter batch name" }]}
          >
            <Input placeholder="e.g., Morning Batch January 2024" />
          </Form.Item>

          <Form.Item
            name="shift"
            label="Shift"
            rules={[{ required: true, message: "Please select shift" }]}
            initialValue="Morning"
          >
            <Select>
              <Option value="Morning">Morning</Option>
              <Option value="Evening">Evening</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="days"
            label="Days"
            rules={[{ required: true, message: "Please select days" }]}
            initialValue="Monday to Saturday"
          >
            <Select>
              <Option value="Monday to Saturday">Monday to Saturday</Option>
              <Option value="Monday to Thursday">Monday to Thursday</Option>
              <Option value="Saturday & Sunday">Saturday & Sunday</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="hoursPerDay"
            label="Hours Per Day"
            rules={[{ required: true, message: "Please select hours per day" }]}
            initialValue={2}
          >
            <Select>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((hour) => (
                <Option key={hour} value={hour}>
                  {hour} Hour{hour > 1 ? "s" : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true, message: "Please select start date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item name="endDate" label="End Date (Optional)">
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item
            name="maxStudents"
            label="Maximum Students"
            rules={[
              { required: true, message: "Please enter maximum students" },
            ]}
            initialValue={30}
          >
            <InputNumber
              min={1}
              max={100}
              style={{ width: "100%" }}
              placeholder="e.g., 30"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: "Please select status" }]}
            initialValue="Active"
          >
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Upcoming">Upcoming</Option>
              <Option value="Completed">Completed</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Enter batch description..." />
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
              <Button className="bg-primary text-[#ffff]" type="primery" htmlType="submit" loading={loading}>
                {editingBatch ? "Update" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default BatchManagement;
