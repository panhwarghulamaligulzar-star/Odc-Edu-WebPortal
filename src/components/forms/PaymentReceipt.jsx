import React, { useRef } from "react";
import {
  Modal,
  Button,
  Descriptions,
  Divider,
  Space,
  Typography,
  Tag,
  Card,
  message,
} from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import academyConfig from "../../config/academyConfig";

const { Title, Text } = Typography;

/**
 * PaymentReceipt Component
 * Displays and prints payment receipt
 */
const PaymentReceipt = ({ visible, onClose, paymentData, institutionInfo }) => {
  const receiptRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${paymentData?.receiptNo || "payment"}`,
  });

  const handleDownloadPDF = async () => {
    try {
      const element = receiptRef.current;
      if (!element) {
        message.error("Could not find receipt element");
        return;
      }

      // Create canvas from the receipt element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Save PDF
      const fileName = `Receipt-${paymentData?.receiptNo || "payment"}-${new Date().getTime()}.pdf`;
      pdf.save(fileName);

      message.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      message.error("Failed to download receipt as PDF");
    }
  };

  if (!paymentData) return null;

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    // Remove decimals and format with commas
    const rounded = Math.round(amount || 0);
    return `Rs. ${rounded.toLocaleString()}`;
  };

  console.log("Receipt data:", paymentData);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="download"
          type="default"
          icon={<DownloadOutlined />}
          onClick={handleDownloadPDF}
        >
          Download PDF
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
        >
          Print Receipt
        </Button>,
      ]}
      title={
        <Space>
          <CheckCircleOutlined className="text-green-500" />
          <span>Payment Receipt</span>
        </Space>
      }
    >
      <div ref={receiptRef} className="receipt-container p-4 bg-white" style={{ pageBreakAfter: 'avoid' }}>
        {/* Header - Academy Logo and Branding */}
        <div style={{
          backgroundColor: '#F0F8FF',
          color: '#142D78',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '20px'
        }}>
          {/* Academy Logo */}
          <div style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '80px'
          }}>
            <img
              src={institutionInfo?.logo || academyConfig.logo}
              alt="Academy Logo"
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                backgroundColor: 'transparent'
              }}
            />
          </div>

          {/* Academy Details */}
          <div style={{
            flex: '1 1 auto',
            textAlign: 'left',
            paddingLeft: '16px'
          }}>
            <Title level={3} style={{ color: '#142D78', margin: '0 0 6px 0', fontSize: '20px', fontWeight: 'bold' }}>
              {institutionInfo?.name || academyConfig.name}
            </Title>
            
            <Text style={{ color: '#555555', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              📍 {institutionInfo?.address || academyConfig.address}
            </Text>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Text style={{ color: '#666666', fontSize: '11px', display: 'block' }}>
                📧 {institutionInfo?.email || academyConfig.email}
              </Text>
              <Text style={{ color: '#666666', fontSize: '11px', display: 'block' }}>
                📱 {institutionInfo?.phone || academyConfig.phone}
              </Text>
            </div>
          </div>
        </div>

        {/* Receipt Header Box */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '8px'
        }}>
          <Title level={4} style={{ margin: 0, color: '#142D78' }}>RECEIPT</Title>
          <div style={{ textAlign: 'right', fontSize: '12px' }}>
            <div><strong>Receipt No:</strong> {paymentData.receiptNo || "N/A"}</div>
            <div><strong>Date:</strong> {formatDate(paymentData.paymentDate)}</div>
          </div>
        </div>

        {/* Student Information */}
        <Card size="small" className="mb-2 bg-gray-50">
          <Title level={5} className="mb-2 text-xs">
            Student Information
          </Title>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Registration No">
              {paymentData.student?.registrationNo || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Student Name">
              {paymentData.student?.studentName || "N/A"}
            </Descriptions.Item>
            {paymentData.student?.fatherName && (
              <Descriptions.Item label="Father Name">
                {paymentData.student.fatherName}
              </Descriptions.Item>
            )}
            {paymentData.student?.mobileNumber && (
              <Descriptions.Item label="Mobile">
                {paymentData.student.mobileNumber}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Course Information */}
        <Card size="small" className="mb-2 bg-gray-50">
          <Title level={5} className="mb-2 text-xs">
            Course Information
          </Title>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Course">
              {paymentData.course?.courseName || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Course ID">
              {paymentData.course?.courseId || "N/A"}
            </Descriptions.Item>
            {paymentData.installmentNumber && (
              <Descriptions.Item label="Installment No">
                #{paymentData.installmentNumber}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Payment Details */}
        <Card size="small" className="mb-2">
          <Title level={5} className="mb-2 text-xs">
            Payment Details
          </Title>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Payment Amount">
              <Text strong className="text-xl text-green-600">
                {formatCurrency(paymentData.amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              <Tag color="blue" className="text-xs">{paymentData.paymentMethod}</Tag>
            </Descriptions.Item>
            {paymentData.paymentType && (
              <Descriptions.Item label="Payment Type">
                <Tag color="cyan" className="text-xs">{paymentData.paymentType}</Tag>
              </Descriptions.Item>
            )}
            {paymentData.transactionId && (
              <Descriptions.Item label="Transaction ID">
                {paymentData.transactionId}
              </Descriptions.Item>
            )}
            {paymentData.chequeNo && (
              <Descriptions.Item label="Cheque No">
                {paymentData.chequeNo}
              </Descriptions.Item>
            )}
            {paymentData.bankName && (
              <Descriptions.Item label="Bank Name">
                {paymentData.bankName}
              </Descriptions.Item>
            )}
            {paymentData.voucherNo && (
              <Descriptions.Item label="Voucher No">
                {paymentData.voucherNo}
              </Descriptions.Item>
            )}
            {paymentData.remarks && (
              <Descriptions.Item label="Admin Note">
                {paymentData.remarks}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Payment Breakdown (if available) */}
        {paymentData.installmentNumber && paymentData.feeStructure && (
          <Card size="small" className="mb-2 bg-blue-50">
            <Title level={5} className="mb-2 text-xs">
              Payment Breakdown for Installment #{paymentData.installmentNumber}
            </Title>

            {/* Fee Components Breakdown */}
            {paymentData.feeComponents && (
              <div className="mb-2">
                <Text strong className="block mb-1 text-xs">
                  Installment Consists Of:
                </Text>
                <Space direction="vertical" size="small" className="w-full">
                  {paymentData.feeComponents.admissionFee > 0 && (
                    <div className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Admission Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(paymentData.feeComponents.admissionFee)}
                      </Text>
                    </div>
                  )}
                  {paymentData.feeComponents.courseFee > 0 && (
                    <div className="flex justify-between items-center bg-green-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Course Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(paymentData.feeComponents.courseFee)}
                      </Text>
                    </div>
                  )}
                  {paymentData.feeComponents.certificateFee > 0 && (
                    <div className="flex justify-between items-center bg-purple-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Certificate Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(
                          paymentData.feeComponents.certificateFee,
                        )}
                      </Text>
                    </div>
                  )}
                  {paymentData.feeComponents.examFee > 0 && (
                    <div className="flex justify-between items-center bg-cyan-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Exam Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(paymentData.feeComponents.examFee)}
                      </Text>
                    </div>
                  )}
                  {paymentData.feeComponents.registrationFee > 0 && (
                    <div className="flex justify-between items-center bg-orange-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Registration Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(
                          paymentData.feeComponents.registrationFee,
                        )}
                      </Text>
                    </div>
                  )}
                  {paymentData.feeComponents.practicalFee > 0 && (
                    <div className="flex justify-between items-center bg-teal-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Practical Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(paymentData.feeComponents.practicalFee)}
                      </Text>
                    </div>
                  )}
                  {paymentData.feeComponents.otherFee > 0 && (
                    <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded text-xs">
                      <Text className="text-xs">Other Fee:</Text>
                      <Text strong className="text-xs">
                        {formatCurrency(paymentData.feeComponents.otherFee)}
                      </Text>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-gray-200 px-2 py-1 rounded font-semibold text-xs">
                    <Text strong className="text-xs">Total Installment Amount:</Text>
                    <Text strong className="text-sm">
                      {formatCurrency(
                        paymentData.installmentInfo?.installmentAmount ||
                          paymentData.amount,
                      )}
                    </Text>
                  </div>
                </Space>
              </div>
            )}

            {/* Show payment status */}
            {paymentData.installmentInfo &&
              paymentData.installmentInfo.status === "Partial" && (
                <Card
                  size="small"
                  className="mb-2 bg-yellow-50"
                >
                  <Space direction="vertical" size="small" className="w-full">
                    <Text type="warning" strong className="text-xs">
                      ⚠️ Partial Payment Status
                    </Text>
                    <div className="flex justify-between text-xs">
                      <Text className="text-xs">Already Paid:</Text>
                      <Text strong className="text-green-600 text-xs">
                        {formatCurrency(paymentData.installmentInfo.paidAmount)}
                      </Text>
                    </div>
                    <div className="flex justify-between text-xs">
                      <Text className="text-xs">Still Remaining:</Text>
                      <Text strong className="text-red-600 text-xs">
                        {formatCurrency(
                          paymentData.installmentInfo.installmentAmount -
                            paymentData.installmentInfo.paidAmount,
                        )}
                      </Text>
                    </div>
                  </Space>
                </Card>
              )}

            <Descriptions column={1} size="small">
              <Descriptions.Item label="This Payment Amount">
                <Text strong className="text-lg text-green-600">
                  {formatCurrency(paymentData.amount)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Divider className="my-2" />

        {/* Footer */}
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text type="secondary" className="text-xs">
                Received By:
              </Text>
              <div className="mt-4 pt-1">
                <Text className="text-xs">{paymentData.receivedBy?.name || "Admin"}</Text>
              </div>
            </div>
            <div className="text-right">
              <Text type="secondary" className="text-xs">
                Authorized Signature:
              </Text>
              <div className="mt-4 pt-1">
                <Text className="text-xs">Management</Text>
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <Text type="secondary" className="text-xs">
              This is a computer-generated receipt and does not require a
              physical signature.
            </Text>
            <br />
            <Text type="secondary" className="text-xs">
              For any queries, please contact us at{" "}
              {institutionInfo?.phone || ""}
            </Text>
          </div>
        </div>

        {/* Refund Info (if refunded) */}
        {paymentData.status === "Refunded" && paymentData.refundDetails && (
          <Card size="small" className="mt-2 bg-red-50">
            <Title level={5} className="text-red-600 mb-2 text-xs">
              Refund Information
            </Title>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Refund Amount">
                <Text strong className="text-red-600">
                  {formatCurrency(paymentData.refundDetails.refundAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Refund Date">
                {formatDate(paymentData.refundDetails.refundDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Refund Reason">
                {paymentData.refundDetails.refundReason}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .receipt-container {
            padding: 10px !important;
            margin: 0 !important;
          }
          
          @page {
            margin: 10mm;
            size: A4;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .ant-card {
            margin-bottom: 8px !important;
            break-inside: avoid;
          }
          
          .ant-divider {
            margin: 8px 0 !important;
          }
          
          .ant-descriptions-item {
            padding: 4px 0 !important;
          }
          
          .ant-descriptions-item-label {
            font-size: 11px !important;
          }
          
          .ant-descriptions-item-content {
            font-size: 11px !important;
          }
          
          h2,
          .ant-typography-h2 {
            font-size: 16px !important;
            margin: 4px 0 !important;
          }
          
          h5,
          .ant-typography-h5 {
            font-size: 12px !important;
            margin: 4px 0 !important;
          }
          
          .text-center {
            text-align: center;
          }
          
          .mb-6 {
            margin-bottom: 8px !important;
          }
          
          .mb-4 {
            margin-bottom: 6px !important;
          }
          
          .mb-3 {
            margin-bottom: 4px !important;
          }
          
          .mb-2 {
            margin-bottom: 2px !important;
          }
          
          .my-4 {
            margin: 6px 0 !important;
          }
          
          .mt-6,
          .mt-4 {
            margin-top: 6px !important;
          }
          
          .mt-8 {
            margin-top: 4px !important;
          }
          
          .py-2 {
            padding: 2px 0 !important;
          }
          
          .px-3 {
            padding: 0 6px !important;
          }
          
          .gap-8 {
            gap: 4px !important;
          }
          
          .gap-4 {
            gap: 4px !important;
          }
          
          .text-xl {
            font-size: 14px !important;
          }
          
          .text-2xl {
            font-size: 13px !important;
          }
          
          .text-lg {
            font-size: 12px !important;
          }
          
          .text-xs {
            font-size: 9px !important;
          }
          
          .ant-tag {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
          
          .grid-cols-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
          }
          
          .w-full {
            width: 100%;
          }
          
          .border-t {
            border-top: 1px solid #ccc;
            padding-top: 2px;
          }
          
          /* Logo and Header Styles for Print */
          img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          
          /* Header flex layout for print */
          [style*="display: flex"] {
            display: flex !important;
          }
          
          div[style*="flex"] {
            display: flex !important;
          }
        }
      `}</style>
    </Modal>
  );
};

export default PaymentReceipt;
