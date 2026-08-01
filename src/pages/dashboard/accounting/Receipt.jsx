import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  WalletOutlined,
  DownOutlined,
  FilePdfOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { MdReceiptLong } from "react-icons/md";
import { getReceiptDuesOverview, exportReceiptDues } from "../../../services/accountingService";
import academyConfig from "../../../config/academyConfig";
import {
  getCourses,
  getPaymentReceipt,
  getStudentPaymentHistory,
} from "../../../services/feeService";
import PaymentReceipt from "../../../components/forms/PaymentReceipt";
import FeePaymentFormEnhanced from "../../../components/forms/FeePaymentFormEnhanced";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const formatCurrency = (value) =>
  `Rs ${Math.round(value || 0).toLocaleString("en-PK")}`;

const statusConfig = {
  Paid: {
    color: "green",
    bg: "#dff5ea",
    text: "#0f766e",
    border: "#95d5b2",
  },
  Partial: {
    color: "blue",
    bg: "#e8f1ff",
    text: "#1d4ed8",
    border: "#93c5fd",
  },
  Pending: {
    color: "orange",
    bg: "#f9eddc",
    text: "#92400e",
    border: "#e7c58a",
  },
};

const summaryCardStyle = (background, border, color) => ({
  background,
  border: `1px solid ${border}`,
  borderRadius: 22,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
});

const heroSummaryCards = [
  {
    key: "total",
    title: "Total Dues",
    field: "totalDues",
    accent: "#142d78",
    border: "#bfd0ff",
    background: "linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)",
    note: "Overall billed amount across due entries",
    icon: <DollarCircleOutlined />,
  },
  {
    key: "collected",
    title: "Collected",
    field: "collected",
    accent: "#0f766e",
    border: "#9fdfcc",
    background: "linear-gradient(135deg, #effcf8 0%, #d8f4ec 100%)",
    note: "Payments already received from students",
    icon: <CheckCircleOutlined />,
  },
  {
    key: "remaining",
    title: "Remaining",
    field: "remaining",
    accent: "#b45309",
    border: "#f0c38d",
    background: "linear-gradient(135deg, #fff9ef 0%, #f9ead2 100%)",
    note: "Outstanding amount still pending",
    icon: <ClockCircleOutlined />,
  },
];

const entryCards = [
  {
    key: "paid",
    title: "Paid Entries",
    field: "paidCount",
    accent: "#0f766e",
    background: "linear-gradient(135deg, #ffffff 0%, #f0fdf8 100%)",
    icon: <WalletOutlined />,
    note: "Fully settled fee entries",
  },
  {
    key: "partial",
    title: "Partial Entries",
    field: "partialCount",
    accent: "#1d4ed8",
    background: "linear-gradient(135deg, #ffffff 0%, #eef4ff 100%)",
    icon: <BarChartOutlined />,
    note: "Partially paid installments or dues",
  },
  {
    key: "pending",
    title: "Pending Entries",
    field: "pendingCount",
    accent: "#b45309",
    background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
    icon: <ClockCircleOutlined />,
    note: "Entries with no complete payment yet",
  },
];

