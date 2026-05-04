import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Tag,
  Select,
  DatePicker,
  Button,
  Dropdown,
  Modal,
  Space,
  Statistic,
  Row,
  Col,
  Empty,
  Tooltip,
  Alert,
} from "antd";
import {
  FileTextOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  DownloadOutlined,
  SwapOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { ScaleLoader } from "react-spinners";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import academyConfig from "../../../config/academyConfig";
import odysseyLogo from "../../../assets/images/logos/LOGO.png";
import {
  getPaymentMethods,
  getLedger,
} from "../../../services/accountingService";

const { Option } = Select;
const { RangePicker } = DatePicker;

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(v || 0);

// ── CSV export helper ──────────────────────────────────────────
const exportCSV = (rows, summaryData, label) => {
  const isMulti = rows.length > 0 && rows[0]?.accountName !== undefined;

  const header = isMulti
    ? ["Date", "Account", "Ref No", "Description", "In (PKR)", "Out (PKR)"]
    : [
        "Date",
        "Ref No",
        "Description",
        "In (PKR)",
        "Out (PKR)",
        "Balance (PKR)",
      ];

  const body = rows.map((r) =>
    isMulti
      ? [
          dayjs(r.date).format("DD MMM YYYY"),
          r.accountName || "",
          r.refNo || "",
          `"${r.description}"`,
          r.in || 0,
          r.out || 0,
        ]
      : [
          dayjs(r.date).format("DD MMM YYYY"),
          r.refNo || "",
          `"${r.description}"`,
          r.in || 0,
          r.out || 0,
          r.balance ?? "",
        ],
  );

  const summaryLines = isMulti
    ? [
        [],
        ["Total In", "", "", "", summaryData?.totalIn || 0, ""],
        ["Total Out", "", "", "", "", summaryData?.totalOut || 0],
        ["Combined Balance", "", "", "", "", summaryData?.totalCurrent || 0],
      ]
    : [
        [],
        ["Opening Balance", "", "", "", "", summaryData?.openingBalance || 0],
        ["Total In", "", "", summaryData?.totalIn || 0, "", ""],
        ["Total Out", "", "", "", summaryData?.totalOut || 0, ""],
        ["Closing Balance", "", "", "", "", summaryData?.closingBalance || 0],
      ];

  const csv = [header, ...body, ...summaryLines]
    .map((row) => row.join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ledger_${label}_${dayjs().format("YYYY-MM-DD")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── PDF export helper ────────────────────────────────────────────
const exportLedgerPDF = async (rows, summaryData, label) => {
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

    const isMulti = rows.length > 0 && rows[0]?.accountName !== undefined;
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
    doc.text(`Ledger — ${label}`, pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(8);
    doc.text(`Generated: ${dayjs().format("DD MMM YYYY")}`, pageWidth / 2, 35, {
      align: "center",
    });

    const head = isMulti
      ? [["Date", "Account", "Ref No", "Description", "In (PKR)", "Out (PKR)"]]
      : [
          [
            "Date",
            "Ref No",
            "Description",
            "In (PKR)",
            "Out (PKR)",
            "Balance (PKR)",
          ],
        ];

    const body = rows.map((r) =>
      isMulti
        ? [
            dayjs(r.date).format("DD MMM YYYY"),
            r.accountName || "",
            r.refNo || "",
            r.description || "",
            r.in > 0 ? formatCurrency(r.in) : "—",
            r.out > 0 ? formatCurrency(r.out) : "—",
          ]
        : [
          dayjs(r.date).format("DD MMM YYYY"),
          r.refNo || "",
          r.description || "",
          r.in > 0 ? formatCurrency(r.in) : "—",
          r.out > 0 ? formatCurrency(r.out) : "—",
          formatCurrency(r.balance),
        ],
  );

  const foot = isMulti
    ? [
        [
          "",
          "",
          "",
          "Totals",
          formatCurrency(summaryData?.totalIn),
          formatCurrency(summaryData?.totalOut),
        ],
      ]
    : [
        [
          "",
          "",
          "Opening Balance",
          "",
          "",
          formatCurrency(summaryData?.openingBalance),
        ],
        [
          "",
          "",
          "Totals",
          formatCurrency(summaryData?.totalIn),
          formatCurrency(summaryData?.totalOut),
          "",
        ],
        [
          "",
          "",
          "Closing Balance",
          "",
          "",
          formatCurrency(summaryData?.closingBalance),
        ],
      ];

  autoTable(doc, {
    startY: 40,
    head,
    body,
    foot,
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
        if (row?.typeName === "Income")
          data.cell.styles.fillColor = [240, 253, 244];
        else data.cell.styles.fillColor = [255, 241, 242];
      }
    },
  });
  doc.save(`Ledger_${label}_${dayjs().format("YYYY-MM-DD")}.pdf`);
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
};

const Ledger = () => {
  // ── State ──────────────────────────────────────────────────
  const [methods, setMethods] = useState([]);
  const [selectedMethods, setSelectedMethods] = useState([]); // [] = all
  const [dateRange, setDateRange] = useState(null);
  const [statement, setStatement] = useState([]);
  const [summary, setSummary] = useState(null); // single-account
  const [multiData, setMultiData] = useState(null); // multi-account aggregated
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [previewVisible, setPreviewVisible] = useState(false);

  // ── Load accounts — auto-select all ──────────────────────
  useEffect(() => {
    getPaymentMethods()
      .then((res) => {
        if (res?.success) {
          setMethods(res.data);
          setSelectedMethods(res.data.map((m) => m._id)); // all selected by default
        }
      })
      .catch(console.error)
      .finally(() => setMethodsLoading(false));
  }, []);

  // ── Fetch ledger(s) ────────────────────────────────────────
  const fetchLedger = useCallback(async () => {
    const targets = selectedMethods.length
      ? selectedMethods
      : methods.map((m) => m._id);
    if (!targets.length) return;
    const single = targets.length === 1;

    setLoading(true);
    setFetchError(null);
    try {
      const params = {};
      if (dateRange?.[0]) params.dateFrom = dateRange[0].toISOString();
      if (dateRange?.[1]) params.dateTo = dateRange[1].toISOString();

      const results = await Promise.all(
        targets.map((id) => getLedger(id, params)),
      );

      if (single) {
        const res = results[0];
        if (res?.success) {
          setStatement(res.data);
          setSummary(res.summary);
          setMultiData(null);
        } else {
          setFetchError(res?.message || "Failed to load ledger");
          setStatement([]);
          setSummary(null);
          setMultiData(null);
        }
      } else {
        // Build per-account data, annotate each entry with accountName/Type
        const perAccount = results.map((res, i) => {
          const m = methods.find((x) => x._id === targets[i]);
          return {
            accountId: targets[i],
            accountName: res?.summary?.accountName || m?.name || targets[i],
            accountType: res?.summary?.accountType || m?.type,
            currentBalance: res?.summary?.currentBalance || 0,
            entries: (res?.data || []).map((e) => ({
              ...e,
              accountName: res?.summary?.accountName || m?.name,
              accountType: res?.summary?.accountType || m?.type,
            })),
            summary: res?.summary,
          };
        });

        const merged = perAccount
          .flatMap((p) => p.entries)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        const totalIn = perAccount.reduce(
          (s, p) => s + (p.summary?.totalIn || 0),
          0,
        );
        const totalOut = perAccount.reduce(
          (s, p) => s + (p.summary?.totalOut || 0),
          0,
        );
        const totalCurrent = perAccount.reduce(
          (s, p) => s + (p.currentBalance || 0),
          0,
        );

        setStatement(merged);
        setSummary(null);
        setMultiData({
          totalIn,
          totalOut,
          netBalance: totalIn - totalOut,
          totalCurrent,
          perAccount,
        });
      }
    } catch (err) {
      const msg = err?.message || "Failed to load ledger.";
      setFetchError(msg);
      setStatement([]);
      setSummary(null);
      setMultiData(null);
    } finally {
      setLoading(false);
      setCurrentPage(1); // reset to page 1 on every new fetch
    }
  }, [selectedMethods, methods, dateRange]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Derived: single-account view?
  const isSingle =
    selectedMethods.length === 1 ||
    (selectedMethods.length === 0 && methods.length === 1);

  // ── Columns — dynamic: Account col when multi, Balance col when single ──
  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 115,
      render: (d) => (
        <span className="text-sm whitespace-nowrap">
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    ...(!isSingle
      ? [
          {
            title: "Account",
            dataIndex: "accountName",
            key: "accountName",
            width: 140,
            render: (v, record) => (
              <Tag color={record.accountType === "cash" ? "gold" : "blue"}>
                {v}
              </Tag>
            ),
          },
        ]
      : []),
    {
      title: "Ref No",
      dataIndex: "refNo",
      key: "refNo",
      width: 145,
      render: (v, record) => (
        <span className="font-mono text-xs flex items-center gap-1">
          {record.type === "transfer" && (
            <SwapOutlined className="text-blue-400" />
          )}
          {v || "—"}
        </span>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (v, record) => (
        <span className="text-sm">
          {v}
          {record.billReference && (
            <span className="text-muted text-xs ml-2">
              #{record.billReference}
            </span>
          )}
        </span>
      ),
    },
    {
      title: "In (PKR)",
      dataIndex: "in",
      key: "in",
      width: 130,
      align: "right",
      render: (v) =>
        v > 0 ? (
          <span className="font-semibold text-green-600">
            {formatCurrency(v)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      title: "Out (PKR)",
      dataIndex: "out",
      key: "out",
      width: 130,
      align: "right",
      render: (v) =>
        v > 0 ? (
          <span className="font-semibold text-red-500">
            {formatCurrency(v)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    ...(isSingle
      ? [
          {
            title: "Balance (PKR)",
            dataIndex: "balance",
            key: "balance",
            width: 145,
            align: "right",
            render: (v) => (
              <span
                className="font-bold"
                style={{ color: v >= 0 ? "#01134C" : "#dc2626" }}
              >
                {formatCurrency(v)}
              </span>
            ),
          },
        ]
      : []),
  ];

  const displayTotalIn = isSingle ? summary?.totalIn : multiData?.totalIn;
  const displayTotalOut = isSingle ? summary?.totalOut : multiData?.totalOut;
  const footerColSpan = isSingle ? 3 : 4; // extra col when Account column present

  // Paginated slice for display — running balance values are pre-computed for all rows
  const pagedStatement = statement.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="p-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileTextOutlined style={{ color: "#E8FC0A", fontSize: 20 }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark m-0">Ledger</h2>
            <p className="text-muted text-sm m-0">
              Bank &amp; cash statement with running balance
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Tooltip title="Refresh">
            <Button
              onClick={fetchLedger}
              loading={loading}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            >
              Refresh
            </Button>
          </Tooltip>
          {statement.length > 0 && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "preview",
                    label: "Preview / Print",
                    icon: <EyeOutlined />,
                  },
                  { type: "divider" },
                  {
                    key: "csv",
                    label: "Export CSV",
                    icon: <FileTextOutlined />,
                  },
                  {
                    key: "pdf",
                    label: "Export PDF",
                    icon: <FilePdfOutlined />,
                  },
                ],
                onClick: ({ key }) => {
                  const label = isSingle
                    ? summary?.accountName || "Account"
                    : "All-Accounts";
                  const data = statement;
                  const sumData = isSingle ? summary : multiData;
                  if (key === "preview") setPreviewVisible(true);
                  else if (key === "csv") exportCSV(data, sumData, label);
                  else exportLedgerPDF(data, sumData, label);
                },
              }}
            >
              <Button
                icon={<DownloadOutlined />}
                style={{ borderColor: "#01134C", color: "#01134C" }}
              >
                Export
              </Button>
            </Dropdown>
          )}
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft p-4 mb-5 flex flex-wrap gap-3 items-center">
        <Select
          mode="multiple"
          placeholder="All Accounts"
          allowClear
          maxTagCount="responsive"
          style={{ minWidth: 240 }}
          loading={methodsLoading}
          value={selectedMethods}
          onChange={(v) => setSelectedMethods(v || [])}
        >
          {methods.map((m) => (
            <Option key={m._id} value={m._id}>
              {m.name}{" "}
              <span className="text-muted text-xs">
                ({formatCurrency(m.currentBalance)})
              </span>
            </Option>
          ))}
        </Select>

        <RangePicker
          onChange={(dates) =>
            setDateRange(dates ? [dates[0].toDate(), dates[1].toDate()] : null)
          }
          format="DD MMM YYYY"
          allowClear
        />

        {statement.length > 0 && (
          <Tag
            className="ml-auto"
            style={{ fontSize: 13, padding: "2px 10px" }}
          >
            {statement.length} entr{statement.length !== 1 ? "ies" : "y"}
          </Tag>
        )}
      </div>

      {/* ── Error alert ─────────────────────────────────── */}
      {fetchError && (
        <Alert
          className="mb-5"
          type="error"
          showIcon
          message="Ledger load failed"
          description={fetchError}
          closable
          onClose={() => setFetchError(null)}
        />
      )}

      {/* ── Summary Cards ─────────────────────────────────── */}
      {!loading && (summary || multiData) && (
        <Row gutter={16} className="mb-5">
          {isSingle && summary ? (
            <>
              <Col xs={24} sm={6}>
                <div className="bg-white rounded-xl shadow-soft p-4">
                  <Statistic
                    title={
                      <span className="text-muted text-xs font-semibold">
                        OPENING BALANCE
                      </span>
                    }
                    value={summary.openingBalance}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: "#6b7280",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div className="bg-white rounded-xl shadow-soft p-4">
                  <Statistic
                    title={
                      <span className="text-muted text-xs font-semibold">
                        TOTAL IN
                      </span>
                    }
                    value={summary.totalIn}
                    prefix={<ArrowUpOutlined className="text-green-500" />}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: "#16a34a",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div className="bg-white rounded-xl shadow-soft p-4">
                  <Statistic
                    title={
                      <span className="text-muted text-xs font-semibold">
                        TOTAL OUT
                      </span>
                    }
                    value={summary.totalOut}
                    prefix={<ArrowDownOutlined className="text-red-500" />}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "#01134C" }}
                >
                  <Statistic
                    title={
                      <span
                        style={{
                          color: "#E8FC0A",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        CLOSING BALANCE
                      </span>
                    }
                    value={summary.closingBalance}
                    prefix={<DollarOutlined style={{ color: "#fff" }} />}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: summary.closingBalance >= 0 ? "#fff" : "#fca5a5",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
            </>
          ) : multiData ? (
            <>
              <Col xs={24} sm={8}>
                <div className="bg-white rounded-xl shadow-soft p-4">
                  <Statistic
                    title={
                      <span className="text-muted text-xs font-semibold">
                        TOTAL IN (ALL)
                      </span>
                    }
                    value={multiData.totalIn}
                    prefix={<ArrowUpOutlined className="text-green-500" />}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: "#16a34a",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="bg-white rounded-xl shadow-soft p-4">
                  <Statistic
                    title={
                      <span className="text-muted text-xs font-semibold">
                        TOTAL OUT (ALL)
                      </span>
                    }
                    value={multiData.totalOut}
                    prefix={<ArrowDownOutlined className="text-red-500" />}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "#01134C" }}
                >
                  <Statistic
                    title={
                      <span
                        style={{
                          color: "#E8FC0A",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        COMBINED BALANCE
                      </span>
                    }
                    value={multiData.totalCurrent}
                    prefix={<DollarOutlined style={{ color: "#fff" }} />}
                    formatter={(v) => formatCurrency(v)}
                    valueStyle={{
                      color: multiData.totalCurrent >= 0 ? "#fff" : "#fca5a5",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                </div>
              </Col>
              {/* Per-account balance chips */}
              {multiData.perAccount?.map((acc) => (
                <Col xs={24} sm={6} key={acc.accountId} className="mt-3">
                  <div className="bg-white rounded-xl shadow-soft p-3 flex items-center gap-2">
                    <Tag color={acc.accountType === "cash" ? "gold" : "blue"}>
                      {acc.accountType?.toUpperCase()}
                    </Tag>
                    <span className="font-semibold text-dark text-sm">
                      {acc.accountName}
                    </span>
                    <span
                      className="ml-auto font-bold"
                      style={{ color: "#01134C" }}
                    >
                      {formatCurrency(acc.currentBalance)}
                    </span>
                  </div>
                </Col>
              ))}
            </>
          ) : null}
        </Row>
      )}

      {/* ── Statement Table ────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {/* Account header strip */}
        {!loading && statement.length > 0 && (
          <div
            className="px-5 py-3 flex items-center gap-2 flex-wrap"
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <FileTextOutlined style={{ color: "#01134C" }} />
            {isSingle && summary ? (
              <>
                <span className="font-bold text-dark">
                  {summary.accountName}
                </span>
                <Tag color={summary.accountType === "cash" ? "gold" : "blue"}>
                  {summary.accountType?.toUpperCase()}
                </Tag>
                <span className="ml-auto text-muted text-sm">
                  Current balance:{" "}
                  <strong style={{ color: "#01134C" }}>
                    {formatCurrency(summary.currentBalance)}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <span className="font-bold text-dark mr-2">All Accounts</span>
                {multiData?.perAccount?.map((acc) => (
                  <Tag
                    key={acc.accountId}
                    color={acc.accountType === "cash" ? "gold" : "blue"}
                  >
                    {acc.accountName} — {formatCurrency(acc.currentBalance)}
                  </Tag>
                ))}
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <ScaleLoader color="#01134C" />
          </div>
        ) : statement.length === 0 ? (
          <Empty
            className="py-16"
            description="No transactions found for this period"
          />
        ) : (
          <Table
            dataSource={pagedStatement}
            columns={columns}
            rowKey={(r, i) => `${r._id}-${i}`}
            onRow={(record) => ({
              style: {
                backgroundColor:
                  record.typeName === "Income" ? "#f0fdf4" : "#fff1f2",
              },
            })}
            pagination={{
              current: currentPage,
              pageSize: PAGE_SIZE,
              total: statement.length,
              onChange: (page) => setCurrentPage(page),
              showSizeChanger: false,
              showTotal: (total, range) =>
                `${range[0]}–${range[1]} of ${total} entries`,
              style: { padding: "12px 16px" },
            }}
            scroll={{ x: 800 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ backgroundColor: "#f0f4ff" }}>
                  <Table.Summary.Cell index={0} colSpan={footerColSpan}>
                    <span className="font-bold text-dark">TOTAL</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell align="right">
                    <span className="font-bold text-green-600">
                      {formatCurrency(displayTotalIn)}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell align="right">
                    <span className="font-bold text-red-500">
                      {formatCurrency(displayTotalOut)}
                    </span>
                  </Table.Summary.Cell>
                  {isSingle && (
                    <Table.Summary.Cell align="right">
                      <span
                        className="font-bold"
                        style={{
                          color:
                            (summary?.closingBalance || 0) >= 0
                              ? "#01134C"
                              : "#dc2626",
                        }}
                      >
                        {formatCurrency(summary?.closingBalance)}
                      </span>
                    </Table.Summary.Cell>
                  )}
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </div>

      {/* ─── Preview / Print Modal ─────────────────────────────────── */}
      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        title={
          <span style={{ color: "#01134C", fontWeight: 700 }}>
            Ledger Preview &mdash;{" "}
            {isSingle ? summary?.accountName || "Account" : "All Accounts"}
          </span>
        }
        width="92vw"
        footer={
          <Space>
            <Button onClick={() => setPreviewVisible(false)}>Close</Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => {
                const label = isSingle
                  ? summary?.accountName || "Account"
                  : "All-Accounts";
                exportCSV(statement, isSingle ? summary : multiData, label);
              }}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            >
              Export CSV
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              type="primary"
              onClick={() => {
                const label = isSingle
                  ? summary?.accountName || "Account"
                  : "All-Accounts";
                exportLedgerPDF(
                  statement,
                  isSingle ? summary : multiData,
                  label,
                );
              }}
              style={{ background: "#01134C", borderColor: "#01134C" }}
            >
              Download PDF
            </Button>
          </Space>
        }
      >
        {/* Summary cards */}
        <Row gutter={16} className="mb-4">
          {isSingle ? (
            <>
              <Col span={6}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#f0fdf4" }}
                >
                  <div className="text-xs text-gray-500">Opening Balance</div>
                  <div className="font-bold" style={{ color: "#01134C" }}>
                    {formatCurrency(summary?.openingBalance)}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#f0fdf4" }}
                >
                  <div className="text-xs text-gray-500">Total In</div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(summary?.totalIn)}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#fff1f2" }}
                >
                  <div className="text-xs text-gray-500">Total Out</div>
                  <div className="font-bold text-red-500">
                    {formatCurrency(summary?.totalOut)}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#eff6ff" }}
                >
                  <div className="text-xs text-gray-500">Closing Balance</div>
                  <div
                    className="font-bold"
                    style={{
                      color:
                        (summary?.closingBalance || 0) >= 0
                          ? "#01134C"
                          : "#dc2626",
                    }}
                  >
                    {formatCurrency(summary?.closingBalance)}
                  </div>
                </div>
              </Col>
            </>
          ) : (
            <>
              <Col span={8}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#f0fdf4" }}
                >
                  <div className="text-xs text-gray-500">
                    Total In (All Accounts)
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(multiData?.totalIn)}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#fff1f2" }}
                >
                  <div className="text-xs text-gray-500">
                    Total Out (All Accounts)
                  </div>
                  <div className="font-bold text-red-500">
                    {formatCurrency(multiData?.totalOut)}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div
                  className="rounded p-3 text-center"
                  style={{ background: "#eff6ff" }}
                >
                  <div className="text-xs text-gray-500">Net</div>
                  <div
                    className="font-bold"
                    style={{
                      color:
                        (multiData?.totalIn || 0) -
                          (multiData?.totalOut || 0) >=
                        0
                          ? "#01134C"
                          : "#dc2626",
                    }}
                  >
                    {formatCurrency(
                      (multiData?.totalIn || 0) - (multiData?.totalOut || 0),
                    )}
                  </div>
                </div>
              </Col>
            </>
          )}
        </Row>

        {/* Full statement table */}
        <Table
          size="small"
          rowKey={(_, i) => `prev-${i}`}
          dataSource={statement}
          scroll={{ x: 900, y: 420 }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          columns={[
            {
              title: "Date",
              dataIndex: "date",
              width: 100,
              render: (v) => dayjs(v).format("DD MMM YYYY"),
            },
            ...(!isSingle
              ? [{ title: "Account", dataIndex: "accountName", width: 130 }]
              : []),
            { title: "Ref No", dataIndex: "refNo", width: 100 },
            { title: "Description", dataIndex: "description", ellipsis: true },
            {
              title: "In (PKR)",
              dataIndex: "in",
              width: 110,
              align: "right",
              render: (v) =>
                v > 0 ? (
                  <span className="text-green-600 font-medium">
                    {formatCurrency(v)}
                  </span>
                ) : (
                  <span className="text-gray-300">&mdash;</span>
                ),
            },
            {
              title: "Out (PKR)",
              dataIndex: "out",
              width: 110,
              align: "right",
              render: (v) =>
                v > 0 ? (
                  <span className="text-red-500 font-medium">
                    {formatCurrency(v)}
                  </span>
                ) : (
                  <span className="text-gray-300">&mdash;</span>
                ),
            },
            ...(isSingle
              ? [
                  {
                    title: "Balance (PKR)",
                    dataIndex: "balance",
                    width: 120,
                    align: "right",
                    render: (v) => (
                      <span
                        style={{
                          color: v >= 0 ? "#01134C" : "#dc2626",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(v)}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
          onRow={(record) => ({
            style: {
              background: record.typeName === "Income" ? "#f0fdf4" : "#fff1f2",
            },
          })}
        />
      </Modal>
    </div>
  );
};

export default Ledger;
