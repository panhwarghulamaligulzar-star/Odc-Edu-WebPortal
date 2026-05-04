import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { ScaleLoader } from "react-spinners";
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "../../../services/accountingService";

const Banks = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await getPaymentMethods();
      if (res?.success) setMethods(res.data);
      else message.error(res?.message || "Failed to load payment methods");
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────
  const openCreateModal = () => {
    setEditingMethod(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingMethod(record);
    form.setFieldsValue({
      name: record.name,
      accountTitle: record.bankDetails?.accountTitle,
      accountNumber: record.bankDetails?.accountNumber,
      branchCode: record.bankDetails?.branchCode,
      bankName: record.bankDetails?.bankName,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingMethod(null);
    form.resetFields();
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      const payload = {
        name: values.name,
        bankDetails: {
          accountTitle: values.accountTitle || "",
          accountNumber: values.accountNumber || "",
          branchCode: values.branchCode || "",
          bankName: values.bankName || "",
        },
      };
      if (!editingMethod) payload.openingBalance = values.openingBalance || 0;

      if (editingMethod) {
        const res = await updatePaymentMethod(editingMethod._id, payload);
        if (res?.success) {
          message.success("Bank updated successfully");
          closeModal();
          fetchMethods();
        } else {
          message.error(res?.message || "Update failed");
        }
      } else {
        const res = await createPaymentMethod(payload);
        if (res?.success) {
          message.success("Bank added successfully");
          closeModal();
          fetchMethods();
        } else {
          message.error(res?.message || "Creation failed");
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
      const res = await deletePaymentMethod(id);
      if (res?.success) {
        message.success("Bank deactivated");
        fetchMethods();
      } else {
        message.error(res?.message || "Failed to deactivate");
      }
    } catch (err) {
      message.error(err?.message || "Failed to deactivate");
    }
  };

  // ── Balance colour helper ──────────────────────────────────
  const balanceColor = (balance) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-gray-500";
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);

  // ── Total across all methods ───────────────────────────────
  const totalBalance = methods.reduce((sum, m) => sum + m.currentBalance, 0);

  return (
    <div className="p-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <BankOutlined style={{ color: "#E8FC0A", fontSize: 20 }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark m-0">Banks & Cash</h2>
            <p className="text-muted text-sm m-0">
              Manage payment methods and track balances
            </p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ backgroundColor: "#01134C", borderColor: "#01134C" }}
        >
          Add Bank
        </Button>
      </div>

      {/* ── Total Balance Banner ──────────────────────────── */}
      <div
        className="rounded-xl px-6 py-4 mb-6 flex items-center justify-between"
        style={{ backgroundColor: "#01134C" }}
      >
        <div>
          <p className="text-sm m-0" style={{ color: "#E8FC0A" }}>
            Total Balance (All Accounts)
          </p>
          <p
            className={`text-2xl font-bold m-0 ${
              totalBalance >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <WalletOutlined
          style={{ fontSize: 40, color: "#E8FC0A", opacity: 0.7 }}
        />
      </div>

      {/* ── Cards ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <ScaleLoader color="#01134C" />
        </div>
      ) : methods.length === 0 ? (
        <div className="bg-white rounded-xl shadow-soft p-10">
          <Empty description="No payment methods found" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {methods.map((method) => (
            <div
              key={method._id}
              className="bg-white rounded-xl shadow-soft border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {method.type === "cash" ? (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#E8FC0A" }}
                    >
                      <WalletOutlined
                        style={{ color: "#01134C", fontSize: 18 }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#01134C" }}
                    >
                      <BankOutlined
                        style={{ color: "#E8FC0A", fontSize: 18 }}
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-dark text-sm m-0 leading-tight">
                      {method.name}
                    </p>
                    {method.type === "cash" ? (
                      <Tag color="gold" style={{ fontSize: 10, marginTop: 2 }}>
                        Cash
                      </Tag>
                    ) : (
                      <Tag color="blue" style={{ fontSize: 10, marginTop: 2 }}>
                        Bank
                      </Tag>
                    )}
                  </div>
                </div>
                {/* Action buttons — only on bank */}
                {!method.isDefault && (
                  <div className="flex gap-1">
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(method)}
                        style={{ borderColor: "#01134C", color: "#01134C" }}
                      />
                    </Tooltip>
                    <Tooltip title="Deactivate">
                      <Popconfirm
                        title="Deactivate this bank?"
                        description="This will hide it from all transaction forms."
                        onConfirm={() => handleDelete(method._id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Tooltip>
                  </div>
                )}
                {method.isDefault && (
                  <Tag color="green" style={{ fontSize: 10 }}>
                    Default
                  </Tag>
                )}
              </div>

              {/* Balance */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-muted m-0">Current Balance</p>
                <p
                  className={`text-lg font-bold m-0 ${balanceColor(
                    method.currentBalance,
                  )}`}
                >
                  {formatCurrency(method.currentBalance)}
                </p>
              </div>

              {/* Bank Details */}
              {method.type === "bank" && (
                <div className="text-xs text-muted space-y-0.5">
                  {method.bankDetails?.bankName && (
                    <p className="m-0">
                      🏦{" "}
                      <span className="text-dark font-medium">
                        {method.bankDetails.bankName}
                      </span>
                    </p>
                  )}
                  {method.bankDetails?.accountNumber && (
                    <p className="m-0">
                      A/C:{" "}
                      <span className="font-mono text-dark">
                        {method.bankDetails.accountNumber}
                      </span>
                    </p>
                  )}
                  {method.bankDetails?.accountTitle && (
                    <p className="m-0">
                      Title:{" "}
                      <span className="text-dark">
                        {method.bankDetails.accountTitle}
                      </span>
                    </p>
                  )}
                  {method.bankDetails?.branchCode && (
                    <p className="m-0">
                      Branch: {method.bankDetails.branchCode}
                    </p>
                  )}
                </div>
              )}

              {/* Opening balance note */}
              <p className="text-xs text-muted m-0 border-t border-gray-100 pt-2">
                Opening Balance:{" "}
                <span className="font-medium text-dark">
                  {formatCurrency(method.openingBalance)}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ color: "#01134C" }}>
            <BankOutlined />
            <span>{editingMethod ? "Edit Bank" : "Add Bank Account"}</span>
          </div>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editingMethod ? "Update" : "Create"}
        confirmLoading={submitLoading}
        okButtonProps={{
          style: { backgroundColor: "#01134C", borderColor: "#01134C" },
        }}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Account Name"
            name="name"
            rules={[{ required: true, message: "Please enter account name" }]}
          >
            <Input placeholder="e.g. HBL Main Account, MCB Petty Cash" />
          </Form.Item>

          {!editingMethod && (
            <Form.Item label="Opening Balance (PKR)" name="openingBalance">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                placeholder="0"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v.replace(/,/g, "")}
              />
            </Form.Item>
          )}

          <div
            className="rounded-lg p-4 mb-2"
            style={{ backgroundColor: "#f8f9ff", border: "1px solid #e8ecff" }}
          >
            <p
              className="text-xs font-semibold mb-3 m-0"
              style={{ color: "#01134C" }}
            >
              BANK DETAILS (Optional)
            </p>
            <Form.Item label="Bank Name" name="bankName" className="mb-3">
              <Input placeholder="e.g. HBL, MCB, Allied Bank" />
            </Form.Item>
            <Form.Item
              label="Account Title"
              name="accountTitle"
              className="mb-3"
            >
              <Input placeholder="Account holder name" />
            </Form.Item>
            <Form.Item
              label="Account Number"
              name="accountNumber"
              className="mb-3"
            >
              <Input placeholder="Bank account number" />
            </Form.Item>
            <Form.Item label="Branch Code" name="branchCode" className="mb-0">
              <Input placeholder="Branch code" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Banks;
