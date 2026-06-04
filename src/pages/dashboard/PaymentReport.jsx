import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Tag,
  message,
  Input,
} from "antd";
import {
  DollarOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { getAllPayments, getCourses } from "../../services/feeService";
import dayjs from "dayjs";
import { MdAssessment } from "react-icons/md";

const { RangePicker } = DatePicker;

const PaymentReport = () => {
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    status: null,
    courseId: null,
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchPayments();
    fetchCourses();
  }, [pagination.current, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      };

      const response = await getAllPayments(params);
      if (response.success) {
        setPayments(response.data);
        setTotalAmount(response.totalAmount || 0);
        setPagination({
          ...pagination,
          total: response.pagination.total,
        });
      }
    } catch (error) {
      message.error("Failed to fetch payments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters({
        ...filters,
        startDate: dates[0].toISOString(),
        endDate: dates[1].toISOString(),
      });
    } else {
      setFilters({
        ...filters,
        startDate: null,
        endDate: null,
      });
    }
    setPagination({ ...pagination, current: 1 });
  };

  const handleStatusChange = (status) => {
    setFilters({ ...filters, status });
    setPagination({ ...pagination, current: 1 });
  };

  const handleCourseChange = (courseId) => {
    setFilters({ ...filters, courseId });
    setPagination({ ...pagination, current: 1 });
  };

  const handleExport = (type) => {
    message.info(`Exporting to ${type.toUpperCase()}...`);
    // Implement export functionality
  };

  const columns = [
    {
      title: "Receipt No",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (text) => (
        <span className="font-mono text-xs font-semibold">{text}</span>
      ),
      filteredValue: [searchText],
      onFilter: (value, record) => {
        return (
          record.receiptNo?.toLowerCase().includes(value.toLowerCase()) ||
          record.voucherNo?.toLowerCase().includes(value.toLowerCase()) ||
          record.student?.studentName
            ?.toLowerCase()
            .includes(value.toLowerCase()) ||
          record.student?.registrationNo
            ?.toLowerCase()
            .includes(value.toLowerCase())
        );
      },
    },
    {
      title: "Voucher No",
      dataIndex: "voucherNo",
      key: "voucherNo",
      render: (text) => (
        <span className="font-mono text-xs font-semibold text-blue-600">
          {text || "-"}
        </span>
      ),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (date) => new Date(date).toLocaleDateString("en-GB"),
      sorter: (a, b) => new Date(a.paymentDate) - new Date(b.paymentDate),
      defaultSortOrder: "descend",
    },
    {
      title: "Student",
      dataIndex: ["student", "studentName"],
      key: "student",
      render: (text, record) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-xs opacity-50">
            {record.student?.registrationNo}
          </div>
        </div>
      ),
    },
    {
      title: "Mobile",
      dataIndex: ["student", "mobileNumber"],
      key: "mobile",
    },
    {
      title: "Course",
      dataIndex: ["course", "courseName"],
      key: "course",
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div className="text-xs opacity-50">{record.course?.courseId}</div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span className="font-bold text-green-600 text-base">
          Rs {amount?.toLocaleString()}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method) => <Tag color="blue">{method}</Tag>,
      filters: [
        { text: "Cash", value: "Cash" },
        { text: "Bank Transfer", value: "Bank Transfer" },
        { text: "Online", value: "Online" },
        { text: "Cheque", value: "Cheque" },
        { text: "Other", value: "Other" },
      ],
    },
    {
      title: "Transaction ID",
      dataIndex: "transactionId",
      key: "transactionId",
      render: (text) =>
        text ? <span className="text-xs font-mono">{text}</span> : "-",
    },
    {
      title: "Installment",
      dataIndex: "installmentNumber",
      key: "installmentNumber",
      render: (num) => (num ? <Tag>#{num}</Tag> : "-"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colors = {
          Completed: "green",
          Pending: "orange",
          Failed: "red",
          Refunded: "purple",
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
      filters: [
        { text: "Completed", value: "Completed" },
        { text: "Pending", value: "Pending" },
        { text: "Failed", value: "Failed" },
        { text: "Refunded", value: "Refunded" },
      ],
    },
  ];

  // Calculate statistics for current filtered data
  const completedPayments = payments.filter((p) => p.status === "Completed");
  const completedAmount = completedPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const pendingAmount = payments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdAssessment size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="module-title">Payment Report</h2>
            <p className="module-subtitle">
              Financial payment records
            </p>
          </div>
        </div>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => handleExport("excel")}
          >
            Export Excel
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => handleExport("pdf")}
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={payments.length}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={totalAmount}
              prefix="Rs"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedAmount}
              prefix="Rs"
              suffix={`(${completedPayments.length})`}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingAmount}
              prefix="Rs"
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Space wrap className="w-full">
          <Input
            placeholder="Search receipt, student name or reg no"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />

          <RangePicker
            onChange={handleDateRangeChange}
            format="DD-MM-YYYY"
            style={{ width: 280 }}
          />

          <Select
            placeholder="Filter by Course"
            style={{ width: 200 }}
            onChange={handleCourseChange}
            value={filters.courseId}
            allowClear
          >
            {courses.map((course) => (
              <Select.Option key={course._id} value={course._id}>
                {course.courseName}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            onChange={handleStatusChange}
            value={filters.status}
            allowClear
          >
            <Select.Option value="Completed">Completed</Select.Option>
            <Select.Option value="Pending">Pending</Select.Option>
            <Select.Option value="Failed">Failed</Select.Option>
            <Select.Option value="Refunded">Refunded</Select.Option>
          </Select>

          <Button
            icon={<FilterOutlined />}
            onClick={() => {
              setFilters({
                startDate: null,
                endDate: null,
                status: null,
                courseId: null,
              });
              setSearchText("");
              setPagination({ ...pagination, current: 1 });
            }}
          >
            Clear Filters
          </Button>
        </Space>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payments`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(newPagination) => setPagination(newPagination)}
          scroll={{ x: 1200 }}
          expandable={{
            expandedRowRender: (record) => (
              <div className="p-4 bg-gray-50">
                <Row gutter={16}>
                  {record.chequeNo && (
                    <Col span={8}>
                      <p className="text-xs opacity-60">Cheque No</p>
                      <p className="font-semibold">{record.chequeNo}</p>
                    </Col>
                  )}
                  {record.bankName && (
                    <Col span={8}>
                      <p className="text-xs opacity-60">Bank Name</p>
                      <p className="font-semibold">{record.bankName}</p>
                    </Col>
                  )}
                  {record.remarks && (
                    <Col span={24}>
                      <p className="text-xs opacity-60 mt-2">Voucher Number</p>
                      <p>{record.remarks}</p>
                    </Col>
                  )}
                </Row>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default PaymentReport;
