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
  Tabs,
  Typography,
  message,
} from "antd";
import {
  FileExcelOutlined,
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
import * as XLSX from "xlsx";
import { MdReceiptLong } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { getReceiptDuesOverview, exportReceiptDues } from "../../../services/accountingService";
import academyConfig from "../../../config/academyConfig";
import {
  getCourses,
  getPaymentReceipt,
  getStudentEnrollments,
  getStudentPaymentHistory,
  getStudentFeeStructures,
} from "../../../services/feeService";
import PaymentReceipt from "../../../components/forms/PaymentReceipt";
import FeePaymentFormEnhanced from "../../../components/forms/FeePaymentFormEnhanced";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const buildStudentInstallmentRows = (feeStructures = [], payments = []) => {
  const paymentMap = new Map();

  payments.forEach((payment) => {
    const feeStructureId = String(
      payment?.feeStructure?._id || payment?.feeStructure || "",
    );
    const installmentKey = payment?.installmentNumber
      ? `inst:${payment.installmentNumber}`
      : "full";
    const mapKey = `${feeStructureId}:${installmentKey}`;
    const existing = paymentMap.get(mapKey);
    const paymentTime = new Date(
      payment?.paymentDate || payment?.createdAt || 0,
    ).getTime();
    const existingTime = existing
      ? new Date(existing?.paymentDate || existing?.createdAt || 0).getTime()
      : 0;

    if (!existing || paymentTime >= existingTime) {
      paymentMap.set(mapKey, payment);
    }
  });

  return feeStructures.flatMap((feeStructure) => {
    const course = feeStructure?.course || {};
    const courseId = String(course?._id || feeStructure?.course || "");
    const baseRow = {
      feeStructureId: feeStructure?._id,
      courseId,
      courseName: course?.courseName || "Course",
      courseCode: course?.courseId || "",
      feeStructure,
    };

    if (Array.isArray(feeStructure?.installments) && feeStructure.installments.length) {
      return feeStructure.installments.map((installment) => {
        const paidAmount = Number(installment?.paidAmount || 0);
        const amount = Number(installment?.amount || 0);
        const remainingAmount = Math.max(0, amount - paidAmount);
        const mapKey = `${feeStructure?._id}:inst:${installment.installmentNumber}`;
        const linkedPayment = paymentMap.get(mapKey) || null;

        return {
          _id: `${feeStructure?._id}:${installment.installmentNumber}`,
          ...baseRow,
          description:
            installment?.description || `Installment #${installment.installmentNumber}`,
          installmentNumber: installment?.installmentNumber,
          dueDate: installment?.dueDate || null,
          amount,
          paidAmount,
          remainingAmount,
          status:
            remainingAmount <= 0
              ? "Paid"
              : paidAmount > 0
                ? "Partial"
                : installment?.status || "Pending",
          receiptNo:
            installment?.receiptNumber || linkedPayment?.receiptNo || null,
          voucherNo: installment?.voucherNo || linkedPayment?.voucherNo || null,
          paymentId: linkedPayment?._id || null,
          linkedPayment,
          selectedInstallment: installment,
        };
      });
    }

    const totalFee = Number(feeStructure?.totalFee || 0);
    const paidAmount = Number(feeStructure?.paidAmount || 0);
    const remainingAmount = Math.max(0, totalFee - paidAmount);
    const mapKey = `${feeStructure?._id}:full`;
    const linkedPayment = paymentMap.get(mapKey) || null;

    return [
      {
        _id: `${feeStructure?._id}:full`,
        ...baseRow,
        description: "Full Payment",
        installmentNumber: null,
        dueDate: feeStructure?.createdAt || null,
        amount: totalFee,
        paidAmount,
        remainingAmount,
        status:
          remainingAmount <= 0
            ? "Paid"
            : paidAmount > 0
              ? "Partial"
              : feeStructure?.feeStatus === "Overdue"
                ? "Pending"
                : feeStructure?.feeStatus || "Pending",
        receiptNo: linkedPayment?.receiptNo || null,
        voucherNo: linkedPayment?.voucherNo || null,
        paymentId: linkedPayment?._id || null,
        linkedPayment,
        selectedInstallment: null,
      },
    ];
  });
};

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
  const navigate = useNavigate();
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
  const [exportLoadingFormat, setExportLoadingFormat] = useState(null);
  const [summary, setSummary] = useState({
    totalDues: 0,
    collected: 0,
    remaining: 0,
    studentCount: 0,
    paidCount: 0,
    partialCount: 0,
    pendingCount: 0,
    cashCollected: 0,
    bankCollected: 0,
    unassignedCollected: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    courseId: undefined,
    dueDateFrom: undefined,
    dueDateTo: undefined,
    sortOrder: "asc",
    paymentMethod: "all",
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
  const [historyFeeStructures, setHistoryFeeStructures] = useState([]);
  const [historyEnrollments, setHistoryEnrollments] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [historyStatusTab, setHistoryStatusTab] = useState("all");
  const [historyCourseFilter, setHistoryCourseFilter] = useState("all");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [selectedHistoryInstallments, setSelectedHistoryInstallments] = useState([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState("all");

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
        const filteredByPaymentMethod = (response.data || []).filter(customPaymentMethodFilter);
        setRows(filteredByPaymentMethod);
        setSummary(
          filters.paymentMethod && filters.paymentMethod !== "all"
            ? summarizeRows(filteredByPaymentMethod)
            : response.summary || {},
        );
        setPagination((prev) => ({
          ...prev,
          total: filteredByPaymentMethod.length || response.pagination?.total || 0,
        }));
      }
    } catch (error) {
      message.error(error.message || "Failed to load receipt data");
    } finally {
      setLoading(false);
    }
  };

  const openExportModal = (exportType = "all") => {
    setSelectedExportType(exportType);
    setExportModalOpen(true);
  };

  const downloadBlobFile = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const buildExcelExport = async (exportType = "all") => {
    const effectiveStatus =
      exportType && exportType !== "all" ? exportType : filters.status;

    const response = await getReceiptDuesOverview({
      ...filters,
      status: effectiveStatus === "all" ? "all" : effectiveStatus,
      page: 1,
      limit: Math.max(pagination.total || 0, 5000),
    });

    const exportRows = response?.data || [];
    const exportSummary = response?.summary || {};

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: "Export Type", Value: exportType },
      { Metric: "Search", Value: filters.search || "-" },
      { Metric: "Course", Value: filters.courseId || "All" },
      { Metric: "Status", Value: effectiveStatus || "all" },
      {
        Metric: "Due Date From",
        Value: filters.dueDateFrom
          ? dayjs(filters.dueDateFrom).format("DD MMM YYYY")
          : "All",
      },
      {
        Metric: "Due Date To",
        Value: filters.dueDateTo
          ? dayjs(filters.dueDateTo).format("DD MMM YYYY")
          : "All",
      },
      { Metric: "Sort Order", Value: filters.sortOrder || "asc" },
      { Metric: "Total Dues", Value: exportSummary.totalDues || 0 },
      { Metric: "Collected", Value: exportSummary.collected || 0 },
      { Metric: "Remaining", Value: exportSummary.remaining || 0 },
      { Metric: "Entries", Value: exportSummary.studentCount || exportRows.length || 0 },
      { Metric: "Paid Count", Value: exportSummary.paidCount || 0 },
      { Metric: "Partial Count", Value: exportSummary.partialCount || 0 },
      { Metric: "Pending Count", Value: exportSummary.pendingCount || 0 },
    ]);

    const detailsSheet = XLSX.utils.json_to_sheet(
      exportRows.map((row, index) => ({
        "Sr. No": index + 1,
        "Student Name": row.student?.studentName || "",
        "Registration No": row.student?.registrationNo || "",
        "Mobile Number": row.student?.mobileNumber || "",
        Course: row.course?.courseName || "",
        "Course ID": row.course?.courseId || "",
        Description: row.description || "",
        "Due Date": row.dueDate ? dayjs(row.dueDate).format("DD MMM YYYY") : "",
        "Installment No": row.installmentNumber || "",
        Amount: Number(row.amount || 0),
        Paid: Number(row.paidAmount || 0),
        Remaining: Number(row.remainingAmount || 0),
        Status: row.dueStatus || "",
        "Receipt No": row.receiptNo || row.latestPayment?.receiptNo || "",
        "Voucher No": row.voucherNo || row.latestPayment?.voucherNo || "",
      })),
    );

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, detailsSheet, "Receipt Dues");

    XLSX.writeFile(
      workbook,
      `receipt-dues-${exportType}-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleExport = async (exportType = "all", format = "pdf") => {
    setExportLoadingFormat(format);
    try {
      if (format === "excel") {
        await buildExcelExport(exportType);
      } else {
        const blob = await exportReceiptDues({
          ...filters,
          exportType,
          format,
        });

        downloadBlobFile(
          blob,
          `receipt-dues-${exportType}-${new Date().toISOString().split("T")[0]}.pdf`,
        );
      }

      setExportModalOpen(false);
      message.success(
        `Receipt report exported in ${format === "excel" ? "Excel" : "PDF"} format successfully!`,
      );
    } catch (error) {
      message.error(error.message || "Failed to export report");
    } finally {
      setExportLoadingFormat(null);
    }
  };

  const summarizeRows = (data = []) =>
    data.reduce(
      (acc, row) => {
        acc.totalDues += Number(row.amount || 0);
        acc.collected += Number(row.paidAmount || 0);
        acc.remaining += Number(row.remainingAmount || 0);
        acc.studentCount += 1;
        if (row.dueStatus === "Paid") acc.paidCount += 1;
        if (row.dueStatus === "Partial") acc.partialCount += 1;
        if (row.dueStatus === "Pending") acc.pendingCount += 1;
        return acc;
      },
      {
        totalDues: 0,
        collected: 0,
        remaining: 0,
        studentCount: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
      },
    );

  const handleFilterChange = (key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const customPaymentMethodFilter = (record) => {
    if (!filters.paymentMethod || filters.paymentMethod === "all") {
      return true;
    }

    const label = String(record?.paymentMethod || record?.latestPayment?.paymentMethod || "")
      .trim()
      .toLowerCase();

    if (filters.paymentMethod === "other") {
      return (
        !!label &&
        (label !== "cash" && label !== "bank" && !label.includes("online") && !label.includes("cheque"))
      );
    }

    return label.includes(filters.paymentMethod);
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

  const openHistory = (row) => {
    navigate(`/dashboard/accounting/receipt/history/${row.student?._id}`, {
      state: { studentRow: row },
    });
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

  const getPayButtonStyle = (record) => {
    const isPaid =
      record?.dueStatus === "Paid" || Number(record?.remainingAmount || 0) <= 0;

    if (isPaid) {
      return {
        background: "#dbeafe",
        borderColor: "#bfdbfe",
        color: "#93a3b8",
        opacity: 0.65,
        boxShadow: "none",
        cursor: "not-allowed",
      };
    }

    return {
      background: "var(--primary-color, #142d78)",
      borderColor: "var(--primary-color, #142d78)",
      color: "#ffffff",
      opacity: 1,
    };
  };

  const historyCourseOptions = Array.from(
    new Map(
      historyEnrollments
        .map((item) => [
          String(item?.course?._id || item?.course || ""),
          {
            label: item?.course?.courseName || "Course",
            value: String(item?.course?._id || item?.course || ""),
          },
        ])
        .filter(([value]) => value),
    ).values(),
  );

  const normalizedHistoryCourseOptions = historyCourseOptions.length
    ? historyCourseOptions
    : Array.from(
        new Map(
          historyFeeStructures
            .map((item) => [
              String(item?.course?._id || item?.course || ""),
              {
                label: item?.course?.courseName || "Course",
                value: String(item?.course?._id || item?.course || ""),
              },
            ])
            .filter(([value]) => value),
        ).values(),
      );

  const filteredHistoryRows = historyRows.filter((item) => {
    if (historyStatusTab !== "all" && item.status !== historyStatusTab) {
      return false;
    }

    if (
      historyCourseFilter !== "all" &&
      String(item.courseId || "") !== String(historyCourseFilter)
    ) {
      return false;
    }

    return true;
  });

  const selectableHistoryRows = filteredHistoryRows.filter(
    (item) => item.status !== "Paid" && item.installmentNumber,
  );

  const selectedHistoryInstallmentRows = filteredHistoryRows.filter((item) =>
    selectedHistoryInstallments.includes(item._id),
  );

  const selectedHistoryCourseId =
    selectedHistoryInstallmentRows.length > 0
      ? selectedHistoryInstallmentRows[0].courseId
      : null;

  const canPaySelectedInstallments =
    selectedHistoryInstallmentRows.length > 0 &&
    selectedHistoryInstallmentRows.every(
      (item) => String(item.courseId || "") === String(selectedHistoryCourseId || ""),
    );

  const selectedHistoryFeeStructure =
    historyCourseFilter !== "all"
      ? historyFeeStructures.find(
          (item) =>
            String(item?.course?._id || item?.course || "") ===
            String(historyCourseFilter),
        ) || null
      : null;

  const historyRowSelection = {
    selectedRowKeys: selectedHistoryInstallments,
    onChange: (selectedRowKeys, selectedRows) => {
      const validRows = selectedRows.filter(
        (row) => row.status !== "Paid" && row.installmentNumber,
      );
      const firstCourseId = validRows[0]?.courseId || null;
      const sameCourseRows = firstCourseId
        ? validRows.filter(
            (row) => String(row.courseId || "") === String(firstCourseId),
          )
        : [];

      setSelectedHistoryInstallments(sameCourseRows.map((row) => row._id));

      if (
        validRows.length > 1 &&
        sameCourseRows.length !== validRows.length
      ) {
        message.info("Please select installments from the same course only.");
      }
    },
    getCheckboxProps: (record) => ({
      disabled:
        record.status === "Paid" ||
        !record.installmentNumber ||
        (selectedHistoryCourseId &&
          String(record.courseId || "") !== String(selectedHistoryCourseId)),
    }),
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
      title: "Payment Source",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (value, record) => {
        const paymentLabel = value || record?.latestPayment?.paymentMethod || "-";
        const isOther =
          String(paymentLabel).trim().toLowerCase() !== "cash" &&
          String(paymentLabel).trim().toLowerCase() !== "bank" &&
          paymentLabel !== "-";

        return isOther ? (
          <Tag color="purple">{paymentLabel}</Tag>
        ) : (
          <Tag color={paymentLabel === "Cash" ? "green" : "blue"}>
            {paymentLabel || "-"}
          </Tag>
        );
      },
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
            style={getPayButtonStyle(record)}
            onClick={() => openPayment(record)}
            disabled={
              record.dueStatus === "Paid" ||
              Number(record.remainingAmount || 0) <= 0
            }
          >
            {record.dueStatus === "Paid" ||
            Number(record.remainingAmount || 0) <= 0
              ? "Paid"
              : "Pay"}
          </Button>
          <Button
            icon={<EyeOutlined />}
            style={{
              borderColor: "var(--primary-color, #142d78)",
              color: "var(--primary-color, #142d78)",
            }}
            onClick={() => openReceipt(record.paymentId, record)}
            loading={receiptLoading && activeReceiptId === record.paymentId}
          >
            View Receipt
          </Button>
          <Button
            style={{
              borderColor: "var(--primary-color, #142d78)",
              color: "var(--primary-color, #142d78)",
            }}
            onClick={() => openHistory(record)}
          >
            History
          </Button>
        </Space>
      ),
    },
  ];

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
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color={statusConfig[value]?.color}>{value}</Tag>,
    },
    {
      title: "Receipt",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (value) =>
        value ? (
          <span className="font-mono text-xs">{value}</span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            disabled={record.status === "Paid"}
            onClick={() => openPayment(record)}
          >
            Pay
          </Button>
          <Button
            size="small"
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
                  },
                  {
                    key: "paid",
                    label: "Export Paid Only",
                    icon: <FilePdfOutlined />,
                  },
                  {
                    key: "partial",
                    label: "Export Partial Only",
                    icon: <FilePdfOutlined />,
                  },
                  {
                    key: "pending",
                    label: "Export Pending Only",
                    icon: <FilePdfOutlined />,
                  },
                ],
                onClick: ({ key }) => openExportModal(key),
              }}
              trigger={["click"]}
            >
              <Button
                type="primary"
                loading={Boolean(exportLoadingFormat)}
                className="!h-11 !rounded-xl !border-0 !px-5 !font-medium"
                style={{
                  background: "linear-gradient(135deg, #1677ff 0%, #1447b2 100%)",
                  boxShadow: "0 12px 28px rgba(20, 71, 178, 0.28)",
                }}
              >
                Export <DownOutlined />
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
                {card.key === "collected" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        background: "#ffffff",
                        borderColor: "#b7e4d7",
                        color: "#0f766e",
                      }}
                    >
                      <span>Cash</span>
                      <span>{formatCurrency(summary.cashCollected)}</span>
                    </div>
                    <div
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        background: "#ffffff",
                        borderColor: "#bfdbfe",
                        color: "#1d4ed8",
                      }}
                    >
                      <span>Bank</span>
                      <span>{formatCurrency(summary.bankCollected)}</span>
                    </div>
                    {Number(summary.unassignedCollected || 0) > 0 ? (
                      <div
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                        style={{
                          background: "#ffffff",
                          borderColor: "#f5d0a6",
                          color: "#b45309",
                        }}
                      >
                        <span>Other</span>
                        <span>{formatCurrency(summary.unassignedCollected)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={null}
        title="Download Receipt Report"
        destroyOnClose
      >
        <div className="space-y-4 pt-2">
          <div className="text-sm text-slate-600">
            Choose how you want to download the selected receipt report.
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Export type:{" "}
            <span className="font-semibold text-[#142d78] capitalize">
              {selectedExportType}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={exportLoadingFormat === "pdf"}
              disabled={Boolean(exportLoadingFormat) && exportLoadingFormat !== "pdf"}
              onClick={() => handleExport(selectedExportType, "pdf")}
              className="!h-11 !flex-1 !rounded-xl !border-0 !font-medium"
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
              }}
            >
              Download PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              loading={exportLoadingFormat === "excel"}
              disabled={Boolean(exportLoadingFormat) && exportLoadingFormat !== "excel"}
              onClick={() => handleExport(selectedExportType, "excel")}
              className="!h-11 !flex-1 !rounded-xl !border-emerald-200 !font-medium !text-emerald-700"
              style={{
                background: "#f0fdf4",
              }}
            >
              Download Excel
            </Button>
          </div>
        </div>
      </Modal>

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
                paymentMethod: "all",
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
            placeholder="Search student name, student ID, reg no, enrollment ID, course or receipt"
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
          <Select
            allowClear
            placeholder="All payment sources"
            className="!h-11"
            value={filters.paymentMethod}
            onChange={(value) => handleFilterChange("paymentMethod", value)}
            options={[
              { label: "All sources", value: "all" },
              { label: "Cash", value: "cash" },
              { label: "Bank", value: "bank" },
              { label: "Other / Scholarship", value: "other" },
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
          setHistoryFeeStructures([]);
          setHistoryPayments([]);
          setHistoryContext(null);
          setHistoryStatusTab("all");
          setHistoryCourseFilter("all");
          setSelectedHistoryInstallments([]);
        }}
        footer={null}
        width={1240}
        title={
          historyContext
            ? `${historyContext.student?.studentName} installment history`
            : "Installment history"
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            View all assigned-course installments for this student, filter by
            status or course, and pay multiple pending installments for one selected course.
          </div>
          <Space wrap>
            <Select
              value={historyCourseFilter}
              onChange={(value) => setHistoryCourseFilter(value)}
              style={{ minWidth: 240 }}
              options={[
                { label: "All assigned courses", value: "all" },
                ...historyCourseOptions,
              ]}
            />
            <Button
              type="primary"
              disabled={!canPaySelectedInstallments}
              onClick={() => {
                if (!canPaySelectedInstallments || !historyContext?.student) return;
                const targetFeeStructure =
                  historyFeeStructures.find(
                    (item) =>
                      String(item?._id || "") ===
                      String(selectedHistoryInstallmentRows[0]?.feeStructureId || ""),
                  ) || null;
                if (!targetFeeStructure) return;

                setSelectedFeeStructure(targetFeeStructure);
                setSelectedStudent(historyContext.student);
                setSelectedInstallment(null);
                setPaymentOpen(true);
              }}
            >
              Pay Selected Installments
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={historyStatusTab}
          onChange={setHistoryStatusTab}
          items={[
            { key: "all", label: `All (${historyRows.length})` },
            {
              key: "Pending",
              label: `Pending (${historyRows.filter((item) => item.status === "Pending").length})`,
            },
            {
              key: "Partial",
              label: `Partial (${historyRows.filter((item) => item.status === "Partial").length})`,
            },
            {
              key: "Paid",
              label: `Paid (${historyRows.filter((item) => item.status === "Paid").length})`,
            },
          ]}
        />

        <Table
          rowKey="_id"
          rowSelection={historyRowSelection}
          columns={historyColumns}
          dataSource={filteredHistoryRows}
          loading={historyLoading}
          pagination={{ pageSize: 8 }}
          locale={{
            emptyText: <Empty description="No installment history available" />,
          }}
          scroll={{ x: 1100 }}
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
          setSelectedHistoryInstallments([]);
        }}
        onPaymentSuccess={() => {
          setPaymentOpen(false);
          setSelectedFeeStructure(null);
          setSelectedStudent(null);
          setSelectedInstallment(null);
          setSelectedHistoryInstallments([]);
          fetchReceiptOverview();
          if (historyOpen && historyContext?.student?._id) {
            openHistory(historyContext);
          }
        }}
        feeStructure={selectedFeeStructure}
        studentInfo={selectedStudent}
        selectedInstallment={selectedInstallment}
        initialSelectedInstallments={selectedHistoryInstallmentRows.map(
          (item) => item.installmentNumber,
        )}
      />
    </div>
  );
}
