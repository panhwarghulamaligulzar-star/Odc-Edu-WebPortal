import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  DatePicker,
  Button,
  message,
  Card,
  Descriptions,
  Space,
  Tag,
  Typography,
  Divider,
  Checkbox,
  Row,
  Col,
} from "antd";
import {
  DollarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  recordFeePayment,
  getNextVoucherNumber,
} from "../../services/feeService";
import {
  getPaymentMethods,
  createPaymentMethod,
} from "../../services/accountingService";
import academyConfig from "../../config/academyConfig";
import PaymentReceipt from "./PaymentReceipt";
import dayjs from "dayjs";
import { formatDateOnlyForApi } from "../../utils/date";

const { TextArea } = Input;
const { Text, Title } = Typography;

/**
 * FeePaymentForm Component
 * Handles fee payment recording with receipt generation
 * Supports single and multiple installment payments
 */
const FeePaymentFormEnhanced = ({
  visible,
  onClose,
  onPaymentSuccess,
  feeStructure,
  studentInfo,
  selectedInstallment = null,
  initialSelectedInstallments = [],
  initialSelectedPaymentRows = [],
}) => {
  const [form] = Form.useForm();
  const initRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [selectedInstallments, setSelectedInstallments] = useState([]);
  const [currentVoucherNo, setCurrentVoucherNo] = useState("");
  const [payMultiple, setPayMultiple] = useState(false);
  const [accountingMethods, setAccountingMethods] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [customPaymentMethodValue, setCustomPaymentMethodValue] = useState("");
  const CUSTOM_PAYMENT_METHOD_ID = "__custom_payment_method__";
  const hasMixedCourseSelection = initialSelectedPaymentRows.length > 0;
  const selectedInstallmentsKey = useMemo(
    () => initialSelectedInstallments.join(","),
    [initialSelectedInstallments],
  );
  const selectedPaymentRowsKey = useMemo(
    () =>
      initialSelectedPaymentRows
        .map(
          (row) =>
            `${row.rowId || row.installmentNumber}-${row.feeStructureId || row.courseId}-${row.remainingAmount || 0}`,
        )
        .join("|"),
    [initialSelectedPaymentRows],
  );
  const defaultAccountingMethodId = useMemo(
    () =>
      accountingMethods.find((m) => m.isDefault)?._id ||
      accountingMethods[0]?._id ||
      undefined,
    [accountingMethods],
  );

  const getInstallmentRemaining = (installment) =>
    Math.max(
      0,
      Number(installment?.amount || 0) - Number(installment?.paidAmount || 0),
    );

  const getOverallRemaining = () =>
    Math.max(0, Number(feeStructure?.remainingAmount || 0));

  const getSelectedInstallmentDueDate = () => {
    if (selectedInstallment?.dueDate) {
      return dayjs(selectedInstallment.dueDate);
    }

    if (hasMixedCourseSelection && initialSelectedPaymentRows.length > 0) {
      const firstDueDate = initialSelectedPaymentRows.find(
        (item) => item?.dueDate,
      )?.dueDate;
      return firstDueDate ? dayjs(firstDueDate) : dayjs();
    }

    if (initialSelectedInstallments.length > 0 && feeStructure?.installments) {
      const firstInstallment = feeStructure.installments.find((item) =>
        initialSelectedInstallments.includes(item.installmentNumber),
      );
      if (firstInstallment?.dueDate) {
        return dayjs(firstInstallment.dueDate);
      }
    }

    return dayjs();
  };

  // Fetch real accounting payment methods on mount
  useEffect(() => {
    const loadMethods = async () => {
      setMethodsLoading(true);
      try {
        const res = await getPaymentMethods();
        if (res?.success)
          setAccountingMethods(res.data.filter((m) => m.isActive));
      } catch (e) {
        console.error("Failed to load payment methods", e);
      } finally {
        setMethodsLoading(false);
      }
    };
    loadMethods();
  }, []);

  // Fetch voucher number when modal opens
  useEffect(() => {
    if (visible) {
      fetchVoucherNumber();
    }
  }, [visible]);

  // Fetch voucher number from backend
  const fetchVoucherNumber = async () => {
    try {
      const response = await getNextVoucherNumber();
      if (response.success) {
        setCurrentVoucherNo(response.data.voucherNo);
      }
    } catch (error) {
      console.error("Error fetching voucher number:", error);
      // Fallback to local generation
      setCurrentVoucherNo("001");
    }
  };

  // Get unpaid or partial installments
  const getPayableInstallments = () => {
    if (!feeStructure?.installments) return [];
    return feeStructure.installments.filter((inst) => inst.status !== "Paid");
  };

  // Handle installment checkbox change
  const handleInstallmentChange = (checkedValues) => {
    setSelectedInstallments(checkedValues);
    const totalAmount = calculateInstallmentsPayableTotal(checkedValues);
    form.setFieldsValue({ amount: totalAmount });
  };

  // Calculate total for selected installments
  const calculateInstallmentsPayableTotal = (installmentNumbers = []) => {
    const rawTotal = installmentNumbers.reduce((sum, instNum) => {
      const inst = feeStructure?.installments?.find(
        (item) => item.installmentNumber === instNum,
      );
      return sum + getInstallmentRemaining(inst);
    }, 0);

    return Math.min(rawTotal, getOverallRemaining() || rawTotal);
  };

  const calculateSelectedTotal = () => {
    return calculateInstallmentsPayableTotal(selectedInstallments);
  };

  // Helper — get the method name string from selected method _id
  const getMethodName = (methodId) => {
    const m = accountingMethods.find((x) => x._id === methodId);
    return m ? m.name : methodId || "Cash";
  };

  const buildCombinedReceiptData = (results = [], rows = []) => {
    if (!results.length) return null;

    const firstPayment = results[0]?.payment || {};
    const firstFeeStructure = results[0]?.feeStructure || {};
    const installmentItems = results.map((result, index) => {
      const payment = result?.payment || {};
      const sourceRow = rows[index] || null;
      const matchingInstallment = Array.isArray(firstFeeStructure?.installments)
        ? firstFeeStructure.installments.find(
            (item) =>
              Number(item?.installmentNumber) === Number(payment?.installmentNumber),
          ) || null
        : null;

      return {
        receiptNo: payment.receiptNo || sourceRow?.receiptNo || null,
        voucherNo: payment.voucherNo || sourceRow?.voucherNo || null,
        installmentNumber:
          payment.installmentNumber || sourceRow?.installmentNumber || null,
        description:
          sourceRow?.description ||
          matchingInstallment?.description ||
          `Installment #${payment.installmentNumber || index + 1}`,
        amount: Number(payment.amount || sourceRow?.remainingAmount || 0),
        dueDate:
          sourceRow?.dueDate || matchingInstallment?.dueDate || payment.paymentDate || null,
        feeComponents:
          result?.payment?.feeComponents ||
          matchingInstallment?.feeComponents ||
          null,
      };
    });

    return {
      ...firstPayment,
      receiptNo: installmentItems.map((item) => item.receiptNo).filter(Boolean).join(", "),
      voucherNo: installmentItems.map((item) => item.voucherNo).filter(Boolean).join(", "),
      amount: installmentItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
      paymentType: "Multiple Installments",
      installmentNumber: null,
      installmentItems,
      student: {
        ...firstPayment.student,
        ...studentInfo,
      },
      feeStructure: firstFeeStructure,
      course: firstPayment.course,
    };
  };

  const ensureSelectedPaymentMethod = async () => {
    const selectedMethodId = form.getFieldValue("accountingPaymentMethodId");
    const customName = String(
      form.getFieldValue("customPaymentMethodName") || customPaymentMethodValue || "",
    )
      .trim();

    if (selectedMethodId && selectedMethodId !== CUSTOM_PAYMENT_METHOD_ID) {
      return {
        id: selectedMethodId,
        name: getMethodName(selectedMethodId),
      };
    }

    if (!customName) {
      throw new Error("Please enter a custom payment method name");
    }

    const existingMethod = accountingMethods.find(
      (method) =>
        String(method?.name || "").trim().toLowerCase() === customName.toLowerCase(),
    );

    if (existingMethod) {
      form.setFieldValue("accountingPaymentMethodId", existingMethod._id);
      setCustomPaymentMethodValue(existingMethod.name);
      return { id: existingMethod._id, name: existingMethod.name };
    }

    const res = await createPaymentMethod({
      name: customName,
      type: "other",
      openingBalance: 0,
      bankDetails: {},
    });

    if (res?.success && res.data) {
      setAccountingMethods((prev) => {
        const next = prev.filter((item) => item._id !== res.data._id);
        return [...next, res.data];
      });
      form.setFieldValue("accountingPaymentMethodId", res.data._id);
      setCustomPaymentMethodValue(res.data.name);
      return { id: res.data._id, name: res.data.name };
    }

    return { id: null, name: customName };
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const paymentMethodResult = await ensureSelectedPaymentMethod();
      const normalizedPaymentDate =
        formatDateOnlyForApi(values.paymentDate) ||
        formatDateOnlyForApi(dayjs());

      let paymentPayload;

      if (hasMixedCourseSelection) {
        const payableRows = initialSelectedPaymentRows.filter(
          (row) =>
            row.installmentNumber &&
            row.status !== "Paid" &&
            Number(row.remainingAmount || 0) > 0,
        );

        if (payableRows.length === 0) {
          message.warning("No pending installments selected for payment.");
          return;
        }

        const results = [];
        for (const row of payableRows) {
          const voucherResponse = await getNextVoucherNumber();
          const voucherNum = voucherResponse.success
            ? voucherResponse.data.voucherNo
            : String(results.length + 1).padStart(3, "0");

          const rowPayload = {
            studentId:
              row.studentId ||
              feeStructure?.student?._id ||
              feeStructure?.student ||
              studentInfo?._id,
            courseId: row.courseId,
            feeStructureId: row.feeStructureId,
            amount: Number(row.remainingAmount || 0),
            paymentDate: normalizedPaymentDate,
            paymentMethod: paymentMethodResult.name,
            accountingPaymentMethodId: paymentMethodResult.id || null,
            transactionId: values.transactionId,
            chequeNo: values.chequeNo,
            bankName: values.bankName,
            voucherNo: voucherNum,
            remarks: values.remarks,
            installmentNumber: row.installmentNumber,
            paymentType: "Installment",
          };

          const response = await recordFeePayment(rowPayload);
          if (response.success) {
            results.push(response.data);
          }
        }

        if (results.length > 0) {
          const totalPaid = payableRows.reduce(
            (sum, row) => sum + Number(row.remainingAmount || 0),
            0,
          );
          message.success(
            `Successfully paid ${results.length} installment(s) for ${formatCurrency(totalPaid)}.`,
          );

          const enrichedPaymentData = buildCombinedReceiptData(results, payableRows);
          setPaymentData(enrichedPaymentData);
          setReceiptVisible(true);
          form.resetFields();
          setSelectedInstallments([]);
          if (onPaymentSuccess) {
            onPaymentSuccess(results[results.length - 1]);
          }
        }
        return;
      }

      if (payMultiple && selectedInstallments.length > 0) {
        // Pay multiple installments
        const results = [];
        for (const instNum of selectedInstallments) {
          const inst = feeStructure.installments.find(
            (i) => i.installmentNumber === instNum,
          );
          const voucherResponse = await getNextVoucherNumber();
          const voucherNum = voucherResponse.success
            ? voucherResponse.data.voucherNo
            : String(results.length + 1).padStart(3, "0");

          const instPayload = {
            studentId: feeStructure.student._id || feeStructure.student,
            courseId: feeStructure.course._id || feeStructure.course,
            feeStructureId: feeStructure._id,
            amount: Math.min(
              getInstallmentRemaining(inst),
              getOverallRemaining() || getInstallmentRemaining(inst),
            ),
            paymentDate: normalizedPaymentDate,
            paymentMethod: paymentMethodResult.name,
            accountingPaymentMethodId: paymentMethodResult.id || null,
            transactionId: values.transactionId,
            chequeNo: values.chequeNo,
            bankName: values.bankName,
            voucherNo: voucherNum,
            remarks: values.remarks,
            installmentNumber: instNum,
            paymentType: "Installment",
          };
          const response = await recordFeePayment(instPayload);
          if (response.success) {
            results.push(response.data);
          }
        }

        if (results.length > 0) {
          message.success(`Successfully paid ${results.length} installments!`);
          const selectedRows = selectedInstallments
            .map((instNum) =>
              feeStructure.installments.find(
                (item) => item.installmentNumber === instNum,
              ),
            )
            .filter(Boolean)
            .map((item) => ({
              installmentNumber: item.installmentNumber,
              description: item.description,
              remainingAmount: item.amount - (item.paidAmount || 0),
              dueDate: item.dueDate,
              receiptNo: item.receiptNumber || null,
              voucherNo: item.voucherNo || null,
            }));
          const enrichedPaymentData = buildCombinedReceiptData(results, selectedRows);
          setPaymentData(enrichedPaymentData);
          setReceiptVisible(true);
          form.resetFields();
          setSelectedInstallments([]);
          if (onPaymentSuccess) {
            onPaymentSuccess(results[results.length - 1]);
          }
        }
        return;
      }

      // Single installment or partial payment
      const voucherResponse = await getNextVoucherNumber();
      const voucherNum = voucherResponse.success
        ? voucherResponse.data.voucherNo
        : currentVoucherNo;

      paymentPayload = {
        studentId: feeStructure.student._id || feeStructure.student,
        courseId: feeStructure.course._id || feeStructure.course,
        feeStructureId: feeStructure._id,
        amount: values.amount,
        paymentDate: normalizedPaymentDate,
        paymentMethod: paymentMethodResult.name,
        accountingPaymentMethodId: paymentMethodResult.id || null,
        transactionId: values.transactionId,
        chequeNo: values.chequeNo,
        bankName: values.bankName,
        voucherNo: voucherNum,
        remarks: values.remarks,
        installmentNumber: selectedInstallment?.installmentNumber || null,
        paymentType: selectedInstallment
          ? "Installment"
          : values.paymentType || "Partial",
      };

      const response = await recordFeePayment(paymentPayload);

      if (response.success) {
        message.success("Payment recorded successfully!");

        const enrichedPaymentData = {
          ...response.data.payment,
          student: {
            ...response.data.payment.student,
            ...studentInfo,
          },
          feeStructure: response.data.feeStructure,
        };

        setPaymentData(enrichedPaymentData);
        setReceiptVisible(true);
        form.resetFields();
        if (onPaymentSuccess) {
          await Promise.resolve(onPaymentSuccess(response.data));
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      message.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedInstallments([]);
    setPayMultiple(false);
    setCustomPaymentMethodValue("");
    onClose();
  };

  const handleReceiptClose = () => {
    setReceiptVisible(false);
    onClose();
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || 0}`;
  };

  useEffect(() => {
    if (!visible) {
      initRef.current = "";
      return;
    }

    const initSignature = [
      feeStructure?._id || "no-fee-structure",
      selectedInstallment?.installmentNumber || "single",
      hasMixedCourseSelection ? "mixed" : "simple",
      selectedInstallmentsKey,
      selectedPaymentRowsKey,
    ].join("::");

    if (initRef.current === initSignature) {
      return;
    }

    initRef.current = initSignature;

    const shouldPayMultiple =
      hasMixedCourseSelection || initialSelectedInstallments.length > 0;
    const nextSelectedInstallments = hasMixedCourseSelection
      ? []
      : initialSelectedInstallments;

    setSelectedInstallments(nextSelectedInstallments);
    setPayMultiple(shouldPayMultiple);

    form.setFieldsValue({
      amount: getDefaultAmount(),
      paymentDate: getSelectedInstallmentDueDate(),
      accountingPaymentMethodId:
        form.getFieldValue("accountingPaymentMethodId") ||
        defaultAccountingMethodId,
      paymentType: "Partial",
      voucherNo: currentVoucherNo || undefined,
    });
  }, [
    visible,
    hasMixedCourseSelection,
    selectedInstallmentsKey,
    selectedPaymentRowsKey,
    initialSelectedInstallments,
    feeStructure,
    selectedInstallment,
    currentVoucherNo,
    defaultAccountingMethodId,
    form,
  ]);

  useEffect(() => {
    if (!visible || !currentVoucherNo) return;
    form.setFieldValue("voucherNo", currentVoucherNo);
  }, [visible, currentVoucherNo, form]);

  const getDefaultAmount = () => {
    if (hasMixedCourseSelection) {
      return initialSelectedPaymentRows.reduce(
        (sum, row) => sum + Number(row.remainingAmount || 0),
        0,
      );
    }
    if (selectedInstallment) {
      return Math.min(
        getInstallmentRemaining(selectedInstallment),
        getOverallRemaining() || getInstallmentRemaining(selectedInstallment),
      );
    }
    if (payMultiple && selectedInstallments.length > 0) {
      return calculateSelectedTotal();
    }
    return getOverallRemaining();
  };

  const getMaxAmount = () => {
    if (hasMixedCourseSelection) {
      return initialSelectedPaymentRows.reduce(
        (sum, row) => sum + Number(row.remainingAmount || 0),
        0,
      );
    }
    if (selectedInstallment) {
      return Math.min(
        getInstallmentRemaining(selectedInstallment),
        getOverallRemaining() || getInstallmentRemaining(selectedInstallment),
      );
    }
    if (payMultiple && selectedInstallments.length > 0) {
      return calculateSelectedTotal();
    }
    return getOverallRemaining();
  };

  const payableInstallments = getPayableInstallments();

  return (
    <>
      <Modal
        open={visible}
        destroyOnHidden
        title={
          <Space>
            <DollarOutlined />
            <span>Record Fee Payment</span>
          </Space>
        }
        onCancel={handleCancel}
        width={payMultiple ? 800 : 700}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            icon={<CheckCircleOutlined />}
            onClick={() => form.submit()}
          >
            Record Payment
          </Button>,
        ]}
      >
        {/* Student & Course Info */}
        <Card size="small" className="mb-4 bg-gray-50">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Student">
              <Text strong>{studentInfo?.studentName || "N/A"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Registration No">
              {studentInfo?.registrationNo || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Course">
              {hasMixedCourseSelection
                ? `${new Set(initialSelectedPaymentRows.map((item) => item.courseName).filter(Boolean)).size} course(s) selected`
                : feeStructure?.course?.courseName || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Fee Status">
              <Tag
                color={
                  hasMixedCourseSelection
                    ? "blue"
                    : feeStructure?.feeStatus === "Paid"
                    ? "green"
                    : feeStructure?.feeStatus === "Partial"
                      ? "orange"
                      : "red"
                }
              >
                {hasMixedCourseSelection ? "Batch Payment" : feeStructure?.feeStatus || "N/A"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Divider className="my-3" />

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Text type="secondary" className="text-xs">
                Total Fee
              </Text>
              <div className="text-lg font-bold">
                {formatCurrency(
                  hasMixedCourseSelection
                    ? initialSelectedPaymentRows.reduce(
                        (sum, row) => sum + Number(row.amount || 0),
                        0,
                      )
                    : feeStructure?.totalFee,
                )}
              </div>
            </div>
            <div className="text-center">
              <Text type="secondary" className="text-xs">
                Paid Amount
              </Text>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(
                  hasMixedCourseSelection
                    ? initialSelectedPaymentRows.reduce(
                        (sum, row) => sum + Number(row.paidAmount || 0),
                        0,
                      )
                    : feeStructure?.paidAmount,
                )}
              </div>
            </div>
            <div className="text-center">
              <Text type="secondary" className="text-xs">
                Remaining
              </Text>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(
                  hasMixedCourseSelection
                    ? initialSelectedPaymentRows.reduce(
                        (sum, row) => sum + Number(row.remainingAmount || 0),
                        0,
                      )
                    : feeStructure?.remainingAmount,
                )}
              </div>
            </div>
          </div>
        </Card>

        {hasMixedCourseSelection && (
          <Card
            size="small"
            className="mb-4 border border-gray-200"
            title={
              <span className="text-sm font-semibold text-gray-700">
                Selected Installments
              </span>
            }
          >
            <div className="space-y-3">
              {initialSelectedPaymentRows.map((row) => (
                <div
                  key={row.rowId}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-800">
                        {row.courseName || "Course"} - Installment #{row.installmentNumber}
                      </div>
                      <div className="text-sm text-slate-500">
                        {row.description || "Installment payment"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(row.remainingAmount)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Due {row.dueDate ? dayjs(row.dueDate).format("DD MMM YYYY") : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pay Multiple Installments Option */}
        {!hasMixedCourseSelection && !selectedInstallment && payableInstallments.length > 0 && (
          <Card size="small" className="mb-4">
            <Checkbox
              checked={payMultiple}
              disabled={initialSelectedInstallments.length > 0}
              onChange={(e) => setPayMultiple(e.target.checked)}
            >
              <Text strong>Pay Multiple Installments at Once</Text>
            </Checkbox>
          </Card>
        )}

        {/* Multiple Installment Selection */}
        {payMultiple && (
          <Card
            size="small"
            className="mb-4 border border-gray-200"
            title={
              <span className="text-sm font-semibold text-gray-700">
                Select Installments to Pay
              </span>
            }
          >
            <Checkbox.Group
              value={selectedInstallments}
              onChange={handleInstallmentChange}
            >
              <Row gutter={[16, 16]}>
                {payableInstallments.map((inst) => (
                  <Col span={8} key={inst.installmentNumber}>
                    <Checkbox value={inst.installmentNumber}>
                      <Card
                        size="small"
                        className="w-full border-gray-200 hover:border-blue-400 transition-colors"
                        title={
                          <span className="text-sm font-medium text-gray-800">
                            Installment #{inst.installmentNumber}
                          </span>
                        }
                      >
                        <div className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(inst.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-500">Paid:</span>
                            <span className="text-green-600">
                              {formatCurrency(inst.paidAmount || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-500">Due:</span>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(
                                inst.amount - (inst.paidAmount || 0),
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Due Date:</span>
                            <span className="text-gray-700">
                              {new Date(inst.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
            {selectedInstallments.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                <Text strong className="text-gray-800">
                  Total Amount: {formatCurrency(calculateSelectedTotal())}
                </Text>
                <br />
                <Text type="secondary" className="text-sm">
                  {selectedInstallments.length} installment(s) selected
                </Text>
              </div>
            )}
          </Card>
        )}

        {/* Selected Installment Info (for single installment mode) */}
        {selectedInstallment && (
          <Card
            size="small"
            className="mb-4 border border-gray-200"
            title={
              <span className="text-sm font-semibold text-gray-700">
                Installment #{selectedInstallment.installmentNumber}
              </span>
            }
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item
                label={
                  <span className="text-gray-500 text-sm">Description</span>
                }
              >
                <span className="text-gray-800">
                  {selectedInstallment.description}
                </span>
              </Descriptions.Item>
              <Descriptions.Item
                label={<span className="text-gray-500 text-sm">Due Date</span>}
              >
                <span className="text-gray-800">
                  {new Date(selectedInstallment.dueDate).toLocaleDateString()}
                </span>
              </Descriptions.Item>
              <Descriptions.Item
                label={<span className="text-gray-500 text-sm">Amount</span>}
              >
                <span className="font-semibold text-gray-800">
                  {formatCurrency(selectedInstallment.amount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item
                label={<span className="text-gray-500 text-sm">Paid</span>}
              >
                <span className="text-green-600">
                  {formatCurrency(selectedInstallment.paidAmount || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item
                label={<span className="text-gray-500 text-sm">Remaining</span>}
              >
                <span className="font-semibold text-red-600">
                  {formatCurrency(
                    selectedInstallment.amount -
                      (selectedInstallment.paidAmount || 0),
                  )}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Payment Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="amount"
            label="Payment Amount"
            rules={[
              { required: true, message: "Please enter payment amount" },
              {
                type: "number",
                min: 1,
                max: getMaxAmount(),
                message: `Amount must be between Rs. 1 and ${formatCurrency(
                  getMaxAmount(),
                )}`,
              },
            ]}
          >
            <InputNumber
              size="large"
              className="w-full"
              min={0}
              max={getMaxAmount()}
              prefix="Rs."
              placeholder="Enter payment amount"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              disabled={
                hasMixedCourseSelection ||
                (payMultiple && selectedInstallments.length > 0)
              }
            />
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="Payment Date"
            rules={[{ required: true, message: "Please select payment date" }]}
          >
            <DatePicker size="large" className="w-full" format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="accountingPaymentMethodId"
            label="Payment Method (Account)"
            rules={[
              { required: true, message: "Please select a payment method" },
            ]}
          >
            <Select
              size="large"
              placeholder={
                methodsLoading
                  ? "Loading accounts..."
                  : "Select payment account"
              }
              loading={methodsLoading}
              className="w-full"
              optionLabelProp="label"
              onChange={(value) => {
                if (value === CUSTOM_PAYMENT_METHOD_ID) {
                  form.setFieldValue("customPaymentMethodName", customPaymentMethodValue);
                }
              }}
            >
              {accountingMethods.map((m) => (
                <Select.Option key={m._id} value={m._id} label={m.name}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs ml-2">
                      <span
                        className={`px-2 py-0.5 rounded text-white text-xs ${
                          m.type === "cash"
                            ? "bg-green-500"
                            : m.type === "other"
                              ? "bg-purple-500"
                              : "bg-blue-500"
                        }`}
                      >
                        {m.type === "cash"
                          ? "Cash"
                          : m.type === "other"
                            ? "Other"
                            : "Bank"}
                      </span>
                      {m.currentBalance !== undefined && (
                        <span className="ml-2 text-gray-500">
                          Balance: Rs. {(m.currentBalance || 0).toLocaleString()}
                        </span>
                      )}
                    </span>
                  </div>
                </Select.Option>
              ))}
              <Select.Option value={CUSTOM_PAYMENT_METHOD_ID} label="Other (custom)">
                <span className="font-medium text-purple-700">Other (custom)</span>
              </Select.Option>
            </Select>
          </Form.Item>

          {form.getFieldValue("accountingPaymentMethodId") === CUSTOM_PAYMENT_METHOD_ID && (
            <Form.Item
              name="customPaymentMethodName"
              label="Custom Payment Method"
              rules={[
                { required: true, message: "Please type the custom payment method" },
              ]}
            >
              <Input
                size="large"
                placeholder="Type method name like Scholarship, Academy Support, etc."
                value={customPaymentMethodValue}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setCustomPaymentMethodValue(nextValue);
                  form.setFieldValue("customPaymentMethodName", nextValue);
                }}
              />
            </Form.Item>
          )}

          {accountingMethods.find(
            (m) => m._id === form.getFieldValue("accountingPaymentMethodId"),
          )?.type === "bank" && (
            <>
              <Form.Item
                name="transactionId"
                label="Transaction / Cheque Number"
                rules={[
                  {
                    required: true,
                    message: "Please enter Transaction or Cheque Number",
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder="Enter Transaction / Cheque Number"
                />
              </Form.Item>

              <Form.Item name="bankName" label="Bank Name">
                <Input size="large" placeholder="Bank name (optional)" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="voucherNo"
            label="Voucher No:"
            initialValue={currentVoucherNo}
          >
            <Input
              size="large"
              placeholder="Auto-generated"
              disabled
              className="bg-gray-100"
            />
          </Form.Item>

          <Form.Item
            name="remarks"
            label="Admin Note"
          >
            <TextArea
              rows={4}
              placeholder="Enter admin note for this installment payment"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment Receipt Modal */}
      <PaymentReceipt
        visible={receiptVisible}
        onClose={handleReceiptClose}
        paymentData={paymentData}
        institutionInfo={{
          name: academyConfig.name,
          address: academyConfig.address,
          phone: academyConfig.phone,
          email: academyConfig.email,
        }}
      />
    </>
  );
};

export default FeePaymentFormEnhanced;
