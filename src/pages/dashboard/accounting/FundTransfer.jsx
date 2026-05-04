import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Select,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SwapOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { ScaleLoader } from "react-spinners";
import dayjs from "dayjs";
import {
  getPaymentMethods,
  getFundTransfers,
  createFundTransfer,
  deleteFundTransfer,
} from "../../../services/accountingService";

const { Option } = Select;
const { TextArea } = Input;

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(v || 0);

const FundTransfer = () => {
  // ── State ──────────────────────────────────────────────────
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [totalTransferred, setTotalTransferred] = useState(0);
  const [methods, setMethods] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Balance warning state derived from form "fromMethod" selection
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [form] = Form.useForm();

  // ── Load payment methods once ──────────────────────────────
  useEffect(() => {
    getPaymentMethods()
      .then((res) => {
        if (res?.success) setMethods(res.data);
      })
      .catch(console.error);
  }, []);

  // ── Fetch transfers ────────────────────────────────────────
  const fetchTransfers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await getFundTransfers({
          page,
          limit: pagination.pageSize,
        });
        if (res?.success) {
          setTransfers(res.data);
          setPagination((p) => ({
            ...p,
            current: page,
            total: res.pagination.total,
          }));
          setTotalTransferred(res.summary?.totalTransferred || 0);
        }
      } catch (err) {
        message.error(err?.message || "Failed to load transfers");
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize],
  );

  useEffect(() => {
    fetchTransfers(1);
  }, []);

  // ── Modal helpers ──────────────────────────────────────────
  const openModal = () => {
    form.resetFields();
    setSelectedFrom(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    form.resetFields();
    setSelectedFrom(null);
  };

  const handleFromChange = (id) => {
    form.setFieldValue("toMethod", undefined);
    const found = methods.find((m) => m._id === id);
    setSelectedFrom(found || null);
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const payload = {
        ...values,
        transferDate: values.transferDate.toISOString(),
      };
      const res = await createFundTransfer(payload);
      if (res?.success) {
        message.success("Transfer completed successfully");
        closeModal();
        fetchTransfers(1);
        // Refresh method balances
        getPaymentMethods().then((r) => {
          if (r?.success) setMethods(r.data);
        });
      } else {
        message.error(res?.message || "Transfer failed");
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
      const res = await deleteFundTransfer(id);
      if (res?.success) {
        message.success("Transfer reversed and deleted");
        fetchTransfers(pagination.current);
        getPaymentMethods().then((r) => {
          if (r?.success) setMethods(r.data);
        });
      } else message.error(res?.message || "Delete failed");
    } catch (err) {
      message.error(err?.message || "Delete failed");
    }
  };

  // ── Table columns ──────────────────────────────────────────
  const columns = [
    {
      title: "Transfer No",
      dataIndex: "transferNo",
      key: "transferNo",
      width: 150,
      render: (v) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: "From Account",
      dataIndex: "fromMethod",
      key: "fromMethod",
      render: (m) => (
        <span className="flex items-center gap-1">
          <BankOutlined className="text-red-400" />
          <span className="font-semibold">{m?.name || "—"}</span>
        </span>
      ),
    },
    {
      title: "To Account",
      dataIndex: "toMethod",
      key: "toMethod",
      render: (m) => (
        <span className="flex items-center gap-1">
          <BankOutlined className="text-green-500" />
          <span className="font-semibold">{m?.name || "—"}</span>
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (a) => (
        <span className="font-bold text-blue-600">{formatCurrency(a)}</span>
      ),
    },
    {
      title: "Date",
      dataIndex: "transferDate",
      key: "transferDate",
      width: 120,
      render: (d) => (
        <span className="text-sm">
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      render: (v) => <span className="text-muted text-xs">{v || "—"}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 70,
      render: (_, record) => (
        <Tooltip title="Reverse & Delete">
          <Popconfirm
            title="Reverse this transfer?"
            description="Amounts will be returned to their original accounts."
            onConfirm={() => handleDelete(record._id)}
            okText="Reverse"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Tooltip>
      ),
    },
  ];

  // Selected from-balance for amount validation
  const fromBalance = selectedFrom?.currentBalance || 0;

  return (
    <div className="p-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <SwapOutlined style={{ color: "#E8FC0A", fontSize: 20 }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark m-0">Fund Transfer</h2>
            <p className="text-muted text-sm m-0">
              Move funds between Cash & Bank accounts
            </p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openModal}
          style={{ backgroundColor: "#01134C", borderColor: "#01134C" }}
        >
          New Transfer
        </Button>
      </div>

      {/* ── Summary card row ──────────────────────────────── */}
      <Row gutter={16} className="mb-5">
        <Col xs={24} sm={8}>
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#01134C" }}
          >
            <Statistic
              title={
                <span
                  style={{ color: "#E8FC0A", fontSize: 12, fontWeight: 600 }}
                >
                  TOTAL TRANSFERRED
                </span>
              }
              value={totalTransferred}
              prefix={<SwapOutlined style={{ color: "#fff" }} />}
              valueStyle={{ color: "#fff", fontWeight: 700 }}
              formatter={(v) => formatCurrency(v)}
            />
          </div>
        </Col>

        {/* Live balances for all accounts */}
        {methods.map((m) => (
          <Col xs={24} sm={8} key={m._id}>
            <div className="bg-white rounded-xl shadow-soft p-5">
              <Statistic
                title={
                  <span className="text-muted text-xs font-semibold">
                    {m.name.toUpperCase()}
                  </span>
                }
                value={m.currentBalance}
                valueStyle={{ color: "#01134C", fontWeight: 700 }}
                formatter={(v) => formatCurrency(v)}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <ScaleLoader color="#01134C" />
          </div>
        ) : (
          <Table
            dataSource={transfers}
            columns={columns}
            rowKey="_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page) => fetchTransfers(page),
              showSizeChanger: false,
            }}
          />
        )}
      </div>

      {/* ── New Transfer Modal ────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ color: "#01134C" }}>
            <SwapOutlined />
            <span>New Fund Transfer</span>
          </div>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText="Transfer"
        confirmLoading={submitLoading}
        okButtonProps={{
          style: { backgroundColor: "#01134C", borderColor: "#01134C" },
        }}
        destroyOnClose
        width={500}
      >
        {selectedFrom && (
          <Alert
            className="mb-4"
            type="info"
            showIcon
            message={
              <span>
                Available in <strong>{selectedFrom.name}</strong>:{" "}
                <strong>{formatCurrency(fromBalance)}</strong>
              </span>
            }
          />
        )}

        <Form form={form} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="From Account"
                name="fromMethod"
                rules={[{ required: true, message: "Select source account" }]}
              >
                <Select placeholder="Source" onChange={handleFromChange}>
                  {methods.map((m) => (
                    <Option key={m._id} value={m._id}>
                      {m.name}{" "}
                      <span className="text-muted text-xs">
                        ({formatCurrency(m.currentBalance)})
                      </span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="To Account"
                name="toMethod"
                rules={[
                  { required: true, message: "Select destination account" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("fromMethod") !== value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Source and destination must differ"),
                      );
                    },
                  }),
                ]}
              >
                <Select placeholder="Destination">
                  {methods
                    .filter((m) => m._id !== form.getFieldValue("fromMethod"))
                    .map((m) => (
                      <Option key={m._id} value={m._id}>
                        {m.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Amount (PKR)"
                name="amount"
                rules={[
                  { required: true, message: "Enter amount" },
                  {
                    validator(_, value) {
                      if (!value || value <= 0)
                        return Promise.reject(new Error("Amount must be > 0"));
                      if (selectedFrom && value > selectedFrom.currentBalance) {
                        return Promise.reject(
                          new Error(
                            `Exceeds balance of ${formatCurrency(selectedFrom.currentBalance)}`,
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  max={fromBalance || undefined}
                  placeholder="0"
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(v) => v.replace(/,/g, "")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Transfer Date"
                name="transferDate"
                initialValue={dayjs()}
                rules={[{ required: true, message: "Select date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Note (optional)" name="note">
            <TextArea
              rows={2}
              placeholder="Reason or reference"
              maxLength={300}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FundTransfer;
