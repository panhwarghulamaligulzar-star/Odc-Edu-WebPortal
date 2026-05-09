import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Dropdown,
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TransactionOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { ScaleLoader } from "react-spinners";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import academyConfig from "../../../config/academyConfig";
import odysseyLogo from "../../../assets/images/logos/LOGO.png";
import { formatDateOnlyForApi } from "../../../utils/date";
import {
  getAccountingTypes,
  getHeadsOfAccount,
  getPaymentMethods,
  getTransactions,
  getTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../../../services/accountingService";

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(v || 0);

const Transactions = () => {
  // ── State ──────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });

  // Filter state
  const [filterType, setFilterType] = useState(null);
  const [filterHead, setFilterHead] = useState(null);
  const [filterMethods, setFilterMethods] = useState([]);
  const [filterDates, setFilterDates] = useState(null);

  // Reference data
  const [types, setTypes] = useState([]);
  const [heads, setHeads] = useState([]);
  const [methods, setMethods] = useState([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formHeads, setFormHeads] = useState([]); // heads filtered by selected type in form

  const [form] = Form.useForm();

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);

  // Export / preview state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [exportData, setExportData] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Load reference data on mount ──────────────────────────
  useEffect(() => {
    Promise.all([
      getAccountingTypes(),
      getHeadsOfAccount(null, false),
      getPaymentMethods(),
    ])
      .then(([t, h, m]) => {
        if (t?.success) setTypes(t.data);
        if (h?.success) setHeads(h.data);
        if (m?.success) setMethods(m.data);
      })
      .catch(console.error);
  }, []);

  // ── Fetch transactions ─────────────────────────────────────
  const fetchTransactions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.pageSize };
        if (filterType) params.type = filterType;
        if (filterHead) params.head = filterHead;
        if (filterMethods.length)
          params.paymentMethod = filterMethods.join(",");
        if (filterDates?.[0]) params.dateFrom = filterDates[0].toISOString();
        if (filterDates?.[1]) params.dateTo = filterDates[1].toISOString();

        const [txnRes, sumRes] = await Promise.all([
          getTransactions(params),
          getTransactionSummary({
            ...(filterMethods.length && {
              paymentMethod: filterMethods.join(","),
            }),
            ...(filterDates?.[0] && { dateFrom: filterDates[0].toISOString() }),
            ...(filterDates?.[1] && { dateTo: filterDates[1].toISOString() }),
          }),
        ]);

        if (txnRes?.success) {
          setTransactions(txnRes.data);
          setPagination((p) => ({
            ...p,
            current: page,
            total: txnRes.pagination.total,
          }));
        }
        if (sumRes?.success) setSummary(sumRes.data);
      } catch (err) {
        console.error(err);
        message.error(err?.message || "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    },
    [filterType, filterHead, filterMethods, filterDates, pagination.pageSize],
  );

  useEffect(() => {
    fetchTransactions(1);
  }, [filterType, filterHead, filterMethods, filterDates]);

  // ── Form type change → filter heads ───────────────────────
  const handleFormTypeChange = (typeId) => {
    form.setFieldValue("head", undefined);
    const filtered = heads.filter(
      (h) => h.type?._id === typeId || h.type === typeId,
    );
    setFormHeads(filtered);
  };

  // ── Modal helpers ──────────────────────────────────────────
  const openCreateModal = () => {
    setEditingTxn(null);
    setFormHeads([]);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingTxn(record);
    const typeId = record.type?._id;
    const filtered = heads.filter(
      (h) => h.type?._id === typeId || h.type === typeId,
    );
    setFormHeads(filtered);
    form.setFieldsValue({
      name: record.name,
      type: typeId,
      head: record.head?._id,
      paymentMethod: record.paymentMethod?._id,
      paymentDate: dayjs(record.paymentDate),
      amount: record.amount,
      billReference: record.billReference,
      details: record.details,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTxn(null);
    setFormHeads([]);
    form.resetFields();
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      const payload = {
        ...values,
        paymentDate: formatDateOnlyForApi(values.paymentDate),
      };

      if (editingTxn) {
        const res = await updateTransaction(editingTxn._id, payload);
        if (res?.success) {
          message.success("Transaction updated");
          closeModal();
          fetchTransactions(pagination.current);
        } else message.error(res?.message || "Update failed");
      } else {
        const res = await createTransaction(payload);
        if (res?.success) {
          message.success("Transaction created");
          closeModal();
          fetchTransactions(1);
        } else message.error(res?.message || "Creation failed");
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
      const res = await deleteTransaction(id);
      if (res?.success) {
        message.success("Transaction deleted and balance reversed");
        fetchTransactions(pagination.current);
      } else message.error(res?.message || "Delete failed");
    } catch (err) {
      message.error(err?.message || "Delete failed");
    }
  };
  // ── Export helpers ───────────────────────────────────────────
  const openExportAction = async (action, typeKey) => {
    const typeLabel =
      typeKey === "all" ? "All" : typeKey === "income" ? "Income" : "Expense";
    setExportLoading(true);
    try {
      const params = { page: 1, limit: 10000 };
      if (filterHead) params.head = filterHead;
      if (filterMethods.length) params.paymentMethod = filterMethods.join(",");
      if (filterDates?.[0]) params.dateFrom = filterDates[0].toISOString();
      if (filterDates?.[1]) params.dateTo = filterDates[1].toISOString();
      if (typeKey === "income") {
        const t = types.find((x) => x.name === "Income");
        if (t) params.type = t._id;
      } else if (typeKey === "expense") {
        const t = types.find((x) => x.name === "Expense");
        if (t) params.type = t._id;
      } else if (filterType) {
        params.type = filterType;
      }
      const res = await getTransactions(params);
      const rows = res?.success ? res.data : [];
      if (action === "preview") {
        setExportData(rows);
        setPreviewTitle(`Transactions — ${typeLabel}`);
        setPreviewVisible(true);
      } else if (action === "csv") {
        doExportCSV(rows, typeLabel);
      } else {
        doExportPDF(rows, typeLabel);
      }
    } catch {
      message.error("Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const doExportCSV = (rows, typeLabel) => {
    const header = [
      "Txn No",
      "Name",
      "Type",
      "Head",
      "Account",
      "Date",
      "Amount",
      "Bill Ref",
    ];
    const body = rows.map((r) => [
      r.transactionNo || "",
      `"${r.name || ""}"
`,
      r.type?.name || "",
      r.head?.name || "",
      r.paymentMethod?.name || "",
      r.paymentDate ? dayjs(r.paymentDate).format("DD MMM YYYY") : "",
      r.amount || 0,
      r.billReference || "",
    ]);
    const totalIn = rows
      .filter((r) => r.type?.name === "Income")
      .reduce((s, r) => s + r.amount, 0);
    const totalOut = rows
      .filter((r) => r.type?.name === "Expense")
      .reduce((s, r) => s + r.amount, 0);
    const csv = [
      header,
      ...body,
      [],
      ["", "", "", "", "", "Total Income", totalIn, ""],
      ["", "", "", "", "", "Total Expense", totalOut, ""],
      ["", "", "", "", "", "Net Balance", totalIn - totalOut, ""],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transactions_${typeLabel}_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doExportPDF = async (rows, typeLabel) => {
    try {
      // Load logo
      let logoDataUrl = null;
      try {
        const response = await fetch(odysseyLogo);
        const blob = await response.blob();
        logoDataUrl = await new Promise((res) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => res(reader.result);
        });
      } catch (err) {
        console.warn("Could not load academy logo:", err);
      }

      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.width;

      // Header with Institution Branding
      doc.setFillColor(20, 45, 120);
      doc.rect(0, 0, pageWidth, 50, "F");

      // Add logo
      if (logoDataUrl) {
        const logoSize = 20;
        const logoX = 14;
        const logoY = 15;
        doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
      }

      // Academy info
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("ODYSSEY ACADEMY KHIPRO", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Transactions Report", pageWidth / 2, 28, { align: "center" });

      doc.setFontSize(8);
      doc.text(
        `Filter: ${typeLabel} | Generated: ${dayjs().format("DD MMM YYYY")}`,
        pageWidth / 2,
        35,
        { align: "center" }
      );

      const totalIn = rows
        .filter((r) => r.type?.name === "Income")
        .reduce((s, r) => s + r.amount, 0);
      const totalOut = rows
        .filter((r) => r.type?.name === "Expense")
        .reduce((s, r) => s + r.amount, 0);
      autoTable(doc, {
        startY: 40,
        head: [
          [
            "Txn No",
            "Name",
            "Type",
            "Head",
          "Account",
          "Date",
          "Amount (PKR)",
          "Bill Ref",
        ],
      ],
      body: rows.map((r) => [
        r.transactionNo || "",
        r.name || "",
        r.type?.name || "",
        r.head?.name || "",
        r.paymentMethod?.name || "",
        r.paymentDate ? dayjs(r.paymentDate).format("DD MMM YYYY") : "",
        formatCurrency(r.amount),
        r.billReference || "",
      ]),
      foot: [
        ["", "", "", "", "", "Total Income", formatCurrency(totalIn), ""],
        ["", "", "", "", "", "Total Expense", formatCurrency(totalOut), ""],
        [
          "",
          "",
          "",
          "",
          "",
          "Net Balance",
          formatCurrency(totalIn - totalOut),
          "",
        ],
      ],
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [1, 19, 76], textColor: [232, 252, 10] },
      footStyles: {
        fillColor: [240, 244, 255],
        textColor: [17, 24, 39],
        fontStyle: "bold",
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const row = rows[data.row.index];
          if (row?.type?.name === "Income")
            data.cell.styles.fillColor = [240, 253, 244];
          else data.cell.styles.fillColor = [255, 241, 242];
        }
      },
      columnStyles: { 6: { halign: "right" } },
    });
    doc.save(`Transactions_${typeLabel}_${dayjs().format("YYYY-MM-DD")}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      message.error("Failed to generate PDF report");
    }
  };
  // ── Table columns ──────────────────────────────────────────
  const columns = [
    {
      title: "Txn No",
      dataIndex: "transactionNo",
      key: "transactionNo",
      width: 140,
      render: (v) => <span className="font-mono text-xs text-muted">{v}</span>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (v) => <span className="font-semibold text-dark">{v}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (t) =>
        t?.name === "Income" ? (
          <Tag color="green" icon={<ArrowUpOutlined />}>
            Income
          </Tag>
        ) : (
          <Tag color="red" icon={<ArrowDownOutlined />}>
            Expense
          </Tag>
        ),
    },
    {
      title: "Head",
      dataIndex: "head",
      key: "head",
      render: (h) => <span className="text-sm">{h?.name || "—"}</span>,
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (m) => <span className="text-sm">{m?.name || "—"}</span>,
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (d) => (
        <span className="text-sm">
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (a, record) => (
        <span
          className={`font-bold ${
            record.type?.name === "Income" ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrency(a)}
        </span>
      ),
    },
    {
      title: "Bill Ref",
      dataIndex: "billReference",
      key: "billReference",
      render: (v) => <span className="text-muted text-xs">{v || "—"}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setDetailRecord(record);
                setDetailVisible(true);
              }}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this transaction?"
              description="This will reverse the balance on the payment method."
              onConfirm={() => handleDelete(record._id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Row color by type ──────────────────────────────────────
  const rowBg = (record) =>
    record.type?.name === "Income" ? "#f0fdf4" : "#fff1f2";

  return (
    <div className="p-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <TransactionOutlined style={{ color: "#E8FC0A", fontSize: 20 }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark m-0">Transactions</h2>
            <p className="text-muted text-sm m-0">Income & Expense entries</p>
          </div>
        </div>
        <Space>
          <Dropdown
            loading={exportLoading}
            menu={{
              items: [
                {
                  key: "preview-all",
                  label: "Preview All",
                  icon: <EyeOutlined />,
                },
                {
                  key: "preview-income",
                  label: "Preview Income Only",
                  icon: <EyeOutlined />,
                },
                {
                  key: "preview-expense",
                  label: "Preview Expense Only",
                  icon: <EyeOutlined />,
                },
                { type: "divider" },
                {
                  key: "csv-all",
                  label: "Export CSV — All",
                  icon: <FileTextOutlined />,
                },
                {
                  key: "csv-income",
                  label: "Export CSV — Income",
                  icon: <FileTextOutlined />,
                },
                {
                  key: "csv-expense",
                  label: "Export CSV — Expense",
                  icon: <FileTextOutlined />,
                },
                { type: "divider" },
                {
                  key: "pdf-all",
                  label: "Export PDF — All",
                  icon: <FilePdfOutlined />,
                },
                {
                  key: "pdf-income",
                  label: "Export PDF — Income",
                  icon: <FilePdfOutlined />,
                },
                {
                  key: "pdf-expense",
                  label: "Export PDF — Expense",
                  icon: <FilePdfOutlined />,
                },
              ],
              onClick: ({ key }) => {
                const [action, typeKey] = key.split("-");
                openExportAction(action, typeKey);
              },
            }}
          >
            <Button
              icon={<DownloadOutlined />}
              loading={exportLoading}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            >
              Export
            </Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{ backgroundColor: "#01134C", borderColor: "#01134C" }}
          >
            Add Transaction
          </Button>
        </Space>
      </div>

      {/* ── Summary Cards ─────────────────────────────────── */}
      <Row gutter={16} className="mb-5">
        <Col xs={24} sm={8}>
          <div className="bg-white rounded-xl shadow-soft p-5">
            <Statistic
              title={
                <span className="text-muted text-xs font-semibold">
                  TOTAL INCOME
                </span>
              }
              value={summary.totalIncome}
              precision={0}
              prefix={<ArrowUpOutlined className="text-green-500" />}
              valueStyle={{ color: "#16a34a", fontWeight: 700 }}
              formatter={(v) => formatCurrency(v)}
            />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="bg-white rounded-xl shadow-soft p-5">
            <Statistic
              title={
                <span className="text-muted text-xs font-semibold">
                  TOTAL EXPENSE
                </span>
              }
              value={summary.totalExpense}
              precision={0}
              prefix={<ArrowDownOutlined className="text-red-500" />}
              valueStyle={{ color: "#dc2626", fontWeight: 700 }}
              formatter={(v) => formatCurrency(v)}
            />
          </div>
        </Col>
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
                  NET BALANCE
                </span>
              }
              value={summary.netBalance}
              precision={0}
              prefix={<DollarOutlined style={{ color: "#fff" }} />}
              valueStyle={{
                color: summary.netBalance >= 0 ? "#fff" : "#fca5a5",
                fontWeight: 700,
              }}
              formatter={(v) => formatCurrency(v)}
            />
          </div>
        </Col>
      </Row>

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Select
          placeholder="All Types"
          allowClear
          style={{ width: 140 }}
          value={filterType}
          onChange={(v) => {
            setFilterType(v || null);
            setFilterHead(null);
          }}
        >
          {types.map((t) => (
            <Option key={t._id} value={t._id}>
              <Tag color={t.name === "Income" ? "green" : "red"}>{t.name}</Tag>
            </Option>
          ))}
        </Select>

        <Select
          placeholder="All Heads"
          allowClear
          style={{ width: 200 }}
          value={filterHead}
          onChange={(v) => setFilterHead(v || null)}
        >
          {heads
            .filter((h) => !filterType || h.type?._id === filterType)
            .map((h) => (
              <Option key={h._id} value={h._id}>
                {h.name}
              </Option>
            ))}
        </Select>

        <Select
          mode="multiple"
          placeholder="All Accounts"
          allowClear
          maxTagCount="responsive"
          style={{ minWidth: 180 }}
          value={filterMethods}
          onChange={(v) => setFilterMethods(v || [])}
        >
          {methods.map((m) => (
            <Option key={m._id} value={m._id}>
              {m.name}
            </Option>
          ))}
        </Select>

        <RangePicker
          onChange={(dates) =>
            setFilterDates(
              dates ? [dates[0].toDate(), dates[1].toDate()] : null,
            )
          }
          format="DD MMM YYYY"
        />

        <span className="text-muted text-sm ml-auto">
          {pagination.total} record{pagination.total !== 1 ? "s" : ""}
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
            dataSource={transactions}
            columns={columns}
            rowKey="_id"
            onRow={(record) => ({
              style: { backgroundColor: rowBg(record) },
            })}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page) => fetchTransactions(page),
              showSizeChanger: false,
            }}
          />
        )}
      </div>
      {/* ── Print Preview Modal ────────────────────────────────── */}
      <Modal
        title={
          <span style={{ color: "#01134C", fontWeight: 700 }}>
            {previewTitle}
          </span>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width="92vw"
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>,
          <Button
            key="csv"
            icon={<FileTextOutlined />}
            onClick={() =>
              doExportCSV(
                exportData,
                previewTitle.split("—")[1]?.trim() || "All",
              )
            }
            style={{ borderColor: "#01134C", color: "#01134C" }}
          >
            Export CSV
          </Button>,
          <Button
            key="pdf"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() =>
              doExportPDF(
                exportData,
                previewTitle.split("—")[1]?.trim() || "All",
              )
            }
            style={{ backgroundColor: "#01134C", borderColor: "#01134C" }}
          >
            Download PDF
          </Button>,
        ]}
        destroyOnClose
      >
        <Row gutter={12} className="mb-4">
          <Col span={8}>
            <div
              className="rounded-lg p-3 text-center"
              style={{ background: "#f0fdf4" }}
            >
              <div className="text-muted text-xs mb-1">Total Income</div>
              <div className="font-bold text-green-600 text-base">
                {formatCurrency(
                  exportData
                    .filter((r) => r.type?.name === "Income")
                    .reduce((s, r) => s + r.amount, 0),
                )}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div
              className="rounded-lg p-3 text-center"
              style={{ background: "#fff1f2" }}
            >
              <div className="text-muted text-xs mb-1">Total Expense</div>
              <div className="font-bold text-red-600 text-base">
                {formatCurrency(
                  exportData
                    .filter((r) => r.type?.name === "Expense")
                    .reduce((s, r) => s + r.amount, 0),
                )}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div
              className="rounded-lg p-3 text-center"
              style={{ background: "#01134C" }}
            >
              <div className="text-xs mb-1" style={{ color: "#E8FC0A" }}>
                Net Balance
              </div>
              <div className="font-bold text-white text-base">
                {formatCurrency(
                  exportData
                    .filter((r) => r.type?.name === "Income")
                    .reduce((s, r) => s + r.amount, 0) -
                    exportData
                      .filter((r) => r.type?.name === "Expense")
                      .reduce((s, r) => s + r.amount, 0),
                )}
              </div>
            </div>
          </Col>
        </Row>
        <Table
          dataSource={exportData}
          columns={columns}
          rowKey="_id"
          size="small"
          onRow={(record) => ({
            style: {
              backgroundColor:
                record.type?.name === "Income" ? "#f0fdf4" : "#fff1f2",
            },
          })}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}`,
          }}
          scroll={{ x: 900, y: 420 }}
        />
      </Modal>
      {/* ── Add / Edit Modal ──────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ color: "#01134C" }}>
            <TransactionOutlined />
            <span>{editingTxn ? "Edit Transaction" : "Add Transaction"}</span>
          </div>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editingTxn ? "Update" : "Create"}
        confirmLoading={submitLoading}
        okButtonProps={{
          style: { backgroundColor: "#01134C", borderColor: "#01134C" },
        }}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Name / Party"
            name="name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="e.g. Ahmed Khan — Tuition Fee" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Type"
                name="type"
                rules={[{ required: true, message: "Select type" }]}
              >
                <Select
                  placeholder="Income or Expense"
                  onChange={handleFormTypeChange}
                >
                  {types.map((t) => (
                    <Option key={t._id} value={t._id}>
                      <Tag color={t.name === "Income" ? "green" : "red"}>
                        {t.name}
                      </Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Head of Account"
                name="head"
                rules={[{ required: true, message: "Select head" }]}
              >
                <Select
                  placeholder="Select head"
                  disabled={formHeads.length === 0}
                >
                  {formHeads.map((h) => (
                    <Option key={h._id} value={h._id}>
                      {h.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Payment Method"
                name="paymentMethod"
                rules={[{ required: true, message: "Select account" }]}
              >
                <Select placeholder="Cash / Bank">
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
                label="Payment Date"
                name="paymentDate"
                rules={[{ required: true, message: "Select date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Amount (PKR)"
                name="amount"
                rules={[{ required: true, message: "Enter amount" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(v) => v.replace(/,/g, "")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bill / Voucher No" name="billReference">
                <Input placeholder="Optional reference" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Details / Notes" name="details">
            <TextArea
              rows={2}
              placeholder="Optional notes"
              maxLength={300}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Transaction Detail Modal ─────────────────────────── */}
      <Modal
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            Close
          </Button>,
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => {
              setDetailVisible(false);
              openEditModal(detailRecord);
            }}
            style={{
              background: "#01134C",
              borderColor: "#01134C",
              color: "#E8FC0A",
            }}
          >
            Edit
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2">
            <TransactionOutlined style={{ color: "#01134C", fontSize: 18 }} />
            <span style={{ color: "#01134C", fontWeight: 700 }}>
              Transaction Details
            </span>
            {detailRecord?.type?.name === "Income" ? (
              <Tag color="green" icon={<ArrowUpOutlined />}>
                Income
              </Tag>
            ) : (
              <Tag color="red" icon={<ArrowDownOutlined />}>
                Expense
              </Tag>
            )}
          </div>
        }
        width={560}
      >
        {detailRecord && (
          <div
            style={{
              background:
                detailRecord.type?.name === "Income" ? "#f0fdf4" : "#fff1f2",
              borderRadius: 8,
              padding: 16,
            }}
          >
            {/* Amount hero */}
            <div className="text-center mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                Amount
              </div>
              <div
                className="text-3xl font-bold"
                style={{
                  color:
                    detailRecord.type?.name === "Income"
                      ? "#16a34a"
                      : "#dc2626",
                }}
              >
                {formatCurrency(detailRecord.amount)}
              </div>
            </div>

            {/* Detail rows */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "Txn No", value: detailRecord.transactionNo },
                  { label: "Name", value: detailRecord.name },
                  { label: "Type", value: detailRecord.type?.name },
                  { label: "Head of Account", value: detailRecord.head?.name },
                  {
                    label: "Payment Method",
                    value: detailRecord.paymentMethod?.name,
                  },
                  {
                    label: "Payment Date",
                    value: detailRecord.paymentDate
                      ? dayjs(detailRecord.paymentDate).format("DD MMM YYYY")
                      : "—",
                  },
                  {
                    label: "Bill / Voucher No",
                    value: detailRecord.billReference || "—",
                  },
                  {
                    label: "Details / Notes",
                    value: detailRecord.details || "—",
                  },
                  {
                    label: "Created At",
                    value: detailRecord.createdAt
                      ? dayjs(detailRecord.createdAt).format(
                          "DD MMM YYYY, hh:mm A",
                        )
                      : "—",
                  },
                ].map(({ label, value }) => (
                  <tr key={label} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td
                      style={{
                        padding: "8px 4px",
                        width: 150,
                        color: "#6b7280",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "8px 4px",
                        fontSize: 13,
                        color: "#111827",
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Transactions;
