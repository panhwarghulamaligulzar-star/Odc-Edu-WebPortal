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
} from "antd";
import dayjs from "dayjs";
import {
  getTeacherPayroll,
  getPaymentMethods,
  payTeacherPayroll,
} from "../../../services/accountingService";

const getDefaultPayrollMonth = () => dayjs().subtract(1, "month").startOf("month");
const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
const STUDENT_COMPENSATION_OVERRIDE_STORAGE_KEY = "teacher_student_comp_overrides_v1";

const getCompensationOverrideKey = (teacherId, monthValue) =>
  `${teacherId || "unknown"}:${monthValue || "unknown"}`;

const readStudentCompensationOverrides = () => {
  try {
    const raw = localStorage.getItem(STUDENT_COMPENSATION_OVERRIDE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const applyStudentCompensationOverridesToPayroll = (items = [], monthValue) => {
  const monthKey = monthValue.format("YYYY-MM");
  const allOverrides = readStudentCompensationOverrides();

  return items.map((item) => {
    const overrideKey = getCompensationOverrideKey(item.teacher?._id, monthKey);
    const teacherOverrides = allOverrides[overrideKey] || {};
    const hasOverrides = Object.keys(teacherOverrides).length > 0;

    if (
      !hasOverrides ||
      item.salaryConfig?.salaryType !== "per_student" ||
      !Array.isArray(item.studentsForSalary)
    ) {
      return item;
    }

    const studentsForSalary = item.studentsForSalary.map((student) => {
      const override = teacherOverrides[String(student.studentId)];
      if (!override) return student;

      const amount = Number(override.amount || 0);
      const isSalaryEligible = amount > 0;

      return {
        ...student,
        hasManualAdjustment: true,
        manualAdjustedAmount: amount,
        manualAdjustmentNote: override.note || "",
        calculatedSalaryAmount: amount,
        isSalaryEligible,
      };
    });

    const eligibleStudents = studentsForSalary.filter((student) => student.isSalaryEligible).length;
    const dueAmount = studentsForSalary.reduce(
      (sum, student) => sum + Number(student.calculatedSalaryAmount || 0),
      0,
    );
    const paidAmount = Number(item.payroll?.paidAmount || 0);
    const remainingAmount = Math.max(0, dueAmount - paidAmount);
    const status =
      dueAmount <= 0
        ? "paid"
        : paidAmount >= dueAmount
        ? "paid"
        : paidAmount > 0
        ? "partial"
        : "unpaid";

    return {
      ...item,
      studentsForSalary,
      summary: {
        ...(item.summary || {}),
        eligibleStudents,
        calculatedMonthlySalary: dueAmount,
      },
      payroll: {
        ...(item.payroll || {}),
        dueAmount,
        paidAmount,
        remainingAmount,
        status,
      },
    };
  });
};

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultPayrollMonth());
  const [form] = Form.useForm();

  const getPreferredPaymentMethodId = (methods = paymentMethods) =>
    methods.find((m) => m.isDefault)?._id || methods[0]?._id || null;

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
        setPayrollData(
          applyStudentCompensationOverridesToPayroll(res.data || [], monthValue),
        );
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
      if (res?.success) {
        setPaymentMethods(res.data || []);
      }
    });
  }, []);

  const openPaymentModal = (record) => {
    setSelectedRecord(record);
    form.setFieldsValue({
      paymentDate: dayjs(),
      amount: record.payroll.remainingAmount || 0,
      paymentMethodId: getPreferredPaymentMethodId(),
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

      const payload = {
        ...values,
        paymentMethodId: selectedPaymentMethodId,
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

      <Card
        title={`Teacher Payroll (${selectedMonth.format("MMMM YYYY")})`}
        extra={
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
        }
      >
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
            label="Details"
            name="details"
          >
            <Input.TextArea rows={3} placeholder="Payment details" />
          </Form.Item>
          <Form.Item name="paymentMethodId" hidden>
            <Input />
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
