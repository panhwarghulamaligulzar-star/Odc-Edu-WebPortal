import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Modal,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  SearchOutlined,
  DollarOutlined,
  EyeOutlined,
  FilterOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  getAllFeeStructures,
  getStudentFeeStructures,
} from "../../services/feeService";
import FeePaymentForm from "../forms/FeePaymentForm";
import { recordFeePayment } from "../../services/feeService";
import { MdPayment } from "react-icons/md";

const FeeManagement = () => {
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [summary, setSummary] = useState({
    totalFeeAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
  });

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchFeeStructures();
  }, [pagination.current, statusFilter]);

  const fetchFeeStructures = async () => {
    setLoading(true);
    try {
      const filters = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (statusFilter) filters.feeStatus = statusFilter;

      const response = await getAllFeeStructures(filters);
      if (response.success) {
        setFeeStructures(response.data);
        setSummary(response.summary);
        setPagination({
          ...pagination,
          total: response.pagination.total,
        });
      }
    } catch (error) {
      message.error("Failed to fetch fee structures");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = (record) => {
    setSelectedRecord(record);
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async (paymentData) => {
    setPaymentLoading(true);
    try {
      const response = await recordFeePayment(paymentData);
      if (response.success) {
        message.success("Payment recorded successfully!");
        setPaymentModalVisible(false);
        setSelectedRecord(null);
        fetchFeeStructures();
      }
    } catch (error) {
      message.error(error.message || "Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  const columns = [
    {
      title: "Student",
      dataIndex: ["student", "studentName"],
      key: "studentName",
      render: (text, record) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-xs opacity-50">
            {record.student?.registrationNo}
          </div>
        </div>
      ),
      filteredValue: [searchText],
      onFilter: (value, record) => {
        return (
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
      title: "Mobile",
      dataIndex: ["student", "mobileNumber"],
      key: "mobile",
    },
    {
      title: "Course",
      dataIndex: ["course", "courseName"],
      key: "courseName",
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div className="text-xs opacity-50">{record.course?.courseId}</div>
        </div>
      ),
    },
    {
      title: "Total Fee",
      dataIndex: "totalFee",
      key: "totalFee",
      render: (fee) => (
        <span className="font-semibold">Rs {fee?.toLocaleString()}</span>
      ),
      sorter: (a, b) => a.totalFee - b.totalFee,
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (amount) => (
        <span className="text-green-600 font-semibold">
          Rs {amount?.toLocaleString()}
        </span>
      ),
      sorter: (a, b) => a.paidAmount - b.paidAmount,
    },
    {
      title: "Remaining",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      render: (amount) => (
        <span className="text-red-600 font-semibold">
          Rs {amount?.toLocaleString()}
        </span>
      ),
      sorter: (a, b) => a.remainingAmount - b.remainingAmount,
    },
    {
      title: "Status",
      dataIndex: "feeStatus",
      key: "feeStatus",
      render: (status) => {
        const colors = {
          Paid: "green",
          Partial: "orange",
          Unpaid: "red",
          Overdue: "volcano",
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: "Installments",
      dataIndex: "installmentEnabled",
      key: "installments",
      render: (enabled, record) => {
        if (!enabled) return <Tag>No</Tag>;

        const paid =
          record.installments?.filter((i) => i.status === "Paid").length || 0;
        const total = record.numberOfInstallments || 0;

        return (
          <Tag color="blue">
            {paid}/{total}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => handleRecordPayment(record)}
            disabled={record.feeStatus === "Paid"}
          >
            Pay
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              /* View details */
            }}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "#01134C" }}
        >
          <MdPayment size={22} style={{ color: "#E8FC0A" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
            Fee Management
          </h2>
          <p className="text-sm m-0" style={{ color: "#6b7280" }}>
            Student fee records & payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Fee Amount"
              value={summary.totalFeeAmount}
              prefix="Rs"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Paid"
              value={summary.totalPaidAmount}
              prefix="Rs"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Remaining"
              value={summary.totalRemainingAmount}
              prefix="Rs"
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Space className="w-full justify-between">
          <Space>
            <Input
              placeholder="Search by student name or reg no"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Select.Option value="Unpaid">Unpaid</Select.Option>
              <Select.Option value="Partial">Partial</Select.Option>
              <Select.Option value="Paid">Paid</Select.Option>
              <Select.Option value="Overdue">Overdue</Select.Option>
            </Select>
          </Space>
          <Button icon={<FileTextOutlined />}>Export Report</Button>
        </Space>
      </Card>

      {/* Fee Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={feeStructures}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} records`,
          }}
          onChange={(newPagination) => setPagination(newPagination)}
        />
      </Card>

      {/* Payment Modal */}
      <Modal
        title="Record Fee Payment"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width={900}
      >
        {selectedRecord && (
          <FeePaymentForm
            student={selectedRecord.student}
            course={selectedRecord.course}
            feeStructure={selectedRecord}
            loading={paymentLoading}
            onSubmit={handlePaymentSubmit}
          />
        )}
      </Modal>
    </div>
  );
};

export default FeeManagement;
