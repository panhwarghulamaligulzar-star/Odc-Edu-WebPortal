import React, { useState, useEffect } from "react";
import {
  Form,
  InputNumber,
  Button,
  Select,
  DatePicker,
  Input,
  Row,
  Col,
  message,
  Divider,
} from "antd";
import { getNextVoucherNumber } from "../../services/feeService";
import dayjs from "dayjs";

const FeePaymentForm = ({
  form,
  student,
  course,
  feeStructure,
  loading = false,
  onSubmit,
}) => {
  const [localForm] = Form.useForm();
  const usedForm = form || localForm;
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [maxPayableAmount, setMaxPayableAmount] = useState(0);
  const [voucherNo, setVoucherNo] = useState("");

  // Fetch voucher number on mount
  useEffect(() => {
    fetchVoucherNumber();
  }, []);

  const fetchVoucherNumber = async () => {
    try {
      const response = await getNextVoucherNumber();
      if (response.success) {
        setVoucherNo(response.data.voucherNo);
        usedForm.setFieldValue("voucherNo", response.data.voucherNo);
      }
    } catch (error) {
      console.error("Error fetching voucher number:", error);
      setVoucherNo("001");
      usedForm.setFieldValue("voucherNo", "001");
    }
  };

  useEffect(() => {
    if (feeStructure) {
      setMaxPayableAmount(feeStructure.remainingAmount || 0);

      // Set default values
      usedForm.setFieldsValue({
        paymentDate: dayjs(),
        paymentMethod: "Cash",
      });
    }
  }, [feeStructure, usedForm]);

  const handleInstallmentSelect = (installmentNumber) => {
    setSelectedInstallment(installmentNumber);
    const installment = feeStructure?.installments?.find(
      (inst) => inst.installmentNumber === installmentNumber,
    );

    if (installment) {
      const remainingForInstallment =
        installment.amount - (installment.paidAmount || 0);
      usedForm.setFieldValue("amount", remainingForInstallment);
    }
  };

  const handleFinish = async (values) => {
    // Get fresh voucher number for each payment
    let voucherNum = voucherNo;
    try {
      const response = await getNextVoucherNumber();
      if (response.success) {
        voucherNum = response.data.voucherNo;
      }
    } catch (error) {
      console.error("Error fetching voucher number:", error);
    }

    const paymentData = {
      studentId: student?._id,
      courseId: course?._id,
      ...values,
      voucherNo: voucherNum,
      paymentDate:
        values.paymentDate?.toISOString() || new Date().toISOString(),
      installmentNumber: selectedInstallment,
    };

    if (onSubmit) onSubmit(paymentData);
  };

  return (
    <Form
      form={usedForm}
      layout="vertical"
      onFinish={handleFinish}
      disabled={loading}
      className="fee-payment-form"
    >
      {student && course && feeStructure && (
        <>
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <Row gutter={16}>
              <Col span={12}>
                <p className="text-sm opacity-60">Student</p>
                <p className="font-semibold">{student.studentName}</p>
                <p className="text-xs opacity-50">{student.registrationNo}</p>
              </Col>
              <Col span={12}>
                <p className="text-sm opacity-60">Course</p>
                <p className="font-semibold">{course.courseName}</p>
                <p className="text-xs opacity-50">{course.courseId}</p>
              </Col>
            </Row>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded">
            <Row gutter={16}>
              <Col span={8}>
                <p className="text-xs opacity-60">Total Fee</p>
                <p className="font-bold text-lg">
                  Rs {feeStructure.totalFee?.toLocaleString()}
                </p>
              </Col>
              <Col span={8}>
                <p className="text-xs opacity-60">Paid Amount</p>
                <p className="font-bold text-lg text-green-600">
                  Rs {feeStructure.paidAmount?.toLocaleString()}
                </p>
              </Col>
              <Col span={8}>
                <p className="text-xs opacity-60">Remaining</p>
                <p className="font-bold text-lg text-red-600">
                  Rs {feeStructure.remainingAmount?.toLocaleString()}
                </p>
              </Col>
            </Row>
          </div>
        </>
      )}

      <Divider orientation="left">Payment Details</Divider>

      {feeStructure?.installmentEnabled &&
        feeStructure?.installments?.length > 0 && (
          <Form.Item
            label={
              <span className="text-md !text-[14px] opacity-40">
                Select Installment
              </span>
            }
          >
            <Select
              size="large"
              className="form-input !font-ArialLight"
              placeholder="Select installment"
              onChange={handleInstallmentSelect}
              allowClear
            >
              {feeStructure.installments.map((installment) => (
                <Select.Option
                  key={installment.installmentNumber}
                  value={installment.installmentNumber}
                  disabled={installment.status === "Paid"}
                >
                  Installment #{installment.installmentNumber} - Rs{" "}
                  {installment.amount?.toLocaleString()}
                  {installment.status === "Paid"
                    ? " (Paid)"
                    : installment.status === "Partial"
                      ? ` (Partial: Rs ${installment.paidAmount?.toLocaleString()} paid)`
                      : " (Pending)"}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

      <Form.Item
        name="amount"
        label={
          <span className="text-md !text-[14px] opacity-40">
            Payment Amount
          </span>
        }
        rules={[
          { required: true, message: "Please enter payment amount" },
          {
            validator: (_, value) => {
              if (value > maxPayableAmount) {
                return Promise.reject(
                  `Amount cannot exceed remaining balance (Rs ${maxPayableAmount.toLocaleString()})`,
                );
              }
              if (value <= 0) {
                return Promise.reject("Amount must be greater than 0");
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <InputNumber
          size="large"
          className="w-full form-input !font-ArialLight"
          placeholder="Enter amount"
          min={0}
          max={maxPayableAmount}
          formatter={(value) =>
            `Rs ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => value.replace(/Rs\s?|(,*)/g, "")}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="paymentDate"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Payment Date
              </span>
            }
            rules={[{ required: true, message: "Please select date" }]}
          >
            <DatePicker
              size="large"
              className="w-full form-input !font-ArialLight"
              format="DD-MM-YYYY"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="paymentMethod"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Payment Method
              </span>
            }
            rules={[{ required: true, message: "Please select method" }]}
          >
            <Select size="large" className="form-input !font-ArialLight">
              <Select.Option value="Cash">Cash</Select.Option>
              <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
              <Select.Option value="Online">Online Payment</Select.Option>
              <Select.Option value="Cheque">Cheque</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.paymentMethod !== currentValues.paymentMethod
        }
      >
        {({ getFieldValue }) => {
          const paymentMethod = getFieldValue("paymentMethod");

          if (paymentMethod === "Bank Transfer" || paymentMethod === "Online") {
            return (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="transactionId"
                    label={
                      <span className="text-md !text-[14px] opacity-40">
                        Transaction ID
                      </span>
                    }
                  >
                    <Input
                      size="large"
                      className="form-input !font-ArialLight"
                      placeholder="Enter transaction ID"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="bankName"
                    label={
                      <span className="text-md !text-[14px] opacity-40">
                        Bank Name
                      </span>
                    }
                  >
                    <Input
                      size="large"
                      className="form-input !font-ArialLight"
                      placeholder="Enter bank name"
                    />
                  </Form.Item>
                </Col>
              </Row>
            );
          }

          if (paymentMethod === "Cheque") {
            return (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="chequeNo"
                    label={
                      <span className="text-md !text-[14px] opacity-40">
                        Cheque Number
                      </span>
                    }
                  >
                    <Input
                      size="large"
                      className="form-input !font-ArialLight"
                      placeholder="Enter cheque number"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="bankName"
                    label={
                      <span className="text-md !text-[14px] opacity-40">
                        Bank Name
                      </span>
                    }
                  >
                    <Input
                      size="large"
                      className="form-input !font-ArialLight"
                      placeholder="Enter bank name"
                    />
                  </Form.Item>
                </Col>
              </Row>
            );
          }

          return null;
        }}
      </Form.Item>

      <Form.Item
        name="voucherNo"
        label={<span className="text-md !text-[14px] opacity-40">Voucher No:</span>}
        initialValue={voucherNo}
      >
        <Input.TextArea
          size="large"
          className="form-input !font-ArialLight bg-gray-100"
          placeholder="Auto-generated voucher number"
          rows={2}
          readOnly
        />
      </Form.Item>

      <div className="mt-4 pt-4 border-t">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          className="btn-xl hover:!bg-blue-900"
          loading={loading}
        >
          <span>Record Payment</span>
        </Button>
      </div>
    </Form>
  );
};

export default FeePaymentForm;
