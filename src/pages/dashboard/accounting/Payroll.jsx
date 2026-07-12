import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  DatePicker,
  Input,
  InputNumber,
  Select,
  message,
  Space,
  Statistic,
} from "antd";
import dayjs from "dayjs";
import {
  getTeacherPayroll,
  getPaymentMethods,
  payTeacherPayroll,
} from "../../../services/accountingService";
import { canViewAccountingBalances } from "../../../utils/accountingAccess";

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [form] = Form.useForm();

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await getTeacherPayroll({ page: 1, limit: 50 });
      if (res?.success) {
        setPayrollData(res.data || []);
      }
    } catch (error) {
      message.error(error.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
    getPaymentMethods().then((res) => {
      if (res?.success) setPaymentMethods(res.data || []);
    });
  }, []);

  const openPaymentModal = (record) => {
    setSelectedRecord(record);
    form.setFieldsValue({
      paymentDate: dayjs(),
      amount: record.payroll.remainingAmount || 0,
      paymentMethodId: paymentMethods.find((m) => m.isDefault)?._id,
      details: "Salary payout",
      year: record.month.year,
      month: record.month.month,
    });
    setPaymentModalVisible(true);
  };

  const handlePayment = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        paymentDate: values.paymentDate.toISOString(),
      };
      const res = await payTeacherPayroll(selectedRecord.teacher._id, payload);
      if (res?.success) {
        message.success(res.message || "Payment successful");
        setPaymentModalVisible(false);
        fetchPayroll();
      }
    } catch (error) {
      message.error(error.message || "Failed to process salary payment");
    }
  };

  const columns = [
    {
      title: "Teacher",
      dataIndex: ["teacher", "fullName"],
      key: "teacher",
      render: (_, record) => record.teacher.fullName,
    },
    {
      title: "Course Count",
      dataIndex: ["summary", "totalAssignedCourses"],
      key: "courses",
    },
    {
      title: "Active Students",
      dataIndex: ["summary", "totalActiveStudents"],
      key: "activeStudents",
    },
    {
      title: "Eligible Students",
      dataIndex: ["summary", "eligibleStudents"],
      key: "eligibleStudents",
    },
    {
      title: "Salary Type",
      dataIndex: ["salaryConfig", "salaryType"],
      key: "salaryType",
      render: (value) => (
        <Tag color={value === "per_student" ? "blue" : "green"}>
          {value === "per_student" ? "Per Student" : "Fixed"}
        </Tag>
      ),
    },
    {
      title: "Due",
      dataIndex: ["payroll", "dueAmount"],
      key: "dueAmount",
      render: (value) => `Rs ${Number(value || 0).toLocaleString()}`,
    },
    {
      title: "Paid",
      dataIndex: ["payroll", "paidAmount"],
      key: "paidAmount",
      render: (value) => `Rs ${Number(value || 0).toLocaleString()}`,
    },
    {
      title: "Remaining",
      dataIndex: ["payroll", "remainingAmount"],
      key: "remainingAmount",
      render: (value) => `Rs ${Number(value || 0).toLocaleString()}`,
    },
    {
      title: "Status",
      dataIndex: ["payroll", "status"],
      key: "status",
      render: (value) => {
        const color = value === "paid" ? "green" : value === "partial" ? "orange" : "red";
        return <Tag color={color}>{value.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => openPaymentModal(record)}
          disabled={record.payroll.remainingAmount <= 0}
        >
          Pay
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <Statistic title="Total Teachers" value={payrollData.length} />
        </Card>
        <Card>
          <Statistic
            title="Total Unpaid"
            value={payrollData.reduce(
              (sum, item) => sum + Number(item.payroll.remainingAmount || 0),
              0,
            )}
            precision={0}
          />
        </Card>
        <Card>
          <Statistic
            title="Total Paid"
            value={payrollData.reduce(
              (sum, item) => sum + Number(item.payroll.paidAmount || 0),
              0,
            )}
            precision={0}
          />
        </Card>
      </div>

      <Card title="Teacher Payroll">
        <Table
          columns={columns}
          dataSource={payrollData}
          rowKey={(record) => record.teacher._id}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={selectedRecord ? `Pay Salary — ${selectedRecord.teacher.fullName}` : "Pay Salary"}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handlePayment}
        okText="Pay"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Payment Date"
            name="paymentDate"
            rules={[{ required: true, message: "Select payment date" }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item
            label="Amount"
            name="amount"
            rules={[{ required: true, message: "Enter payment amount" }]}
          >
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item
            label="Payment Method"
            name="paymentMethodId"
            rules={[{ required: true, message: "Select payment method" }]}
          >
            <Select>
              {paymentMethods.map((method) => (
                <Select.Option key={method._id} value={method._id}>
                  {method.name} ({method.type})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Details" name="details">
            <Input.TextArea rows={3} placeholder="Payment details" />
          </Form.Item>
          <Form.Item name="year" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="month" hidden>
            <InputNumber />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Payroll;
