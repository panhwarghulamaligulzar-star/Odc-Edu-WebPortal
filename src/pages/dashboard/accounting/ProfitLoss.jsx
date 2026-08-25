import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { MdTrendingUp } from "react-icons/md";
import { ScaleLoader } from "react-spinners";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getHeadsOfAccount, getProfitLoss } from "../../../services/accountingService";
import { getCourses } from "../../../services/feeService";

const { Option } = Select;

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const ProfitLoss = () => {
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [heads, setHeads] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedIncomeHeadKey, setSelectedIncomeHeadKey] = useState(null);
  const [selectedExpenseHeadKey, setSelectedExpenseHeadKey] = useState(null);

  useEffect(() => {
    const loadBootData = async () => {
      try {
        const [coursesResponse, headsResponse] = await Promise.all([
          getCourses(),
          getHeadsOfAccount(null, true),
        ]);
        if (coursesResponse?.success) {
          setCourses(coursesResponse.data || []);
        }
        if (headsResponse?.success) {
          setHeads(headsResponse.data || []);
        }
      } catch (error) {
        console.error("Failed to load profit/loss boot data:", error);
      } finally {
        setBootLoading(false);
      }
    };

    loadBootData();
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const response = await getProfitLoss({
          year: selectedYear === "all" ? undefined : selectedYear,
          month:
            selectedYear === "all" || selectedMonth === "all"
              ? undefined
              : selectedMonth,
          courseId: selectedCourse === "all" ? undefined : selectedCourse,
        });
        if (response?.success) {
          setData(response.data);
        }
      } catch (error) {
        message.error(error?.message || "Failed to load profit and loss data");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedCourse, selectedMonth, selectedYear]);

  useEffect(() => {
    setSelectedIncomeHeadKey(null);
    setSelectedExpenseHeadKey(null);
  }, [selectedCourse, selectedMonth, selectedYear, data?.meta?.generatedAt]);

  const yearOptions = useMemo(() => {
    const apiYears = Array.isArray(data?.meta?.availableYears)
      ? data.meta.availableYears
      : [];

    if (apiYears.length) {
      return apiYears;
    }

    const currentYear = dayjs().year();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, [data]);

  const totalIncome = Number(data?.totalIncome || 0);
  const totalExpense = Number(data?.totalExpense || 0);
  const netBalance = Number(data?.netBalance || 0);
  const isProfit = netBalance >= 0;

  const incomeEntries = Array.isArray(data?.incomeEntries) ? data.incomeEntries : [];
  const expenseEntries = Array.isArray(data?.expenseEntries) ? data.expenseEntries : [];
  const statementRows = Array.isArray(data?.statementRows) ? data.statementRows : [];

  const headsLookup = useMemo(() => {
    const lookup = new Map();

    heads.forEach((head) => {
      const id = String(head?._id || "").trim();
      const name = String(head?.name || "").trim();

      if (id) {
        lookup.set(id, {
          _id: id,
          name: name || "Unassigned Head",
        });
      }

      if (name) {
        lookup.set(name.toLowerCase(), {
          _id: id || name,
          name,
        });
      }
    });

    return lookup;
  }, [heads]);

  const resolveHead = (record) => {
    if (record?.head?.name) {
      return {
        _id: String(record?.head?._id || record?.head?.name || ""),
        name: record.head.name,
      };
    }

    const rawHeadId = String(record?.head?._id || record?.head || "").trim();
    if (rawHeadId && headsLookup.has(rawHeadId)) {
      return headsLookup.get(rawHeadId);
    }

    const rawHeadName = String(record?.head?.label || record?.headName || "").trim().toLowerCase();
    if (rawHeadName && headsLookup.has(rawHeadName)) {
      return headsLookup.get(rawHeadName);
    }

    return {
      _id: "unassigned",
      name: "Unassigned Head",
    };
  };

  const getHeadKey = (record) => String(resolveHead(record)?._id || "unassigned");
  const getHeadLabel = (record) => String(resolveHead(record)?.name || "Unassigned Head");

  const incomeHeadRows = useMemo(() => {
    const groups = incomeEntries.reduce((acc, entry) => {
      const key = getHeadKey(entry);
      const existing = acc.get(key) || {
        key,
        headName: getHeadLabel(entry),
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += Number(entry.amount || 0);
      acc.set(key, existing);
      return acc;
    }, new Map());

    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [incomeEntries, headsLookup]);

  const expenseHeadRows = useMemo(() => {
    const groups = expenseEntries.reduce((acc, entry) => {
      const key = getHeadKey(entry);
      const existing = acc.get(key) || {
        key,
        headName: getHeadLabel(entry),
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += Number(entry.amount || 0);
      acc.set(key, existing);
      return acc;
    }, new Map());

    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [expenseEntries, headsLookup]);

  const selectedIncomeHead = useMemo(
    () => incomeHeadRows.find((row) => row.key === selectedIncomeHeadKey) || null,
    [incomeHeadRows, selectedIncomeHeadKey],
  );

  const selectedExpenseHead = useMemo(
    () => expenseHeadRows.find((row) => row.key === selectedExpenseHeadKey) || null,
    [expenseHeadRows, selectedExpenseHeadKey],
  );

  const visibleIncomeEntries = useMemo(() => {
    if (!selectedIncomeHeadKey) return incomeEntries;
    return incomeEntries.filter((entry) => getHeadKey(entry) === selectedIncomeHeadKey);
  }, [incomeEntries, selectedIncomeHeadKey]);

  const visibleExpenseEntries = useMemo(() => {
    if (!selectedExpenseHeadKey) return expenseEntries;
    return expenseEntries.filter((entry) => getHeadKey(entry) === selectedExpenseHeadKey);
  }, [expenseEntries, selectedExpenseHeadKey]);

  const selectedYearLabel = selectedYear === "all" ? "All years" : String(selectedYear);
  const selectedMonthLabel =
    selectedMonth === "all"
      ? "All months"
      : MONTH_OPTIONS.find((item) => item.value === selectedMonth)?.label || "All months";
  const selectedCourseLabel =
    selectedCourse === "all"
      ? "All courses"
      : courses.find((course) => String(course._id) === String(selectedCourse))?.courseName ||
        "Selected course";

  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFillColor(1, 19, 76);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Profit & Loss Statement", 14, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Year: ${selectedYearLabel} | Month: ${selectedMonthLabel} | Course: ${selectedCourseLabel}`,
        14,
        19,
      );
      doc.text(`Generated: ${dayjs().format("DD MMM YYYY hh:mm A")}`, 14, 24);

      autoTable(doc, {
        startY: 36,
        head: [["Metric", "Amount"]],
        body: [
          ["Total Income", `Rs. ${formatCurrency(totalIncome)}`],
          ["Total Expense", `Rs. ${formatCurrency(totalExpense)}`],
          [isProfit ? "Net Profit" : "Net Loss", `Rs. ${formatCurrency(Math.abs(netBalance))}`],
        ],
        theme: "grid",
        headStyles: { fillColor: [1, 19, 76], textColor: [255, 255, 255] },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Income Entry", "Head", "Course", "Date", "Amount"]],
        body: incomeEntries.map((row) => [
          row.name || "-",
          row.head?.name || "-",
          row.courseLabel || "-",
          row.paymentDate ? dayjs(row.paymentDate).format("DD MMM YYYY") : "-",
          `Rs. ${formatCurrency(row.amount)}`,
        ]),
        theme: "striped",
        headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255] },
        columnStyles: { 4: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      doc.addPage();

      autoTable(doc, {
        startY: 16,
        head: [["Expense Entry", "Head", "Course", "Date", "Amount"]],
        body: expenseEntries.map((row) => [
          row.name || "-",
          row.head?.name || "-",
          row.courseLabel || "-",
          row.paymentDate ? dayjs(row.paymentDate).format("DD MMM YYYY") : "-",
          `Rs. ${formatCurrency(row.amount)}`,
        ]),
        theme: "striped",
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
        columnStyles: { 4: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      doc.save(`profit-loss-${dayjs().format("YYYY-MM-DD-HHmm")}.pdf`);
    } catch (error) {
      console.error("Profit/loss PDF export failed:", error);
      message.error("Failed to export profit and loss PDF");
    }
  };

  const transactionColumns = (entryType) => [
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 120,
      render: (value) => (value ? dayjs(value).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Entry",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (value, record) => (
        <div>
          <div className="font-semibold text-slate-800">{value || "-"}</div>
          <div className="text-xs text-slate-400">{record.transactionNo || "-"}</div>
        </div>
      ),
    },
    {
      title: "Head",
      dataIndex: ["head", "name"],
      key: "head",
      ellipsis: true,
      render: (_, record) => getHeadLabel(record),
    },
    {
      title: "Course",
      dataIndex: "courseLabel",
      key: "courseLabel",
      ellipsis: true,
      render: (value) =>
        value ? <Tag color="blue">{value}</Tag> : <span className="text-slate-400">General</span>,
    },
    {
      title: "Payment Method",
      dataIndex: ["paymentMethod", "name"],
      key: "paymentMethod",
      render: (_, record) => record.paymentMethod?.name || "-",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 140,
      render: (value) => (
        <span
          className="font-semibold"
          style={{ color: entryType === "income" ? "#15803d" : "#dc2626" }}
        >
          {entryType === "income" ? "+" : "-"}Rs. {formatCurrency(value)}
        </span>
      ),
    },
  ];

  const headSummaryColumns = (entryType, onSelectHead) => [
    {
      title: "Head Of Account",
      dataIndex: "headName",
      key: "headName",
      render: (value, record) => (
        <Button
          type="link"
          className="!px-0 !font-semibold"
          style={{ color: entryType === "income" ? "#15803d" : "#dc2626" }}
          onClick={() => onSelectHead(record.key)}
        >
          {value}
        </Button>
      ),
    },
    {
      title: "Entries",
      dataIndex: "count",
      key: "count",
      width: 110,
      align: "center",
      render: (value) => <Tag color={entryType === "income" ? "green" : "red"}>{value}</Tag>,
    },
    {
      title: "Amount",
      dataIndex: "total",
      key: "total",
      align: "right",
      width: 160,
      render: (value) => (
        <span
          className="font-semibold"
          style={{ color: entryType === "income" ? "#15803d" : "#dc2626" }}
        >
          Rs. {formatCurrency(value)}
        </span>
      ),
    },
  ];

  const statementColumns = [
    {
      title: "Statement Line",
      dataIndex: "label",
      key: "label",
      render: (value) => <span className="font-semibold text-slate-800">{value}</span>,
    },
    {
      title: "Income",
      dataIndex: "incomeAmount",
      key: "incomeAmount",
      align: "right",
      render: (value) =>
        value !== null && value !== undefined ? (
          <span className="font-semibold text-emerald-700">Rs. {formatCurrency(value)}</span>
        ) : (
          "-"
        ),
    },
    {
      title: "Expense",
      dataIndex: "expenseAmount",
      key: "expenseAmount",
      align: "right",
      render: (value) =>
        value !== null && value !== undefined ? (
          <span className="font-semibold text-rose-700">Rs. {formatCurrency(value)}</span>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #01134C 0%, #17338f 100%)" }}
          >
            <MdTrendingUp size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="module-title">Profit & Loss</h2>
            <p className="module-subtitle">
              View all income and expense entries and track net result across the accounting
              module.
            </p>
          </div>
        </div>

        <Tooltip title="Export current report">
          <Button
            icon={<DownloadOutlined />}
            onClick={exportPDF}
            disabled={!data}
            style={{
              background: "#01134C",
              borderColor: "#01134C",
              color: "#E8FC0A",
              fontWeight: 600,
            }}
          >
            Export PDF
          </Button>
        </Tooltip>
      </div>

      <Card
        bordered={false}
        className="shadow-sm"
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
              Filter Statement
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Check yearly, monthly, or course-wise profit and loss from the beginning of the
              accounting records.
            </div>
          </div>
          <Button
            className="!h-10 !rounded-xl !border-slate-200 !px-4"
            onClick={() => {
              setSelectedYear("all");
              setSelectedMonth("all");
              setSelectedCourse("all");
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            value={selectedYear}
            onChange={(value) => {
              setSelectedYear(value);
              if (value === "all") {
                setSelectedMonth("all");
              }
            }}
            className="!h-11"
          >
            <Option value="all">All years</Option>
            {yearOptions.map((year) => (
              <Option key={year} value={year}>
                {year}
              </Option>
            ))}
          </Select>

          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="!h-11"
            disabled={selectedYear === "all"}
          >
            <Option value="all">All months</Option>
            {MONTH_OPTIONS.map((month) => (
              <Option key={month.value} value={month.value}>
                {month.label}
              </Option>
            ))}
          </Select>

          <Select value={selectedCourse} onChange={setSelectedCourse} className="!h-11" showSearch>
            <Option value="all">All courses</Option>
            {courses.map((course) => (
              <Option key={course._id} value={course._id}>
                {course.courseName}
              </Option>
            ))}
          </Select>
        </div>
      </Card>

      {bootLoading || loading ? (
        <div className="flex justify-center items-center py-24">
          <ScaleLoader color="#01134C" />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card bordered={false} className="shadow-sm" style={{ borderTop: "4px solid #16a34a" }}>
                <Statistic
                  title={<span className="text-gray-500 text-sm font-medium">Total Income</span>}
                  value={totalIncome}
                  formatter={(value) => `Rs. ${formatCurrency(value)}`}
                  prefix={<ArrowUpOutlined style={{ color: "#16a34a" }} />}
                  valueStyle={{ color: "#16a34a", fontSize: 24, fontWeight: 700 }}
                />
                <div className="mt-2 text-xs text-slate-400">{incomeEntries.length} income entries</div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card bordered={false} className="shadow-sm" style={{ borderTop: "4px solid #dc2626" }}>
                <Statistic
                  title={<span className="text-gray-500 text-sm font-medium">Total Expense</span>}
                  value={totalExpense}
                  formatter={(value) => `Rs. ${formatCurrency(value)}`}
                  prefix={<ArrowDownOutlined style={{ color: "#dc2626" }} />}
                  valueStyle={{ color: "#dc2626", fontSize: 24, fontWeight: 700 }}
                />
                <div className="mt-2 text-xs text-slate-400">{expenseEntries.length} expense entries</div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                bordered={false}
                className="shadow-sm"
                style={{ borderTop: `4px solid ${isProfit ? "#01134C" : "#f97316"}` }}
              >
                <Statistic
                  title={
                    <span className="text-gray-500 text-sm font-medium">
                      Net {isProfit ? "Profit" : "Loss"}
                    </span>
                  }
                  value={Math.abs(netBalance)}
                  formatter={(value) => `Rs. ${formatCurrency(value)}`}
                  valueStyle={{
                    color: isProfit ? "#01134C" : "#f97316",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                />
                <div className="mt-2 text-xs" style={{ color: isProfit ? "#15803d" : "#ea580c" }}>
                  {isProfit ? "Profitable result for selected filters" : "Loss result for selected filters"}
                </div>
              </Card>
            </Col>
          </Row>

          <Alert
            type={isProfit ? "success" : "warning"}
            showIcon
            message={`${selectedYearLabel} | ${selectedMonthLabel} | ${selectedCourseLabel}`}
            description={`Income: Rs. ${formatCurrency(totalIncome)} | Expense: Rs. ${formatCurrency(
              totalExpense,
            )} | ${isProfit ? "Profit" : "Loss"}: Rs. ${formatCurrency(Math.abs(netBalance))}`}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                className="shadow-sm"
                title={
                  <Space>
                    <ArrowUpOutlined style={{ color: "#16a34a" }} />
                    <span className="font-semibold text-emerald-700">Income Entries</span>
                    <Tag color="green">
                      {selectedIncomeHead ? visibleIncomeEntries.length : incomeHeadRows.length}
                    </Tag>
                  </Space>
                }
              >
                {incomeEntries.length ? (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm text-slate-500">
                        {selectedIncomeHead
                          ? `Showing only "${selectedIncomeHead.headName}" entries`
                          : "Showing all income heads of account. Click a head to view its entries."}
                      </div>
                      {selectedIncomeHead ? (
                        <Button onClick={() => setSelectedIncomeHeadKey(null)}>Back to all heads</Button>
                      ) : null}
                    </div>

                    <Table
                      rowKey={selectedIncomeHead ? "_id" : "key"}
                      size="small"
                      dataSource={selectedIncomeHead ? visibleIncomeEntries : incomeHeadRows}
                      columns={
                        selectedIncomeHead
                          ? transactionColumns("income")
                          : headSummaryColumns("income", setSelectedIncomeHeadKey)
                      }
                      scroll={{ x: "max-content" }}
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                    />
                  </>
                ) : (
                  <Empty description="No income entries found for the selected filters" />
                )}
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                className="shadow-sm"
                title={
                  <Space>
                    <ArrowDownOutlined style={{ color: "#dc2626" }} />
                    <span className="font-semibold text-rose-700">Expense Entries</span>
                    <Tag color="red">
                      {selectedExpenseHead ? visibleExpenseEntries.length : expenseHeadRows.length}
                    </Tag>
                  </Space>
                }
              >
                {expenseEntries.length ? (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm text-slate-500">
                        {selectedExpenseHead
                          ? `Showing only "${selectedExpenseHead.headName}" entries`
                          : "Showing all expense heads of account. Click a head to view its entries."}
                      </div>
                      {selectedExpenseHead ? (
                        <Button onClick={() => setSelectedExpenseHeadKey(null)}>Back to all heads</Button>
                      ) : null}
                    </div>

                    <Table
                      rowKey={selectedExpenseHead ? "_id" : "key"}
                      size="small"
                      dataSource={selectedExpenseHead ? visibleExpenseEntries : expenseHeadRows}
                      columns={
                        selectedExpenseHead
                          ? transactionColumns("expense")
                          : headSummaryColumns("expense", setSelectedExpenseHeadKey)
                      }
                      scroll={{ x: "max-content" }}
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                    />
                  </>
                ) : (
                  <Empty description="No expense entries found for the selected filters" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                className="shadow-sm"
                title={<span className="font-semibold text-slate-800">Income Breakdown</span>}
              >
                <Table
                  rowKey={(record) => `income-${record.headName}`}
                  size="small"
                  dataSource={data?.incomeBreakdown || []}
                  pagination={false}
                  locale={{ emptyText: "No income heads found" }}
                  columns={[
                    {
                      title: "Head",
                      dataIndex: "headName",
                      key: "headName",
                    },
                    {
                      title: "Entries",
                      dataIndex: "count",
                      key: "count",
                      width: 90,
                      align: "center",
                    },
                    {
                      title: "Amount",
                      dataIndex: "total",
                      key: "total",
                      align: "right",
                      render: (value) => (
                        <span className="font-semibold text-emerald-700">
                          Rs. {formatCurrency(value)}
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                className="shadow-sm"
                title={<span className="font-semibold text-slate-800">Expense Breakdown</span>}
              >
                <Table
                  rowKey={(record) => `expense-${record.headName}`}
                  size="small"
                  dataSource={data?.expenseBreakdown || []}
                  pagination={false}
                  locale={{ emptyText: "No expense heads found" }}
                  columns={[
                    {
                      title: "Head",
                      dataIndex: "headName",
                      key: "headName",
                    },
                    {
                      title: "Entries",
                      dataIndex: "count",
                      key: "count",
                      width: 90,
                      align: "center",
                    },
                    {
                      title: "Amount",
                      dataIndex: "total",
                      key: "total",
                      align: "right",
                      render: (value) => (
                        <span className="font-semibold text-rose-700">
                          Rs. {formatCurrency(value)}
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Card
            bordered={false}
            className="shadow-sm"
            title={<span className="font-semibold text-slate-800">Final Statement</span>}
          >
            <Table
              rowKey="label"
              size="small"
              pagination={false}
              columns={statementColumns}
              dataSource={statementRows}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ProfitLoss;
