import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  DatePicker,
  Space,
  Row,
  Col,
  Card,
  Statistic,
  Select,
  Tooltip,
  message,
  Alert,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { MdTrendingUp } from "react-icons/md";
import { ScaleLoader } from "react-spinners";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getProfitLoss } from "../../../services/accountingService";
import useZustandStore from "../../../stores/zustandStore";
import { canViewAccountingBalances } from "../../../utils/accountingAccess";

const { RangePicker } = DatePicker;
const { Option } = Select;

// ── helpers ────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PRESETS = [
  { label: "This Month", value: "month" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Quarter", value: "quarter" },
  { label: "This Year", value: "year" },
  { label: "Custom", value: "custom" },
];

const getPresetRange = (preset) => {
  const now = dayjs();
  switch (preset) {
    case "month":
      return [now.startOf("month"), now.endOf("month")];
    case "lastMonth":
      return [
        now.subtract(1, "month").startOf("month"),
        now.subtract(1, "month").endOf("month"),
      ];
    case "quarter":
      return [now.startOf("quarter"), now.endOf("quarter")];
    case "year":
      return [now.startOf("year"), now.endOf("year")];
    default:
      return null;
  }
};

// ── Progress bar component ──────────────────────────────────
const BreakdownRow = ({ name, total, maxTotal, color, count }) => {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 truncate max-w-[55%]">
          {name}
        </span>
        <span className="text-gray-500 text-xs">
          <span className="font-semibold" style={{ color }}>
            Rs. {fmt(total)}
          </span>
          &nbsp;·&nbsp;{count} txn
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-[8px]">
        <div
          className="h-[8px] rounded-full transition-all duration-500"
          style={{ width: `${pct.toFixed(1)}%`, background: color }}
        />
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────
const ProfitLoss = () => {
  const defaultRange = getPresetRange("month");
  const [preset, setPreset] = useState("month");
  const [dateRange, setDateRange] = useState(defaultRange);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [txnType, setTxnType] = useState("all"); // "all" | "income" | "expense"
  const { appSettings, isSuperAdmin, adminInfo } = useZustandStore();
  const balancesVisible = canViewAccountingBalances({
    appSettings,
    isSuperAdmin,
    adminInfo,
  });

  const fetchData = useCallback(async () => {
    if (!balancesVisible) {
      setData(null);
      return;
    }
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;
    setLoading(true);
    try {
      const res = await getProfitLoss({
        dateFrom: dateRange[0].format("YYYY-MM-DD"),
        dateTo: dateRange[1].format("YYYY-MM-DD"),
      });
      if (res?.success) setData(res.data);
    } catch (err) {
      message.error(err?.message || "Failed to load P&L data");
    } finally {
      setLoading(false);
    }
  }, [dateRange, balancesVisible]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Preset change handler ────────────────────────────────
  const handlePreset = (val) => {
    setPreset(val);
    if (val !== "custom") {
      const range = getPresetRange(val);
      setDateRange(range);
    }
  };

  const handleRangeChange = (dates) => {
    setPreset("custom");
    setDateRange(dates);
  };

  // ── Filtered transactions ────────────────────────────────
  const transactions = data?.transactions || [];
  const filteredTxns = transactions.filter((t) => {
    if (txnType === "all") return true;
    return t.type?.name?.toLowerCase() === txnType;
  });

  // ── PDF Export ───────────────────────────────────────────
  const exportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const fromLabel = dateRange?.[0]?.format("DD MMM YYYY") || "";
      const toLabel = dateRange?.[1]?.format("DD MMM YYYY") || "";
      const isProfit = (data?.netBalance || 0) >= 0;

      // Header
      doc.setFillColor(1, 19, 76);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(232, 252, 10);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Profit & Loss Report", 14, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 210, 255);
      doc.text(`Period: ${fromLabel} — ${toLabel}`, 14, 20);
      doc.text(`Generated: ${dayjs().format("DD MMM YYYY HH:mm")}`, 14, 26);

      // Summary cards
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, 40);

      const summary = [
        ["Total Income", `Rs. ${fmt(data?.totalIncome)}`],
        ["Total Expense", `Rs. ${fmt(data?.totalExpense)}`],
        [
          isProfit ? "Net Profit" : "Net Loss",
          `Rs. ${fmt(Math.abs(data?.netBalance))}`,
        ],
      ];
      autoTable(doc, {
        startY: 44,
        head: [["Item", "Amount"]],
        body: summary,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [1, 19, 76], textColor: [232, 252, 10] },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      const afterSummary = doc.lastAutoTable.finalY + 8;

      // Income breakdown
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Income Breakdown", 14, afterSummary);
      autoTable(doc, {
        startY: afterSummary + 4,
        head: [["Head", "Transactions", "Amount"]],
        body: (data?.incomeBreakdown || []).map((r) => [
          r.headName,
          r.count,
          `Rs. ${fmt(r.total)}`,
        ]),
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        columnStyles: { 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      const afterIncome = doc.lastAutoTable.finalY + 8;

      // Expense breakdown
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Expense Breakdown", 14, afterIncome);
      autoTable(doc, {
        startY: afterIncome + 4,
        head: [["Head", "Transactions", "Amount"]],
        body: (data?.expenseBreakdown || []).map((r) => [
          r.headName,
          r.count,
          `Rs. ${fmt(r.total)}`,
        ]),
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
        columnStyles: { 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      const afterExpense = doc.lastAutoTable.finalY + 8;

      // Transactions
      doc.addPage();
      doc.setFillColor(1, 19, 76);
      doc.rect(0, 0, 210, 14, "F");
      doc.setTextColor(232, 252, 10);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Transaction List", 14, 10);
      autoTable(doc, {
        startY: 18,
        head: [["Date", "Name", "Head", "Type", "Payment Method", "Amount"]],
        body: transactions.map((t) => [
          t.paymentDate ? dayjs(t.paymentDate).format("DD MMM YYYY") : "-",
          t.name || "-",
          t.head?.name || "-",
          t.type?.name || "-",
          t.paymentMethod?.name || "-",
          `Rs. ${fmt(t.amount)}`,
        ]),
        theme: "striped",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [1, 19, 76], textColor: [232, 252, 10] },
        columnStyles: { 5: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      doc.save(`profit-loss-${fromLabel}-to-${toLabel}.pdf`);
    } catch (err) {
      message.error("PDF export failed");
      console.error(err);
    }
  };

  // ── Table columns for transactions ───────────────────────
  const columns = [
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (d) => (d ? dayjs(d).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Description",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Head of Account",
      dataIndex: ["head", "name"],
      key: "head",
      ellipsis: true,
      render: (_, r) => r.head?.name || "-",
    },
    {
      title: "Type",
      dataIndex: ["type", "name"],
      key: "type",
      width: 100,
      render: (_, r) => {
        const isIncome = r.type?.name === "Income";
        return (
          <Tag
            color={isIncome ? "green" : "red"}
            style={{ fontWeight: 600, letterSpacing: "0.5px" }}
          >
            {isIncome ? "▲ IN" : "▼ OUT"}
          </Tag>
        );
      },
    },
    {
      title: "Payment Method",
      dataIndex: ["paymentMethod", "name"],
      key: "paymentMethod",
      render: (_, r) => r.paymentMethod?.name || "-",
    },
    {
      title: "Amount (Rs.)",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 130,
      render: (amt, r) => {
        const isIncome = r.type?.name === "Income";
        return (
          <span
            className="font-semibold"
            style={{ color: isIncome ? "#16a34a" : "#dc2626" }}
          >
            {isIncome ? "+" : "-"}Rs. {fmt(amt)}
          </span>
        );
      },
    },
  ];

  const isProfit = (data?.netBalance ?? 0) >= 0;
  const incomeMax = Math.max(
    ...(data?.incomeBreakdown || []).map((r) => r.total),
    1,
  );
  const expenseMax = Math.max(
    ...(data?.expenseBreakdown || []).map((r) => r.total),
    1,
  );

  return (
    <div className="w-full space-y-5">
      {!balancesVisible ? (
        <Alert
          type="warning"
          showIcon
          message="Profit and loss totals are hidden by the super admin."
          description="Accounting users can continue operational work, but monthly financial summaries are restricted."
        />
      ) : null}
      {!balancesVisible ? null : (
      <>
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdTrendingUp size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
              Profit & Loss
            </h2>
            <p className="text-sm m-0" style={{ color: "#6b7280" }}>
              Income vs expenses analytics by date range
            </p>
          </div>
        </div>

        {/* Controls */}
        <Space wrap>
          <Select
            value={preset}
            onChange={handlePreset}
            style={{ width: 140 }}
            size="middle"
          >
            {PRESETS.map((p) => (
              <Option key={p.value} value={p.value}>
                {p.label}
              </Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={handleRangeChange}
            format="DD MMM YYYY"
            allowClear={false}
            style={{ minWidth: 240 }}
          />
          <Tooltip title="Export PDF">
            <Button
              icon={<DownloadOutlined />}
              onClick={exportPDF}
              disabled={!data}
              style={{
                background: "#01134C",
                color: "#E8FC0A",
                border: "none",
                fontWeight: 600,
              }}
            >
              PDF
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* ── Loading ────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <ScaleLoader color="#01134C" />
        </div>
      ) : (
        <>
          {/* ── Summary Cards ──────────────────────────── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                className="shadow-sm"
                style={{ borderTop: "4px solid #16a34a" }}
              >
                <Statistic
                  title={
                    <span className="text-gray-500 text-sm font-medium">
                      Total Income
                    </span>
                  }
                  value={data?.totalIncome ?? 0}
                  precision={2}
                  prefix={
                    <ArrowUpOutlined
                      style={{ color: "#16a34a", fontSize: 14 }}
                    />
                  }
                  suffix="Rs."
                  valueStyle={{
                    color: "#16a34a",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                  formatter={(v) => `${fmt(v)}`}
                />
                <p className="text-xs text-gray-400 mt-1 mb-0">
                  {data?.incomeBreakdown?.reduce((s, r) => s + r.count, 0) || 0}{" "}
                  transaction(s)
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                className="shadow-sm"
                style={{ borderTop: "4px solid #dc2626" }}
              >
                <Statistic
                  title={
                    <span className="text-gray-500 text-sm font-medium">
                      Total Expenses
                    </span>
                  }
                  value={data?.totalExpense ?? 0}
                  precision={2}
                  prefix={
                    <ArrowDownOutlined
                      style={{ color: "#dc2626", fontSize: 14 }}
                    />
                  }
                  suffix="Rs."
                  valueStyle={{
                    color: "#dc2626",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                  formatter={(v) => `${fmt(v)}`}
                />
                <p className="text-xs text-gray-400 mt-1 mb-0">
                  {data?.expenseBreakdown?.reduce((s, r) => s + r.count, 0) ||
                    0}{" "}
                  transaction(s)
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                className="shadow-sm"
                style={{
                  borderTop: `4px solid ${isProfit ? "#01134C" : "#f97316"}`,
                }}
              >
                <Statistic
                  title={
                    <span className="text-gray-500 text-sm font-medium">
                      Net {isProfit ? "Profit" : "Loss"}
                    </span>
                  }
                  value={Math.abs(data?.netBalance ?? 0)}
                  precision={2}
                  suffix="Rs."
                  valueStyle={{
                    color: isProfit ? "#01134C" : "#f97316",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                  formatter={(v) => `${isProfit ? "+" : "-"}${fmt(v)}`}
                />
                <p
                  className="text-xs mt-1 mb-0"
                  style={{ color: isProfit ? "#16a34a" : "#f97316" }}
                >
                  {isProfit ? "▲ Profitable period" : "▼ Loss period"}
                </p>
              </Card>
            </Col>
          </Row>

          {/* ── Income vs Expense Breakdown ────────────── */}
          <Row gutter={[16, 16]}>
            {/* Income Breakdown */}
            <Col xs={24} md={12}>
              <Card
                bordered={false}
                className="shadow-sm h-full"
                title={
                  <div className="flex items-center gap-2">
                    <ArrowUpOutlined style={{ color: "#16a34a" }} />
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>
                      Income Breakdown
                    </span>
                    <Tag
                      color="green"
                      style={{ marginLeft: "auto", fontWeight: 600 }}
                    >
                      Rs. {fmt(data?.totalIncome)}
                    </Tag>
                  </div>
                }
              >
                {(data?.incomeBreakdown || []).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">
                    No income transactions in this period
                  </p>
                ) : (
                  (data?.incomeBreakdown || []).map((r, i) => (
                    <BreakdownRow
                      key={i}
                      name={r.headName}
                      total={r.total}
                      maxTotal={incomeMax}
                      color="#16a34a"
                      count={r.count}
                    />
                  ))
                )}
              </Card>
            </Col>

            {/* Expense Breakdown */}
            <Col xs={24} md={12}>
              <Card
                bordered={false}
                className="shadow-sm h-full"
                title={
                  <div className="flex items-center gap-2">
                    <ArrowDownOutlined style={{ color: "#dc2626" }} />
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>
                      Expense Breakdown
                    </span>
                    <Tag
                      color="red"
                      style={{ marginLeft: "auto", fontWeight: 600 }}
                    >
                      Rs. {fmt(data?.totalExpense)}
                    </Tag>
                  </div>
                }
              >
                {(data?.expenseBreakdown || []).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">
                    No expense transactions in this period
                  </p>
                ) : (
                  (data?.expenseBreakdown || []).map((r, i) => (
                    <BreakdownRow
                      key={i}
                      name={r.headName}
                      total={r.total}
                      maxTotal={expenseMax}
                      color="#dc2626"
                      count={r.count}
                    />
                  ))
                )}
              </Card>
            </Col>
          </Row>

          {/* ── Transaction List ───────────────────────── */}
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileTextOutlined style={{ color: "#01134C" }} />
                  <span style={{ color: "#01134C", fontWeight: 700 }}>
                    Transaction List
                  </span>
                  <Tag
                    style={{
                      background: "#01134C",
                      color: "#E8FC0A",
                      border: "none",
                      fontWeight: 600,
                    }}
                  >
                    {filteredTxns.length} records
                  </Tag>
                </div>
                <Select
                  value={txnType}
                  onChange={setTxnType}
                  size="small"
                  style={{ width: 140 }}
                >
                  <Option value="all">All Transactions</Option>
                  <Option value="income">Income Only (IN)</Option>
                  <Option value="expense">Expense Only (OUT)</Option>
                </Select>
              </div>
            }
          >
            <div className="overflow-x-auto w-full">
              <Table
                dataSource={filteredTxns}
                columns={columns}
                rowKey="_id"
                size="small"
                scroll={{ x: "max-content" }}
                pagination={{
                  defaultPageSize: 20,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50, 100],
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} transactions`,
                  style: { marginTop: "12px" },
                }}
                rowClassName={(r) =>
                  r.type?.name === "Income"
                    ? "bg-green-50/40 hover:bg-green-50"
                    : "bg-red-50/40 hover:bg-red-50"
                }
              />
            </div>
          </Card>
        </>
      )}
      </>
      )}
    </div>
  );
};

export default ProfitLoss;
