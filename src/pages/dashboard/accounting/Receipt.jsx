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
  borderRadius: 0,
});

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
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#0f766e" }}
          >
            <MdReceiptLong size={22} color="#ffffff" />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0 text-[#0f172a]">Receipts</h2>
            <p className="m-0 text-sm text-gray-500">
              Track student dues, collections, and remaining balances
            </p>
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchReceiptOverview}>
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
          <Button type="primary" loading={exportLoading}>
            Export PDF <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      <Row gutter={[0, 0]} className="mb-6 overflow-hidden border border-[#b08968]">
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={summaryCardStyle("#f4f4f5", "#d4d4d8", "#18181b")}
            bodyStyle={{ padding: 24, textAlign: "center" }}
          >
            <Statistic
              title="Total Dues"
              value={summary.totalDues}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#18181b", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={summaryCardStyle("#dcefe9", "#7dc4ad", "#0f766e")}
            bodyStyle={{ padding: 24, textAlign: "center" }}
          >
            <Statistic
              title="Collected"
              value={summary.collected}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#0f766e", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={summaryCardStyle("#f6ebdb", "#d8b88a", "#92400e")}
            bodyStyle={{ padding: 24, textAlign: "center" }}
          >
            <Statistic
              title="Remaining"
              value={summary.remaining}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#92400e", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-5">
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Paid Entries"
              value={summary.paidCount}
              prefix={<WalletOutlined />}
              valueStyle={{ color: "#0f766e" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Partial Entries"
              value={summary.partialCount}
              valueStyle={{ color: "#1d4ed8" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Pending Entries"
              value={summary.pendingCount}
              valueStyle={{ color: "#92400e" }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Space wrap size="middle">
          <Input
            allowClear
            placeholder="Search student, reg no, course or receipt"
            prefix={<SearchOutlined />}
            style={{ width: 320 }}
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          <Select
            allowClear
            placeholder="All courses"
            style={{ width: 220 }}
            value={filters.courseId}
            onChange={(value) => handleFilterChange("courseId", value)}
            options={courses.map((course) => ({
              label: course.courseName,
              value: course._id,
            }))}
          />
          <Select
            placeholder="All statuses"
            style={{ width: 180 }}
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
            style={{ width: 190 }}
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
            style={{ width: 180 }}
            value={filters.sortOrder}
            onChange={(value) => handleFilterChange("sortOrder", value)}
            options={[
              { label: "Due Date Asc", value: "asc" },
              { label: "Due Date Desc", value: "desc" },
            ]}
          />
          <Button
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
            Clear
          </Button>
        </Space>
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
