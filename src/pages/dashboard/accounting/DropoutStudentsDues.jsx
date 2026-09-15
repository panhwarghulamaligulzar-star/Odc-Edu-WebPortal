import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
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
  ArrowLeftOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserDeleteOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getDropoutStudentDuesOverview } from "../../../services/accountingService";
import { getAllBatches } from "../../../services/batchService";
import { getCourses } from "../../../services/feeService";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const formatCurrency = (value) =>
  `Rs ${Math.round(value || 0).toLocaleString("en-PK")}`;

const statusColor = {
  Paid: "green",
  Partial: "blue",
  Pending: "orange",
};

export default function DropoutStudentsDues() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    courseId: undefined,
    batchId: undefined,
    dueDateFrom: undefined,
    dueDateTo: undefined,
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    loadBootData();
  }, []);

  useEffect(() => {
    fetchDropoutDues();
  }, [filters, pagination.current, pagination.pageSize]);

  const loadBootData = async () => {
    try {
      const [courseResponse, batchResponse] = await Promise.all([
        getCourses(),
        getAllBatches(),
      ]);
      if (courseResponse?.success) setCourses(courseResponse.data || []);
      if (batchResponse?.success) setBatches(batchResponse.data || []);
    } catch (error) {
      console.error("Failed to load filters:", error);
    }
  };

  const fetchDropoutDues = async () => {
    setLoading(true);
    try {
      const response = await getDropoutStudentDuesOverview({
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize,
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
      message.error(error?.message || "Failed to load dropout student dues");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleMonthRangeChange = (dates) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({
      ...prev,
      dueDateFrom: dates?.[0] ? dates[0].startOf("month").toISOString() : undefined,
      dueDateTo: dates?.[1] ? dates[1].endOf("month").toISOString() : undefined,
    }));
  };

  const batchOptions = useMemo(
    () =>
      batches
        .filter(
          (batch) =>
            !filters.courseId ||
            String(batch.course?._id || batch.course || "") === String(filters.courseId),
        )
        .map((batch) => ({
          label: `${batch.batchName || batch.batchCode || "Batch"}${
            batch.batchCode ? ` (${batch.batchCode})` : ""
          }`,
          value: batch._id,
        })),
    [batches, filters.courseId],
  );

  const metricCards = [
    {
      title: "Dropout Students",
      value: summary.dropoutStudentCount || 0,
      icon: <UserDeleteOutlined />,
      color: "#be123c",
      bg: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
    },
    {
      title: "Pending Amount",
      value: formatCurrency(summary.remaining || 0),
      icon: <ClockCircleOutlined />,
      color: "#b45309",
      bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    },
    {
      title: "Paid Amount",
      value: formatCurrency(summary.collected || 0),
      icon: <WalletOutlined />,
      color: "#0f766e",
      bg: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    },
    {
      title: "Installments",
      value: summary.installmentCount || 0,
      icon: <BarChartOutlined />,
      color: "#142d78",
      bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    },
  ];

  const columns = [
    {
      title: "Student",
      key: "student",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-900">
            {record.student?.studentName || "Student"}
          </div>
          <div className="text-xs text-slate-500">
            {record.student?.registrationNo || "No reg no"} |{" "}
            {record.student?.mobileNumber || "No mobile"}
          </div>
        </div>
      ),
    },
    {
      title: "Course / Batch",
      key: "courseBatch",
      render: (_, record) => (
        <div className="space-y-1">
          <div className="text-sm text-slate-700">
            {record.courses?.map((course) => course?.courseName).filter(Boolean).join(", ") ||
              "-"}
          </div>
          <div className="text-xs text-slate-500">
            {record.batches?.map((batch) => batch?.batchName || batch?.batchCode).filter(Boolean).join(", ") ||
              "No batch"}
          </div>
        </div>
      ),
    },
    {
      title: "Dropout Date",
      dataIndex: "latestDropoutDate",
      key: "latestDropoutDate",
      render: (value) => (value ? dayjs(value).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Installments",
      key: "installments",
      align: "center",
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag color="green">Paid {record.paidCount || 0}</Tag>
          <Tag color="blue">Partial {record.partialCount || 0}</Tag>
          <Tag color="orange">Pending {record.pendingCount || 0}</Tag>
        </Space>
      ),
    },
    {
      title: "Total",
      dataIndex: "totalDues",
      key: "totalDues",
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Paid",
      dataIndex: "collected",
      key: "collected",
      align: "right",
      render: (value) => (
        <span className="font-semibold text-emerald-700">{formatCurrency(value)}</span>
      ),
    },
    {
      title: "Remaining",
      dataIndex: "remaining",
      key: "remaining",
      align: "right",
      render: (value) => (
        <span className="font-semibold text-amber-700">{formatCurrency(value)}</span>
      ),
    },
  ];

  const expandedRowRender = (record) => (
    <Table
      rowKey="_id"
      size="small"
      pagination={false}
      dataSource={record.rows || []}
      columns={[
        {
          title: "Installment",
          key: "installment",
          render: (_, row) => (
            <div>
              <div className="font-medium">{row.description || "Installment"}</div>
              <div className="text-xs text-slate-500">
                {row.installmentNumber ? `Inst #${row.installmentNumber}` : "Full fee"}
              </div>
            </div>
          ),
        },
        {
          title: "Due Date",
          dataIndex: "dueDate",
          key: "dueDate",
          render: (value) => (value ? dayjs(value).format("DD MMM YYYY") : "-"),
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
          render: (value) => formatCurrency(value),
        },
        {
          title: "Remaining",
          dataIndex: "remainingAmount",
          key: "remainingAmount",
          align: "right",
          render: (value) => formatCurrency(value),
        },
        {
          title: "Status",
          dataIndex: "dueStatus",
          key: "dueStatus",
          render: (status) => <Tag color={statusColor[status] || "default"}>{status}</Tag>,
        },
        {
          title: "Receipt / Voucher",
          key: "receipt",
          render: (_, row) => row.receiptNo || row.voucherNo || <Text type="secondary">-</Text>,
        },
      ]}
    />
  );

  return (
    <div className="w-full space-y-5">
      <div
        className="rounded-[28px] border border-[#f3c3ca] p-5 md:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,247,247,0.98) 0%, rgba(255,241,242,0.96) 55%, rgba(248,251,255,0.98) 100%)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
              style={{
                background: "linear-gradient(135deg, #be123c 0%, #142d78 100%)",
              }}
            >
              <UserDeleteOutlined />
            </div>
            <div>
              <h2 className="module-title !mb-1">Dropout Student Dues</h2>
              <p className="module-subtitle !mb-0 max-w-[680px]">
                Track dues, paid installments, partial payments, and pending balances for students
                marked as dropout.
              </p>
            </div>
          </div>
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/dashboard/accounting/receipt")}
              className="!h-11 !rounded-xl"
            >
              Back to Receipts
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchDropoutDues}
              className="!h-11 !rounded-xl"
            >
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={[18, 18]}>
        {metricCards.map((card) => (
          <Col xs={24} md={12} xl={6} key={card.title}>
            <Card
              bordered={false}
              style={{
                background: card.bg,
                borderRadius: 22,
                border: "1px solid #edf1f7",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <Statistic
                  title={<span className="text-slate-500">{card.title}</span>}
                  value={card.value}
                  valueStyle={{ color: card.color, fontWeight: 700 }}
                />
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                  style={{ background: "#ffffff", color: card.color }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

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
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <FilterOutlined style={{ color: "#142d78" }} />
              Filter Dropout Records
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Filter by student, course, batch, installment status, or due month range.
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
                batchId: undefined,
                dueDateFrom: undefined,
                dueDateTo: undefined,
                sortOrder: "desc",
              });
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Input
            allowClear
            placeholder="Search student, reg no, course, batch"
            prefix={<SearchOutlined />}
            className="!h-11 !rounded-xl"
            value={filters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
          />
          <Select
            allowClear
            showSearch
            placeholder="All courses"
            className="!h-11"
            value={filters.courseId}
            onChange={(value) => {
              handleFilterChange("courseId", value);
              handleFilterChange("batchId", undefined);
            }}
            options={courses.map((course) => ({
              label: course.courseName,
              value: course._id,
            }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="All batches"
            className="!h-11"
            value={filters.batchId}
            onChange={(value) => handleFilterChange("batchId", value)}
            options={batchOptions}
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
            picker="month"
            format="MMM YYYY"
            placeholder={["Starting month", "Ending month"]}
            className="!h-11 !rounded-xl"
            value={[
              filters.dueDateFrom ? dayjs(filters.dueDateFrom) : null,
              filters.dueDateTo ? dayjs(filters.dueDateTo) : null,
            ]}
            onChange={handleMonthRangeChange}
          />
          <Select
            className="!h-11"
            value={filters.sortOrder}
            onChange={(value) => handleFilterChange("sortOrder", value)}
            options={[
              { label: "Latest Dropout First", value: "desc" },
              { label: "Oldest Dropout First", value: "asc" },
            ]}
          />
        </div>
      </Card>

      <Card
        title="Dropout Student Detail"
        extra={<Text type="secondary">{pagination.total || 0} dropout students</Text>}
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          expandable={{ expandedRowRender }}
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
            emptyText: <Empty description="No dropout student dues found" />,
          }}
          scroll={{ x: 1200 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <span className="font-semibold">
                  Total ({summary.dropoutStudentCount || 0} students,{" "}
                  {summary.installmentCount || 0} installments)
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <span className="font-semibold">{formatCurrency(summary.totalDues)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(summary.collected)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <span className="font-semibold text-amber-700">
                  {formatCurrency(summary.remaining)}
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Row gutter={[0, 0]} className="border border-[#d6d3d1]">
        {[
          ["Paid", summary.paidCount || 0, <CheckCircleOutlined />],
          ["Partial", summary.partialCount || 0, <BarChartOutlined />],
          ["Pending", summary.pendingCount || 0, <ClockCircleOutlined />],
        ].map(([label, count, icon]) => (
          <Col xs={24} md={8} key={label}>
            <div className="flex items-center justify-center gap-2 px-6 py-4 text-center">
              <span>{icon}</span>
              <span className="font-semibold">{label}</span>
              <Tag color={statusColor[label]}>{count}</Tag>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}
