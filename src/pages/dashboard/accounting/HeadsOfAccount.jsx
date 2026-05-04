import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Select,
  Space,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
  Tooltip,
  Switch,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { ScaleLoader } from "react-spinners";
import {
  getAccountingTypes,
  getHeadsOfAccount,
  createHeadOfAccount,
  updateHeadOfAccount,
  deleteHeadOfAccount,
} from "../../../services/accountingService";

const { Option } = Select;
const { TextArea } = Input;

const HeadsOfAccount = () => {
  const [heads, setHeads] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form] = Form.useForm();

  // ── Fetch on mount and filter change ──────────────────────
  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    fetchHeads();
  }, [typeFilter]);

  const fetchTypes = async () => {
    try {
      const res = await getAccountingTypes();
      if (res?.success) {
        setTypes(res.data);
      } else {
        console.error("fetchTypes — unexpected response:", res);
        message.error(res?.message || "Failed to load accounting types");
      }
    } catch (err) {
      console.error("fetchTypes error:", err);
      message.error(err?.message || "Could not connect to accounting API");
    }
  };

  const fetchHeads = async () => {
    setLoading(true);
    try {
      const res = await getHeadsOfAccount(typeFilter, true);
      if (res?.success) {
        setHeads(res.data);
      } else {
        console.error("fetchHeads — unexpected response:", res);
        message.error(res?.message || "Failed to load heads of account");
      }
    } catch (err) {
      console.error("fetchHeads error:", err);
      message.error(err?.message || "Could not connect to accounting API");
    } finally {
      setLoading(false);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────
  const openCreateModal = () => {
    setEditingHead(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingHead(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type?._id,
      description: record.description,
      isActive: record.isActive !== false,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingHead(null);
    form.resetFields();
  };

  // ── Submit form ────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (editingHead) {
        const res = await updateHeadOfAccount(editingHead._id, values);
        if (res.success) {
          message.success("Head of account updated successfully");
          closeModal();
          fetchHeads();
        }
      } else {
        const res = await createHeadOfAccount(values);
        if (res.success) {
          message.success("Head of account created successfully");
          closeModal();
          fetchHeads();
        }
      }
    } catch (err) {
      if (err?.message) message.error(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await deleteHeadOfAccount(id);
      if (res.success) {
        message.success("Head of account deactivated");
        fetchHeads();
      }
    } catch (err) {
      message.error(err?.message || "Failed to deactivate");
    }
  };

  // ── Table columns ──────────────────────────────────────────
  const columns = [
    {
      title: "#",
      key: "index",
      width: 55,
      render: (_, __, index) => (
        <span className="text-muted font-semibold">{index + 1}</span>
      ),
    },
    {
      title: "Head Name",
      dataIndex: "name",
      key: "name",
      render: (name) => <span className="font-semibold text-dark">{name}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) =>
        type?.name === "Income" ? (
          <Tag color="green">Income</Tag>
        ) : (
          <Tag color="red">Expense</Tag>
        ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc) => (
        <span className="text-muted text-sm">{desc || "—"}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) =>
        isActive ? (
          <Tag color="blue">Active</Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? "Deactivate" : "Already inactive"}>
            <Popconfirm
              title="Deactivate this head of account?"
              description="It won't appear in transaction forms."
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
              disabled={!record.isActive}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={!record.isActive}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <AppstoreOutlined style={{ color: "#E8FC0A", fontSize: 20 }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark m-0">
              Heads of Account
            </h2>
            <p className="text-muted text-sm m-0">
              Manage income and expense categories
            </p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ backgroundColor: "#01134C", borderColor: "#01134C" }}
        >
          Add Head
        </Button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft p-4 mb-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-dark">Filter by Type:</span>
        <Select
          placeholder="All Types"
          allowClear
          style={{ width: 180 }}
          value={typeFilter}
          onChange={(val) => setTypeFilter(val || null)}
        >
          {types.map((t) => (
            <Option key={t._id} value={t._id}>
              {t.name === "Income" ? (
                <Tag color="green" style={{ marginRight: 4 }}>
                  Income
                </Tag>
              ) : (
                <Tag color="red" style={{ marginRight: 4 }}>
                  Expense
                </Tag>
              )}
              {t.name}
            </Option>
          ))}
        </Select>
        <span className="text-muted text-sm ml-auto">
          Total: <strong>{heads.length}</strong> heads
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <ScaleLoader color="#01134C" />
          </div>
        ) : (
          <Table
            dataSource={heads}
            columns={columns}
            rowKey="_id"
            pagination={false}
            scroll={{ x: "max-content" }}
            rowClassName={(record) => (!record.isActive ? "opacity-50" : "")}
          />
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ color: "#01134C" }}>
            <AppstoreOutlined />
            <span>
              {editingHead ? "Edit Head of Account" : "Add Head of Account"}
            </span>
          </div>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editingHead ? "Update" : "Create"}
        confirmLoading={submitLoading}
        okButtonProps={{
          style: { backgroundColor: "#01134C", borderColor: "#01134C" },
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Head Name"
            name="name"
            rules={[{ required: true, message: "Please enter head name" }]}
          >
            <Input placeholder="e.g. Tuition Fee, Salary" />
          </Form.Item>

          <Form.Item
            label="Accounting Type"
            name="type"
            rules={[{ required: true, message: "Please select a type" }]}
          >
            <Select placeholder="Select Income or Expense">
              {types.map((t) => (
                <Option key={t._id} value={t._id}>
                  <Tag
                    color={t.name === "Income" ? "green" : "red"}
                    style={{ marginRight: 6 }}
                  >
                    {t.name}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              rows={3}
              placeholder="Optional description"
              maxLength={200}
              showCount
            />
          </Form.Item>

          {editingHead && (
            <Form.Item label="Status" name="isActive" valuePropName="checked">
              <Switch
                checkedChildren="Active"
                unCheckedChildren="Inactive"
                className="custom-toggle"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default HeadsOfAccount;