export default function Receipt() {
  const dueDatePresets = {
    this_month: [dayjs().startOf("month"), dayjs().endOf("month")],
    last_month: [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ],
    last_90_days: [dayjs().subtract(89, "day").startOf("day"), dayjs().endOf("day")],
    last_6_months: [
      dayjs().subtract(6, "month").startOf("day"),
      dayjs().endOf("day"),
    ],
    this_year: [dayjs().startOf("year"), dayjs().endOf("year")],
    last_year: [
      dayjs().subtract(1, "year").startOf("year"),
      dayjs().subtract(1, "year").endOf("year"),
    ],
  };

  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalDues: 0,
    collected: 0,
    remaining: 0,
    studentCount: 0,
    paidCount: 0,
    partialCount: 0,
    pendingCount: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    courseId: undefined,
    dueDateFrom: undefined,
    dueDateTo: undefined,
    sortOrder: "asc",
  });
  const [quickRange, setQuickRange] = useState(undefined);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyContext, setHistoryContext] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchReceiptOverview();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      if (response?.success) {
        setCourses(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load courses:", error);
    }
  };

  const fetchReceiptOverview = async () => {
    setLoading(true);
    try {
      const response = await getReceiptDuesOverview({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      });

      if (response?.success) {
        setRows(response.data || []);
        setSummary(response.summary || {});
        setPagination((prev) => ({
          ...prev,
          total: response.pagination?.total || 0,
        }));
      }
    } catch (error) {
      message.error(error.message || "Failed to load receipt data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (exportType = "all") => {
    setExportLoading(true);
    try {
      const blob = await exportReceiptDues({
        ...filters,
        exportType,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `receipt-dues-${exportType}-${new Date().toISOString().split("T")[0]}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("Report exported successfully!");
    } catch (error) {
      message.error(error.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleDueDateChange = (dates) => {
    setQuickRange(undefined);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({
      ...prev,
      dueDateFrom: dates?.[0] ? dates[0].startOf("day").toISOString() : undefined,
      dueDateTo: dates?.[1] ? dates[1].endOf("day").toISOString() : undefined,
    }));
  };

  const handleQuickRangeChange = (value) => {
    setQuickRange(value);
    if (!value) {
      handleDueDateChange(null);
      return;
    }

    const selectedRange = dueDatePresets[value];
    handleDueDateChange(selectedRange);
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
                totalFee: contextRow.totalFee,
                paidAmount: contextRow.paidAmount,
                remainingAmount: contextRow.remainingAmount,
                feeStatus: contextRow.dueStatus,
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

  const openHistory = async (row) => {
    setHistoryLoading(true);
    try {
      const response = await getStudentPaymentHistory(
        row.student?._id,
        row.course?._id,
      );
      if (response?.success) {
        setHistoryContext(row);
        setHistoryRows(response.data?.payments || []);
        setHistoryOpen(true);
      } else {
        message.error(response?.message || "Failed to load payment history");
      }
    } catch (error) {
      message.error(error.message || "Failed to load payment history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPayment = (row) => {
    setSelectedFeeStructure({
      _id: row.feeStructureId,
      student: row.student,
      course: row.course,
      totalFee: row.totalFee,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      feeStatus: row.dueStatus,
      installments: row.installments || [],
    });
    setSelectedStudent(row.student);
    setSelectedInstallment(row.selectedInstallment || null);
    setPaymentOpen(true);
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 70,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Description",
      key: "description",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-[#111827]">
            {record.description || "N/A"}
          </div>
          <div className="text-xs text-gray-500">
            {record.student?.studentName || "N/A"} |{" "}
            {record.student?.registrationNo || "No reg no"} |{" "}
            {record.course?.courseName || "No course"}
          </div>
        </div>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (value, record) => (
        <div>
          <div className="font-medium">
            {value ? dayjs(value).format("DD MMM YYYY") : "No due date"}
          </div>
          <div className="text-xs text-gray-500">
            {record.nextInstallment
              ? `Inst #${record.nextInstallment.installmentNumber}`
              : record.installmentNumber
                ? `Inst #${record.installmentNumber}`
                : record.dueStatus === "Paid"
                ? "Cleared"
                : "Single fee"}
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => <span>{formatCurrency(value)}</span>,
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "right",
      render: (value) => (
        <span className="font-semibold text-emerald-700">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: "Remaining",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      align: "right",
      render: (value) => (
        <span className="font-semibold text-amber-700">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "dueStatus",
      key: "dueStatus",
      render: (status) => <Tag color={statusConfig[status]?.color}>{status}</Tag>,
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      render: (value) =>
        value ? (
          <span className="font-mono text-xs font-semibold">{value}</span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => openPayment(record)}
            disabled={record.dueStatus === "Paid"}
          >
            Pay
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => openReceipt(record.paymentId, record)}
            loading={receiptLoading && activeReceiptId === record.paymentId}
          >
            View Receipt
          </Button>
          <Button onClick={() => openHistory(record)}>History</Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: "Receipt",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (value) => new Date(value).toLocaleDateString("en-GB"),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Type",
      dataIndex: "paymentType",
      key: "paymentType",
      render: (value) => <Tag color="cyan">{value}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => openReceipt(record._id, historyContext)}
        >
          Open Receipt
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div
        className="mb-6 rounded-[28px] border border-[#d8e1f0] p-5 md:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(248,251,255,0.98) 0%, rgba(240,247,255,0.96) 55%, rgba(250,253,255,0.98) 100%)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #142d78 100%)",
              }}
            >
              <MdReceiptLong size={28} color="#ffffff" />
            </div>
            <div>
              <h2 className="module-title !mb-1">Receipts</h2>
              <p className="module-subtitle !mb-0 max-w-[640px]">
                Track student dues, collections, and remaining balances with a clearer financial snapshot.
              </p>
            </div>
          </div>
          <Space size="middle" wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchReceiptOverview}
              className="!h-11 !rounded-xl !border-slate-200 !bg-white !px-5 !font-medium"
            >
              Refresh
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "all",
                    label: "Export All Dues",
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExport("all"),
                  },
                  {
                    key: "paid",
                    label: "Export Paid Only",
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExport("paid"),
                  },
                  {
                    key: "partial",
                    label: "Export Partial Only",
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExport("partial"),
                  },
                  {
                    key: "pending",
                    label: "Export Pending Only",
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExport("pending"),
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Button
                type="primary"
                loading={exportLoading}
                className="!h-11 !rounded-xl !border-0 !px-5 !font-medium"
                style={{
                  background: "linear-gradient(135deg, #1677ff 0%, #1447b2 100%)",
                  boxShadow: "0 12px 28px rgba(20, 71, 178, 0.28)",
                }}
              >
                Export PDF <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: "#cfe0ff", background: "#ffffff", color: "#334155" }}
          >
            <BarChartOutlined style={{ color: "#142d78" }} />
            <span>{formatCurrency(summary.totalDues)} in tracked dues</span>
          </div>
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: "#b7e4d7", background: "#ffffff", color: "#334155" }}
            >
              <CheckCircleOutlined style={{ color: "#0f766e" }} />
              <span>{summary.studentCount || pagination.total || 0} active due entries</span>
            </div>
          </div>
        </div>
      </div>

      <Row gutter={[18, 18]} className="mb-6">
        {heroSummaryCards.map((card) => (
          <Col xs={24} md={8} key={card.key}>
            <Card
              bordered={false}
              style={summaryCardStyle(card.background, card.border, card.accent)}
              bodyStyle={{ padding: 0 }}
            >
              <div className="p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {card.title}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{card.note}</div>
                  </div>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                    style={{
                      color: card.accent,
                      background: "rgba(255,255,255,0.72)",
                      border: `1px solid ${card.border}`,
                    }}
                  >
                    {card.icon}
                  </div>
                </div>
                <div
                  className="text-[28px] font-semibold leading-none md:text-[34px]"
                  style={{ color: card.accent }}
                >
                  {formatCurrency(summary[card.field])}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[18, 18]} className="mb-5">
        {entryCards.map((card) => (
          <Col xs={24} md={8} key={card.key}>
            <Card
              bordered={false}
              style={{
                background: card.background,
                borderRadius: 22,
                border: "1px solid #edf1f7",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
              }}
              bodyStyle={{ padding: 24 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">{card.title}</div>
                  <div
                    className="mt-3 text-[34px] font-semibold leading-none"
                    style={{ color: card.accent }}
                  >
                    {summary[card.field] || 0}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">{card.note}</div>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                  style={{
                    background: "#ffffff",
                    color: card.accent,
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        className="mb-4"
        bordered={false}
        bodyStyle={{ padding: 24 }}
        style={{
          borderRadius: 24,
          background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
          boxShadow: "0 18px 44px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e8eef6",
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <FilterOutlined style={{ color: "#142d78" }} />
              Filter Receipts
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Narrow the dues list by student, course, status, or due-date range.
            </div>
          </div>
          <Button
            className="!h-10 !rounded-xl !border-slate-200 !px-4"
            onClick={() => {
              setPagination((prev) => ({ ...prev, current: 1 }));
              setFilters({
                search: "",
                status: "all",
                courseId: undefined,
                dueDateFrom: undefined,
                dueDateTo: undefined,
                sortOrder: "asc",
              });
              setQuickRange(undefined);
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Input
            allowClear
            placeholder="Search student, reg no, course or receipt"
            prefix={<SearchOutlined />}
            className="!h-11 !rounded-xl"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          <Select
            allowClear
            placeholder="All courses"
            className="!h-11"
            value={filters.courseId}
            onChange={(value) => handleFilterChange("courseId", value)}
            options={courses.map((course) => ({
              label: course.courseName,
              value: course._id,
            }))}
          />
          <Select
            placeholder="All statuses"
            className="!h-11"
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={[
              { label: "All", value: "all" },
              { label: "Paid", value: "Paid" },
              { label: "Partial", value: "Partial" },
              { label: "Pending", value: "Pending" },
              { label: "Unpaid", value: "Unpaid" },
            ]}
          />
          <RangePicker
            className="!h-11 !rounded-xl"
            format="DD-MM-YYYY"
            onChange={handleDueDateChange}
            value={[
              filters.dueDateFrom ? dayjs(filters.dueDateFrom) : null,
              filters.dueDateTo ? dayjs(filters.dueDateTo) : null,
            ]}
          />
          <Select
            allowClear
            placeholder="Quick date range"
            className="!h-11"
            value={quickRange}
            onChange={handleQuickRangeChange}
            options={[
              { label: "This Month", value: "this_month" },
              { label: "Last Month", value: "last_month" },
              { label: "Last 90 Days", value: "last_90_days" },
              { label: "Last 6 Months", value: "last_6_months" },
              { label: "This Year", value: "this_year" },
              { label: "Last Year", value: "last_year" },
            ]}
          />
          <Select
            className="!h-11"
            value={filters.sortOrder}
            onChange={(value) => handleFilterChange("sortOrder", value)}
            options={[
              { label: "Due Date Asc", value: "asc" },
              { label: "Due Date Desc", value: "desc" },
            ]}
          />
        </div>
      </Card>

      <Card
        title="Student Dues Detail"
        extra={
          <Text type="secondary">
            {summary.studentCount || pagination.total} due entries
          </Text>
        }
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(nextPagination) =>
            setPagination((prev) => ({
              ...prev,
              current: nextPagination.current,
              pageSize: nextPagination.pageSize,
            }))
          }
          locale={{
            emptyText: (
              <Empty description="No student dues found for the selected filters" />
            ),
          }}
          scroll={{ x: 1200 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <span className="font-semibold">
                  Total ({summary.studentCount || 0} due entries)
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <span className="font-semibold">
                  {formatCurrency(summary.totalDues)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(summary.collected)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <span className="font-semibold text-amber-700">
                  {formatCurrency(summary.remaining)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
              <Table.Summary.Cell index={7} />
              <Table.Summary.Cell index={8} />
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Row gutter={[0, 0]} className="mt-6 border border-[#d6d3d1]">
        {["Paid", "Partial", "Pending"].map((item) => (
          <Col xs={24} md={8} key={item}>
            <div
              className="px-6 py-4 text-center"
              style={{
                background: statusConfig[item].bg,
                borderRight: item !== "Pending" ? "1px solid #d6d3d1" : "none",
              }}
            >
              <span
                className="font-semibold"
                style={{ color: statusConfig[item].text }}
              >
                {item}
              </span>
              <span className="text-gray-700">
                {" "}
                {item === "Paid" && "Fee fully cleared"}
                {item === "Partial" && "Half or partial payment done"}
                {item === "Pending" && "No payment yet"}
              </span>
            </div>
          </Col>
        ))}
      </Row>

      <Modal
        open={historyOpen}
        onCancel={() => {
          setHistoryOpen(false);
          setHistoryRows([]);
          setHistoryContext(null);
        }}
        footer={null}
        width={920}
        title={
          historyContext
            ? `${historyContext.student?.studentName} - ${historyContext.course?.courseName} payment history`
            : "Payment history"
        }
      >
        <Table
          rowKey="_id"
          columns={historyColumns}
          dataSource={historyRows}
          loading={historyLoading}
          pagination={{ pageSize: 6 }}
          locale={{
            emptyText: <Empty description="No payment history available" />,
          }}
        />
      </Modal>

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
          setSelectedStudent(null);
          setSelectedInstallment(null);
        }}
        onPaymentSuccess={() => {
          setPaymentOpen(false);
          setSelectedFeeStructure(null);
          setSelectedStudent(null);
          setSelectedInstallment(null);
          fetchReceiptOverview();
        }}
        feeStructure={selectedFeeStructure}
        studentInfo={selectedStudent}
        selectedInstallment={selectedInstallment}
      />
    </div>
  );
}
