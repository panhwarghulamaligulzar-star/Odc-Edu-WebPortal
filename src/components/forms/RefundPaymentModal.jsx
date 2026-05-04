import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  message,
  Descriptions,
  Card,
  Alert,
  Space,
  Typography,
  Divider,
} from "antd";
import {
  ExclamationCircleOutlined,
  DollarOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import api from "../../api/axiosInstance";

const { TextArea } = Input;
const { Text, Title } = Typography;

/**
 * RefundPaymentModal Component
 * Handles payment refund processing
 */
const RefundPaymentModal = ({
  visible,
  onClose,
  onRefundSuccess,
  paymentData,
  studentId,
  courseId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calculatingRefund, setCalculatingRefund] = useState(false);
  const [refundCalculation, setRefundCalculation] = useState(null);

  const handleCalculateRefund = async () => {
    setCalculatingRefund(true);
    try {
      const completedMonths = form.getFieldValue("completedMonths") || 0;

      const response = await api.post(
        `/fee/refund/calculate/${studentId}/${courseId}`,
        { completedMonths }
      );

      if (response.data.success) {
        setRefundCalculation(response.data.data);
        form.setFieldsValue({
          refundAmount: response.data.data.refundableAmount,
        });
        message.success("Refund calculated successfully");
      }
    } catch (error) {
      console.error("Refund calculation error:", error);
      message.error(
        error.response?.data?.message || "Failed to calculate refund"
      );
    } finally {
      setCalculatingRefund(false);
    }
  };

  const handleSubmit = async (values) => {
    if (!paymentData?._id) {
      message.error("Payment data not found");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        `/fee/payment/${paymentData._id}/refund`,
        {
          refundAmount: values.refundAmount,
          refundReason: values.refundReason,
        }
      );

      if (response.data.success) {
        message.success("Refund processed successfully");
        form.resetFields();
        setRefundCalculation(null);
        onClose();
        if (onRefundSuccess) {
          onRefundSuccess(response.data.data);
        }
      }
    } catch (error) {
      console.error("Refund processing error:", error);
      message.error(
        error.response?.data?.message || "Failed to process refund"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setRefundCalculation(null);
    onClose();
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || 0}`;
  };

  return (
    <Modal
      open={visible}
      title={
        <Space>
          <ExclamationCircleOutlined className="text-orange-500" />
          <span>Process Refund</span>
        </Space>
      }
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          loading={loading}
          onClick={() => form.submit()}
        >
          Process Refund
        </Button>,
      ]}
    >
      <Alert
        message="Warning: Refund Processing"
        description="Processing a refund will reverse the payment and update the fee structure. This action should be carefully reviewed."
        type="warning"
        showIcon
        className="mb-4"
      />

      {/* Payment Info */}
      {paymentData && (
        <Card size="small" className="mb-4 bg-gray-50">
          <Descriptions column={2} size="small" title="Payment Information">
            <Descriptions.Item label="Receipt No">
              <Text strong>{paymentData.receiptNo}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Amount">
              <Text strong className="text-green-600">
                {formatCurrency(paymentData.amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Date">
              {new Date(paymentData.paymentDate).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              {paymentData.paymentMethod}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Divider />

      {/* Refund Calculator */}
      <Card
        size="small"
        title={
          <Space>
            <CalculatorOutlined />
            <span>Refund Calculator</span>
          </Space>
        }
        className="mb-4"
      >
        <Space direction="vertical" className="w-full">
          <Form.Item label="Completed Months">
            <Space>
              <InputNumber
                min={0}
                placeholder="Enter completed months"
                onChange={(value) => form.setFieldsValue({ completedMonths: value })}
              />
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                loading={calculatingRefund}
                onClick={handleCalculateRefund}
              >
                Calculate Refund
              </Button>
            </Space>
          </Form.Item>

          {refundCalculation && (
            <Card size="small" className="bg-blue-50 border-blue-300">
              <Title level={5} className="mb-3">
                Refund Calculation
              </Title>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Total Paid">
                  {formatCurrency(refundCalculation.totalPaid)}
                </Descriptions.Item>
                <Descriptions.Item label="Non-Refundable Amount">
                  <Text type="danger">
                    {formatCurrency(refundCalculation.nonRefundableAmount)}
                  </Text>
                  <div className="text-xs text-gray-500 mt-1">
                    Admission Fee: {formatCurrency(refundCalculation.breakdown.admissionFee)}
                    {refundCalculation.breakdown.completedMonthsFee > 0 && (
                      <> | Completed Months: {formatCurrency(refundCalculation.breakdown.completedMonthsFee)}</>
                    )}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Refundable Amount">
                  <Text strong className="text-green-600 text-xl">
                    {formatCurrency(refundCalculation.refundableAmount)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </Space>
      </Card>

      {/* Refund Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          completedMonths: 0,
        }}
      >
        <Form.Item name="completedMonths" hidden>
          <InputNumber />
        </Form.Item>

        <Form.Item
          name="refundAmount"
          label="Refund Amount"
          rules={[
            { required: true, message: "Please enter refund amount" },
            {
              type: "number",
              max: paymentData?.amount || 0,
              message: `Refund amount cannot exceed ${formatCurrency(
                paymentData?.amount
              )}`,
            },
            {
              type: "number",
              min: 1,
              message: "Refund amount must be greater than 0",
            },
          ]}
        >
          <InputNumber
            size="large"
            className="w-full"
            min={0}
            max={paymentData?.amount || 0}
            prefix="Rs."
            placeholder="Enter refund amount"
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          />
        </Form.Item>

        <Form.Item
          name="refundReason"
          label="Refund Reason"
          rules={[
            { required: true, message: "Please provide a reason for refund" },
            { min: 10, message: "Reason must be at least 10 characters" },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Enter detailed reason for the refund (minimum 10 characters)"
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Alert
          message="Refund Policy"
          description={
            <ul className="list-disc ml-4 mt-2 text-sm">
              <li>Admission fees are non-refundable</li>
              <li>Course fees for completed months are non-refundable</li>
              <li>Only remaining course fees and certificate fees can be refunded</li>
              <li>Refunds will be processed within 7-10 business days</li>
            </ul>
          }
          type="info"
          showIcon
          className="mt-4"
        />
      </Form>
    </Modal>
  );
};

export default RefundPaymentModal;
