import React, { useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Descriptions,
  Divider,
  Space,
  Typography,
} from "antd";
import {
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * InstallmentPlanPreview Component
 * Displays the calculated installment plan with fee breakdown
 */
const InstallmentPlanPreview = ({ installmentPlan, courseInfo }) => {
  if (!installmentPlan || !installmentPlan.installments) {
    return null;
  }

  const { installments, summary } = installmentPlan;

  const columns = [
    {
      title: "#",
      dataIndex: "installmentNumber",
      key: "installmentNumber",
      width: 60,
      align: "center",
      render: (num) => <Tag color="blue">#{num}</Tag>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">
            {record.feeComponents.admissionFee > 0 && (
              <span className="mr-2">
                Admission: Rs.{" "}
                {record.feeComponents.admissionFee.toLocaleString()}
              </span>
            )}
            {record.feeComponents.courseFee > 0 && (
              <span className="mr-2">
                Course: Rs. {record.feeComponents.courseFee.toLocaleString()}
              </span>
            )}
            {record.feeComponents.certificateFee > 0 && (
              <span>
                Certificate: Rs.{" "}
                {record.feeComponents.certificateFee.toLocaleString()}
              </span>
            )}
            {record.feeComponents.examFee > 0 && (
              <span className="mr-2">
                Exam: Rs. {record.feeComponents.examFee.toLocaleString()}
              </span>
            )}
            {record.feeComponents.registrationFee > 0 && (
              <span className="mr-2">
                Registration: Rs.{" "}
                {record.feeComponents.registrationFee.toLocaleString()}
              </span>
            )}
            {record.feeComponents.practicalFee > 0 && (
              <span className="mr-2">
                Practical: Rs.{" "}
                {record.feeComponents.practicalFee.toLocaleString()}
              </span>
            )}
            {record.feeComponents.otherFee > 0 && (
              <span className="mr-2">
                Other: Rs. {record.feeComponents.otherFee.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (amount) => (
        <Text strong className="text-lg">
          Rs. {amount.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 140,
      render: (date) => (
        <Space>
          <CalendarOutlined className="text-gray-400" />
          <Text>{new Date(date).toLocaleDateString()}</Text>
        </Space>
      ),
    },
  ];

  return (
    <div className="installment-plan-preview">
      <Card
        title={
          <Space>
            <InfoCircleOutlined />
            <span>Installment Plan Preview</span>
          </Space>
        }
        className="mb-4 shadow-sm"
      >
        {/* Fee Summary */}
        <Descriptions
          bordered
          size="small"
          column={2}
          className="mb-4"
          labelStyle={{ fontWeight: 600, width: "40%" }}
        >
          <Descriptions.Item label="Course" span={2}>
            <Text strong>{courseInfo?.courseName || "N/A"}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Duration">
            {summary.courseDuration} Months
          </Descriptions.Item>
          <Descriptions.Item label="Monthly Fee">
            Rs. {summary.monthlyCourseFee.toLocaleString()}
          </Descriptions.Item>

          <Descriptions.Item label="Admission Fee">
            Rs. {summary.admissionFee.toLocaleString()}
            {summary.discountOnAdmission > 0 && (
              <Tag color="green" className="ml-2">
                -Rs. {summary.discountOnAdmission.toLocaleString()}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Course Fee">
            Rs. {summary.courseFee.toLocaleString()}
            {summary.discountOnCourseFee > 0 && (
              <Tag color="green" className="ml-2">
                -Rs. {summary.discountOnCourseFee.toLocaleString()}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Certificate Fee" span={2}>
            Rs. {summary.certificateFee.toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Total Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card size="small" className="bg-gray-50">
            <Text type="secondary">Total Before Discount</Text>
            <div className="text-2xl font-bold">
              Rs. {summary.totalBeforeDiscount.toLocaleString()}
            </div>
          </Card>
          <Card size="small" className="bg-gray-50">
            <Text type="secondary">Total Discount</Text>
            <div className="text-2xl font-bold text-green-600">
              - Rs. {summary.totalDiscount.toLocaleString()}
            </div>
          </Card>
        </div>

        <Card size="small" className="bg-blue-50 border-blue-300">
          <div className="flex justify-between items-center">
            <div>
              <Text type="secondary">Final Total Amount</Text>
              <div className="text-3xl font-bold text-blue-600">
                Rs. {summary.totalFee.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <Text type="secondary">Number of Installments</Text>
              <div className="text-3xl font-bold text-blue-600">
                {summary.numberOfInstallments}
              </div>
            </div>
          </div>
        </Card>

        <Divider orientation="left">Payment Schedule</Divider>

        {/* Installment Table */}
        <Table
          columns={columns}
          dataSource={installments}
          rowKey="installmentNumber"
          pagination={false}
          size="middle"
          bordered
          className="installment-table"
          summary={(pageData) => {
            const totalAmount = pageData.reduce(
              (sum, record) => sum + record.amount,
              0,
            );
            return (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-gray-100">
                  <Table.Summary.Cell index={0} colSpan={2} align="right">
                    <Text strong>Total Amount:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong className="text-lg text-blue-600">
                      Rs. {totalAmount.toLocaleString()}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />

        {/* Payment Instructions */}
        <Card size="small" className="mt-4 bg-amber-50 border-amber-200">
          <Space direction="vertical" size="small">
            <Text strong>
              <CheckCircleOutlined className="mr-2 text-amber-500" />
              Payment Instructions:
            </Text>
            <ul className="ml-6 space-y-1 text-sm">
              <li>
                <Text type="secondary">
                  First payment includes Admission Fee + First month's course
                  fee
                </Text>
              </li>
              <li>
                <Text type="secondary">
                  Monthly installments cover the course fee for each month
                </Text>
              </li>
              <li>
                <Text type="secondary">
                  Final installment includes last month's course fee +
                  Certificate fee
                </Text>
              </li>
              <li>
                <Text type="secondary">
                  Payment receipts will be issued for each payment made
                </Text>
              </li>
            </ul>
          </Space>
        </Card>
      </Card>
    </div>
  );
};

export default InstallmentPlanPreview;
