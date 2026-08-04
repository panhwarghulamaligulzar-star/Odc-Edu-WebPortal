import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getPaymentReceipt,
  getStudentFeeStructures,
  getStudentPaymentHistory,
} from "../../../services/feeService";
import FeePaymentFormEnhanced from "../../../components/forms/FeePaymentFormEnhanced";
import PaymentReceipt from "../../../components/forms/PaymentReceipt";
import academyConfig from "../../../config/academyConfig";
import { buildStudentInstallmentRows } from "./receiptHistoryUtils";

const { Text } = Typography;

const formatCurrency = (value) =>
  `Rs ${Math.round(value || 0).toLocaleString("en-PK")}`;

const themeButtonStyle = {
  background: "var(--primary-color, #142d78)",
  borderColor: "var(--primary-color, #142d78)",
  color: "#ffffff",
};

const themeOutlineButtonStyle = {
  borderColor: "var(--primary-color, #142d78)",
  color: "var(--primary-color, #142d78)",
};

const statusConfig = {
  Paid: { color: "green", text: "#0f766e", bg: "#dff5ea" },
  Partial: { color: "blue", text: "#1d4ed8", bg: "#e8f1ff" },
  Pending: { color: "orange", text: "#92400e", bg: "#f9eddc" },
};

export default function ReceiptStudentHistory() {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialContext = location.state?.studentRow || null;

  const [loading, setLoading] = useState(false);
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [historyStatusTab, setHistoryStatusTab] = useState("all");
  const [historyCourseFilter, setHistoryCourseFilter] = useState("all");
  const [selectedHistoryInstallments, setSelectedHistoryInstallments] = useState([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(initialContext?.student || null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState(null);

  const loadHistory = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      const [feeStructuresRes, paymentRes] = await Promise.all([
        getStudentFeeStructures(studentId),
        getStudentPaymentHistory(studentId),
      ]);

      if (feeStructuresRes?.success && paymentRes?.success) {
        const nextFeeStructures = feeStructuresRes.data || [];
        const nextPayments = paymentRes.data?.payments || [];
        setFeeStructures(nextFeeStructures);
        setPayments(nextPayments);
        setSelectedStudent((prev) => prev || nextFeeStructures[0]?.student || initialContext?.student || null);
        setSelectedHistoryInstallments([]);
      } else {
        message.error("Failed to load student installment history");
      }
    } catch (error) {
      message.error(error.message || "Failed to load student installment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [studentId]);

  const historyRows = useMemo(
    () => buildStudentInstallmentRows(feeStructures, payments),
    [feeStructures, payments],
  );

  const historyCourseOptions = useMemo(
    () =>
      Array.from(
        new Map(
          feeStructures.map((item) => [
            String(item?.course?._id || item?.course || ""),
            {
              label: item?.course?.courseName || "Course",
              value: String(item?.course?._id || item?.course || ""),
            },
          ]),
        ).values(),
      ),
    [feeStructures],
  );

  const courseScopedRows = useMemo(() => {
    if (historyCourseFilter === "all") return historyRows;
    return historyRows.filter(
      (item) => String(item.courseId || "") === String(historyCourseFilter),
    );
  }, [historyRows, historyCourseFilter]);

  const filteredHistoryRows = useMemo(() => {
    if (historyStatusTab === "all") return courseScopedRows;
    return courseScopedRows.filter((item) => item.status === historyStatusTab);
  }, [courseScopedRows, historyStatusTab]);

  const filteredSummary = useMemo(
    () =>
      filteredHistoryRows.reduce(
        (acc, row) => {
          acc.amount += Number(row.amount || 0);
          acc.paid += Number(row.paidAmount || 0);
          acc.remaining += Number(row.remainingAmount || 0);
          if (row.status === "Paid") acc.paidCount += 1;
          if (row.status === "Partial") acc.partialCount += 1;
          if (row.status === "Pending") acc.pendingCount += 1;
          return acc;
        },
        {
          amount: 0,
          paid: 0,
          remaining: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
        },
      ),
    [filteredHistoryRows],
  );

  const selectedHistoryInstallmentRows = filteredHistoryRows.filter((item) =>
    selectedHistoryInstallments.includes(item._id),
  );

  const canPaySelectedInstallments =
    selectedHistoryInstallmentRows.length > 0 &&
    selectedHistoryInstallmentRows.every(
      (item) =>
        item.status !== "Paid" &&
        item.installmentNumber &&
        Number(item.remainingAmount || 0) > 0,
    );

  const selectedHistoryFeeStructure = canPaySelectedInstallments
    ? feeStructures.find(
        (item) =>
          String(item?._id || "") ===
          String(selectedHistoryInstallmentRows[0]?.feeStructureId || ""),
      ) || null
    : null;

  const historyRowSelection = {
    selectedRowKeys: selectedHistoryInstallments,
    onChange: (_, selectedRows) => {
      const payableRows = selectedRows.filter(
        (row) =>
          row.status !== "Paid" &&
          row.installmentNumber &&
          Number(row.remainingAmount || 0) > 0,
      );
      setSelectedHistoryInstallments(payableRows.map((row) => row._id));

      if (payableRows.length !== selectedRows.length) {
        message.info("Only pending installments can be selected for payment.");
      }
    },
    getCheckboxProps: (record) => ({
      disabled:
        record.status === "Paid" ||
        !record.installmentNumber ||
        Number(record.remainingAmount || 0) <= 0,
    }),
  };

  const openPayment = (row) => {
    setSelectedFeeStructure(
      feeStructures.find(
        (item) => String(item?._id || "") === String(row.feeStructureId || ""),
      ) || null,
    );
    setSelectedInstallment(row.selectedInstallment || null);
    setPaymentOpen(true);
  };

  const openReceipt = async (paymentId, contextRow = null) => {
    if (!paymentId) {
      message.info("No receipt available for this row yet");
      return;
    }

    setActiveReceiptId(paymentId);
    setReceiptLoading(true);
    try {
      const response = await getPaymentReceipt(paymentId);
      if (response?.success) {
        setReceiptData({
          ...response.data,
          feeStructure: contextRow
            ? {
                totalFee: contextRow.amount,
                paidAmount: contextRow.paidAmount,
                remainingAmount: contextRow.remainingAmount,
                feeStatus: contextRow.status,
              }
            : response.data?.feeStructure || null,
        });
        setReceiptOpen(true);
      } else {
        message.error(response?.message || "Failed to load receipt");
      }
    } catch (error) {
      message.error(error.message || "Failed to load receipt");
    } finally {
      setReceiptLoading(false);
      setActiveReceiptId(null);
    }
  };

  const historyColumns = [
    {
      title: "Course",
      dataIndex: "courseName",
      key: "courseName",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-[#111827]">{record.courseName}</div>
          <div className="text-xs text-gray-500">
            {record.installmentNumber
              ? `Inst #${record.installmentNumber}`
              : "Full payment row"}
          </div>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY") : <Text type="secondary">-</Text>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "right",
      render: (value) => (
        <span className="font-semibold text-emerald-700">{formatCurrency(value)}</span>
      ),
    },
    {
      title: "Remaining",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      align: "right",
      render: (value) => (
        <span className="font-semibold text-amber-700">{formatCurrency(value)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color={statusConfig[value]?.color}>{value}</Tag>,
    },
    {
      title: "Receipt",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (value) =>
        value ? <span className="font-mono text-xs">{value}</span> : <Text type="secondary">-</Text>,
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            disabled={record.status === "Paid" || Number(record.remainingAmount || 0) <= 0}
            style={themeButtonStyle}
            onClick={() => openPayment(record)}
          >
            {record.status === "Paid" ? "Paid" : "Pay"}
          </Button>
          <Button
            size="small"
            style={themeOutlineButtonStyle}
            onClick={() => openReceipt(record.paymentId, record)}
            disabled={!record.paymentId}
          >
            View Receipt
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div
        className="rounded-[28px] border p-5 md:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(248,251,255,0.98) 0%, rgba(240,247,255,0.96) 55%, rgba(250,253,255,0.98) 100%)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          borderColor: "#d8e1f0",
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/dashboard/accounting/receipt")}
              style={themeOutlineButtonStyle}
              className="!mb-4 !rounded-xl"
            >
              Back To Receipts
            </Button>
            <h2 className="module-title !mb-1">
              {selectedStudent?.studentName || "Student"} Installment History
            </h2>
            <p className="module-subtitle !mb-0">
              View all assigned-course installments, filter by status or course, and record payments in your existing receipt flow.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {selectedStudent?.registrationNo || selectedStudent?._id || "Student"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: "0 14px 28px rgba(15,23,42,0.06)" }}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Filtered Amount</div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--primary-color, #142d78)" }}>
            {formatCurrency(filteredSummary.amount)}
          </div>
        </Card>
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: "0 14px 28px rgba(15,23,42,0.06)" }}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Filtered Paid</div>
          <div className="mt-3 text-2xl font-semibold text-emerald-700">
            {formatCurrency(filteredSummary.paid)}
          </div>
        </Card>
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: "0 14px 28px rgba(15,23,42,0.06)" }}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Filtered Remaining</div>
          <div className="mt-3 text-2xl font-semibold text-amber-700">
            {formatCurrency(filteredSummary.remaining)}
          </div>
        </Card>
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: "0 14px 28px rgba(15,23,42,0.06)" }}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Pending Count</div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "#92400e" }}>
            {filteredSummary.pendingCount}
          </div>
        </Card>
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: "0 14px 28px rgba(15,23,42,0.06)" }}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Paid / Partial</div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--primary-color, #142d78)" }}>
            {filteredSummary.paidCount} / {filteredSummary.partialCount}
          </div>
        </Card>
      </div>

      <Card
        bordered={false}
        bodyStyle={{ padding: 24 }}
        style={{
          borderRadius: 24,
          background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
          boxShadow: "0 18px 44px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e8eef6",
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Select
              value={historyCourseFilter}
              onChange={(value) => {
                setHistoryCourseFilter(value);
                setSelectedHistoryInstallments([]);
              }}
              style={{ minWidth: 260 }}
              options={[
                { label: "All assigned courses", value: "all" },
                ...historyCourseOptions,
              ]}
            />
            <Button
              type="primary"
              disabled={!canPaySelectedInstallments}
              style={themeButtonStyle}
              onClick={() => {
                if (!selectedStudent) return;
                setSelectedFeeStructure(selectedHistoryFeeStructure);
                setSelectedInstallment(null);
                setPaymentOpen(true);
              }}
            >
              Pay Selected Installments
            </Button>
          </Space>
          <div className="text-sm text-slate-500">
            {selectedHistoryInstallments.length} selected installment(s)
          </div>
        </div>

        <Tabs
          activeKey={historyStatusTab}
          onChange={(value) => {
            setHistoryStatusTab(value);
            setSelectedHistoryInstallments([]);
          }}
          items={[
            { key: "all", label: `All (${courseScopedRows.length})` },
            {
              key: "Pending",
              label: `Pending (${courseScopedRows.filter((item) => item.status === "Pending").length})`,
            },
            {
              key: "Partial",
              label: `Partial (${courseScopedRows.filter((item) => item.status === "Partial").length})`,
            },
            {
              key: "Paid",
              label: `Paid (${courseScopedRows.filter((item) => item.status === "Paid").length})`,
            },
          ]}
        />

        <Table
          rowKey="_id"
          rowSelection={historyRowSelection}
          columns={historyColumns}
          dataSource={filteredHistoryRows}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No installment history available" /> }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <PaymentReceipt
        visible={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptData(null);
        }}
        paymentData={receiptData}
        institutionInfo={{
          name: academyConfig.name,
          address: academyConfig.address,
          phone: academyConfig.phone,
          email: academyConfig.email,
        }}
      />

      <FeePaymentFormEnhanced
        visible={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setSelectedFeeStructure(null);
          setSelectedInstallment(null);
          setSelectedHistoryInstallments([]);
        }}
        onPaymentSuccess={() => {
          setPaymentOpen(false);
          setSelectedFeeStructure(null);
          setSelectedInstallment(null);
          setSelectedHistoryInstallments([]);
          loadHistory();
        }}
        feeStructure={selectedFeeStructure}
        studentInfo={selectedStudent}
        selectedInstallment={selectedInstallment}
        initialSelectedInstallments={selectedHistoryInstallmentRows.map(
          (item) => item.installmentNumber,
        )}
        initialSelectedPaymentRows={selectedHistoryInstallmentRows.map((item) => ({
          rowId: item._id,
          studentId,
          courseId: item.courseId,
          courseName: item.courseName,
          feeStructureId: item.feeStructureId,
          description: item.description,
          installmentNumber: item.installmentNumber,
          amount: Number(item.amount || 0),
          paidAmount: Number(item.paidAmount || 0),
          remainingAmount: Number(item.remainingAmount || 0),
          dueDate: item.dueDate,
          status: item.status,
        }))}
      />
    </div>
  );
}
