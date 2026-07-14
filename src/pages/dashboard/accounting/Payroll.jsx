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
  message,
  Statistic,
  Select,
} from "antd";
import dayjs from "dayjs";
import {
  getTeacherPayroll,
  getAccountingTypes,
  getPaymentMethods,
  payTeacherPayroll,
} from "../../../services/accountingService";

const getDefaultPayrollMonth = () => dayjs().subtract(1, "month").startOf("month");
const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [accountingTypes, setAccountingTypes] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultPayrollMonth());
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [form] = Form.useForm();

  const getPreferredPaymentMethodId = (methods = paymentMethods) =>
    methods.find((m) => m.isDefault)?._id || methods[0]?._id || null;

  const getPreferredAccountingTypeId = (types = accountingTypes) =>
    types.find((type) => String(type.name || "").toLowerCase() === "expense")?._id ||
    types[0]?._id ||
    null;

  const fetchPayroll = async (monthValue = selectedMonth) => {
    setLoading(true);
    try {
      const res = await getTeacherPayroll({
        page: 1,
        limit: 50,
        year: monthValue.year(),
        month: monthValue.month() + 1,
      });
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
    Promise.all([getPaymentMethods(), getAccountingTypes()])
      .then(([paymentMethodsRes, accountingTypesRes]) => {
        if (paymentMethodsRes?.success) {
          setPaymentMethods(paymentMethodsRes.data || []);
        }
        if (accountingTypesRes?.success) {
          setAccountingTypes(accountingTypesRes.data || []);
        }
      })
      .catch((error) => {
        message.error(error.message || "Failed to load payroll payment options");
      });
  }, []);

  const openPaymentModal = (record) => {
    setSelectedRecord(record);
    form.setFieldsValue({
      paymentDate: dayjs(),
      amount: record.payroll.remainingAmount || 0,
      paymentMethodId: getPreferredPaymentMethodId(),
      accountingTypeId: getPreferredAccountingTypeId(),
      details: "Salary payout",
      year: record.month.year,
      month: record.month.month,
    });
    setPaymentModalVisible(true);
  };

  const handlePayment = async () => {
    try {
      const values = await form.validateFields();
      const paymentAmount = Number(values.amount || 0);
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        message.error("Please enter a valid salary payment amount.");
        return;
      }

      const selectedPaymentMethodId =
        values.paymentMethodId || getPreferredPaymentMethodId();
      if (!selectedPaymentMethodId) {
        message.error(
          "No academy account is available for salary payment. Please create Cash or Bank account first.",
        );
        return;
      }

      const selectedAccountingTypeId =
        values.accountingTypeId || getPreferredAccountingTypeId();
      if (!selectedAccountingTypeId) {
        message.error(
          "No accounting type is available. Please create Income or Expense type first.",
        );
        return;
      }

      const payload = {
        ...values,
        paymentMethodId: selectedPaymentMethodId,
        accountingTypeId: selectedAccountingTypeId,
        paymentDate: values.paymentDate.toISOString(),
      };
      const res = await payTeacherPayroll(selectedRecord.teacher._id, payload);
      if (res?.success) {
        message.success(res.message || "Payment successful");
        setPaymentModalVisible(false);
        fetchPayroll(selectedMonth);
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
      render: (value) => formatCurrency(value),
    },
    {
      title: "Paid",
      dataIndex: ["payroll", "paidAmount"],
      key: "paidAmount",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Remaining",
      dataIndex: ["payroll", "remainingAmount"],
      key: "remainingAmount",
      render: (value) => formatCurrency(value),
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

  const teacherOptions = payrollData.map((item) => ({
    label: item.teacher?.fullName || "Unknown Teacher",
    value: item.teacher?._id,
  }));

  const filteredPayrollData = selectedTeacherId
    ? payrollData.filter((item) => String(item.teacher?._id) === String(selectedTeacherId))
    : payrollData;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <Statistic title="Total Teachers" value={filteredPayrollData.length} />
        </Card>
        <Card>
          <Statistic
            title="Total Unpaid"
            value={filteredPayrollData.reduce(
              (sum, item) => sum + Number(item.payroll.remainingAmount || 0),
              0,
            )}
            precision={0}
          />
        </Card>
        <Card>
          <Statistic
            title="Total Paid"
            value={filteredPayrollData.reduce(
              (sum, item) => sum + Number(item.payroll.paidAmount || 0),
              0,
            )}
            precision={0}
          />
        </Card>
      </div>

      <Card
        title={`Teacher Payroll (${selectedMonth.format("MMMM YYYY")})`}
        extra={
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Select
              allowClear
              placeholder="All teachers"
              value={selectedTeacherId}
              onChange={(value) => setSelectedTeacherId(value || null)}
              options={teacherOptions}
              className="min-w-[220px]"
              showSearch
              optionFilterProp="label"
            />
            <DatePicker
              picker="month"
              allowClear={false}
              value={selectedMonth}
              format="MMMM YYYY"
              onChange={(value) => {
                const nextMonth = value || getDefaultPayrollMonth();
                setSelectedMonth(nextMonth);
                fetchPayroll(nextMonth);
              }}
            />
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredPayrollData}
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
            label="Pay From Account"
            name="paymentMethodId"
            rules={[{ required: true, message: "Select account" }]}
          >
            <Select
              placeholder="Select account"
              options={paymentMethods.map((method) => ({
                label: method.name,
                value: method._id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="Income / Expense Type"
            name="accountingTypeId"
            rules={[{ required: true, message: "Select type" }]}
          >
            <Select
              placeholder="Select accounting type"
              options={accountingTypes.map((type) => ({
                label: type.name,
                value: type._id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="Details"
            name="details"
          >
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
