import {
  Modal,
  Form,
  Select,
  DatePicker,
  Button,
  InputNumber,
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Alert,
  Row,
  Col,
  Input,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { getBatchesByCourse } from "../../services/batchService";

const { Option } = Select;
const { Text } = Typography;

const PLAN_OPTIONS = [
  { value: "custom", label: "Custom plan", defaultDiscount: 0 },
  { value: "full_payment", label: "Full plan", defaultDiscount: 15 },
];

const ADDITIONAL_FEE_TYPES = [
  { value: "exam", label: "Exam Fee" },
  { value: "Library Charges", label: "Library Charges" },
  // { value: "practical", label: "Practical Fee" },
  { value: "other", label: "Other Fee" },
];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const addMonths = (dateValue, monthsToAdd) => {
  const date = dayjs(dateValue).toDate();
  date.setMonth(date.getMonth() + monthsToAdd);
  return dayjs(date);
};

const createAdditionalFeeRow = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  feeType: "exam",
  title: "Exam Fee",
  amount: 0,
  paymentMode: "one_time",
});

const getFeeTypeLabel = (feeType) =>
  ADDITIONAL_FEE_TYPES.find((item) => item.value === feeType)?.label || "Other Fee";

const sanitizeAdditionalFees = (rows = []) =>
  rows
    .map((row) => ({
      ...row,
      amount: round2(row.amount),
      title: (row.title || "").trim() || getFeeTypeLabel(row.feeType),
      paymentMode: row.paymentMode === "two_installments" ? "two_installments" : "one_time",
    }))
    .filter((row) => row.amount > 0);

const buildDistributedValues = (amount, count) => {
  const safeAmount = round2(amount);
  const safeCount = Math.max(1, Math.min(24, Number(count) || 1));

  if (safeAmount <= 0) {
    return Array.from({ length: safeCount }, () => 0);
  }

  const base = Math.floor((safeAmount / safeCount) * 100) / 100;
  let assigned = 0;

  return Array.from({ length: safeCount }, (_, index) => {
    const isLast = index === safeCount - 1;
    const value = isLast ? round2(safeAmount - assigned) : round2(base);
    assigned = round2(assigned + value);
    return value;
  });
};

const getFeeComponentKey = (feeType) => {
  if (feeType === "exam") return "examFee";
  if (feeType === "registration") return "registrationFee";
  if (feeType === "practical") return "practicalFee";
  return "otherFee";
};

const buildInstallments = (
  count,
  feeConfig,
  startDate,
  existing = [],
  additionalFees = [],
) => {
  const safeCount = Math.max(1, Math.min(24, Number(count) || 1));
  const effectiveCourseFee = round2(
    feeConfig.discountedCourseFee ?? feeConfig.courseFee,
  );
  const coursePlan = buildDistributedValues(effectiveCourseFee, safeCount);

  const baseInstallments = Array.from({ length: safeCount }, (_, index) => {
    const isFirst = index === 0;
    const isLast = index === safeCount - 1;
    const feeComponents = {
      admissionFee: isFirst ? round2(feeConfig.admissionFee) : 0,
      courseFee: coursePlan[index],
      certificateFee: isLast ? round2(feeConfig.certificateFee) : 0,
      examFee: 0,
      registrationFee: 0,
      practicalFee: 0,
      otherFee: 0,
    };
    const amount = round2(
      feeComponents.admissionFee +
        feeComponents.courseFee +
        feeComponents.certificateFee,
    );

    return {
      installmentNumber: index + 1,
      description:
        safeCount === 1
          ? "Full Payment"
          : isFirst
            ? "Admission Fee + Course Fee"
            : isLast
              ? "Course Fee + Certificate Fee"
              : `Course Fee Installment ${index + 1}`,
      amount,
      dueDate:
        existing[index]?.dueDate && dayjs(existing[index].dueDate).isValid()
          ? dayjs(existing[index].dueDate)
          : addMonths(startDate, index),
      status: existing[index]?.status || "Pending",
      paidAmount: existing[index]?.paidAmount || 0,
      feeComponents,
    };
  });

  const cleanAdditional = sanitizeAdditionalFees(additionalFees);
  const extraInstallments = [];
  let extraOffset = 0;

  cleanAdditional.forEach((fee) => {
    if (fee.paymentMode === "one_time") {
      const componentKey = getFeeComponentKey(fee.feeType);
      const baseIndex = safeCount + extraOffset;
      extraInstallments.push({
        installmentNumber: baseIndex + 1,
        description: `${fee.title}`,
        amount: fee.amount,
        dueDate: addMonths(startDate, baseIndex),
        status: "Pending",
        paidAmount: 0,
        feeComponents: {
          admissionFee: 0,
          courseFee: 0,
          certificateFee: 0,
          examFee: fee.feeType === "exam" ? fee.amount : 0,
          registrationFee: fee.feeType === "registration" ? fee.amount : 0,
          practicalFee: fee.feeType === "practical" ? fee.amount : 0,
          otherFee: !["exam", "registration", "practical"].includes(fee.feeType) ? fee.amount : 0,
          [componentKey]: fee.amount,
        },
      });
      extraOffset += 1;
      return;
    }

    const first = round2(Math.floor((fee.amount / 2) * 100) / 100);
    const second = round2(fee.amount - first);
    const baseIndex = safeCount + extraOffset;

    extraInstallments.push({
      installmentNumber: baseIndex + 1,
      description: `${fee.title} - Installment 1/2`,
      amount: first,
      dueDate: addMonths(startDate, baseIndex),
      status: "Pending",
      paidAmount: 0,
      feeComponents: {
        admissionFee: 0,
        courseFee: 0,
        certificateFee: 0,
        examFee: fee.feeType === "exam" ? first : 0,
        registrationFee: fee.feeType === "registration" ? first : 0,
        practicalFee: fee.feeType === "practical" ? first : 0,
        otherFee: fee.feeType === "other" ? first : 0,
      },
    });

    extraInstallments.push({
      installmentNumber: baseIndex + 2,
      description: `${fee.title} - Installment 2/2`,
      amount: second,
      dueDate: addMonths(startDate, baseIndex + 1),
      status: "Pending",
      paidAmount: 0,
      feeComponents: {
        admissionFee: 0,
        courseFee: 0,
        certificateFee: 0,
        examFee: fee.feeType === "exam" ? second : 0,
        registrationFee: fee.feeType === "registration" ? second : 0,
        practicalFee: fee.feeType === "practical" ? second : 0,
        otherFee: fee.feeType === "other" ? second : 0,
      },
    });
    extraOffset += 2;
  });

  const combined = [...baseInstallments, ...extraInstallments].map((item, index) => ({
    ...item,
    installmentNumber: index + 1,
  }));

  // Ensure installment totals always reflect final discounted fee.
  const currentTotal = round2(combined.reduce((sum, item) => sum + item.amount, 0));
  const targetTotal = round2(feeConfig.finalFee ?? currentTotal);
  const diff = round2(targetTotal - currentTotal);
  if (combined.length > 0 && diff !== 0) {
    const lastIndex = combined.length - 1;
    combined[lastIndex] = {
      ...combined[lastIndex],
      amount: round2(combined[lastIndex].amount + diff),
    };
  }

  return combined;
};

const CourseAssignmentForm = ({
  visible,
  onCancel,
  onFinish,
  form,
  courses,
  selectedStudent,
  loading,
  editingEnrollment,
}) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [additionalFees, setAdditionalFees] = useState([]);
  const [editingFeeModal, setEditingFeeModal] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [editingFeeValue, setEditingFeeValue] = useState(0);
  const [overriddenFees, setOverriddenFees] = useState({
    admissionFee: null,
    courseFee: null,
    certificateFee: null,
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // Ref to prevent courseId effect from resetting form values during edit initialization
  const isInitializingEditRef = useRef(false);
  // Ref to prevent paymentPlanType effect from overwriting saved discount/installments on init
  const isInitPaymentPlanRef = useRef(false);
  // Ref to track previous enrollment date for installment date recalculation
  const prevEnrollmentDateRef = useRef(null);

  const courseId = Form.useWatch("courseId", form);
  const enrollmentDate = Form.useWatch("enrollmentDate", form);
  const paymentPlanType = Form.useWatch("paymentPlanType", form);
  const discountPercentage = Form.useWatch("discountPercentage", form) || 0;
  const numberOfInstallments = Form.useWatch("numberOfInstallments", form) || 1;

  const baseFee = useMemo(() => {
    if (!selectedCourse) {
      return {
        admissionFee: 0,
        courseFee: 0,
        discountedCourseFee: 0,
        certificateFee: 0,
        additionalFeesTotal: 0,
        totalBeforeDiscount: 0,
        discountAmount: 0,
        finalFee: 0,
      };
    }

    const admissionFee = round2(
      overriddenFees.admissionFee !== null
        ? overriddenFees.admissionFee
        : selectedCourse.admissionFee || 0
    );
    const courseFee = round2(
      overriddenFees.courseFee !== null
        ? overriddenFees.courseFee
        : selectedCourse.courseFee || 0
    );
    const certificateFee = round2(
      overriddenFees.certificateFee !== null
        ? overriddenFees.certificateFee
        : selectedCourse.certificateFee || 0
    );
    const additionalFeesTotal = round2(
      sanitizeAdditionalFees(additionalFees).reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
    );

    const totalBeforeDiscount = round2(
      admissionFee + courseFee + certificateFee + additionalFeesTotal,
    );
    const discountAmount = round2(
      Math.min(courseFee, (courseFee * discountPercentage) / 100),
    );
    const discountedCourseFee = round2(Math.max(0, courseFee - discountAmount));
    const finalFee = round2(Math.max(0, totalBeforeDiscount - discountAmount));

    return {
      admissionFee,
      courseFee,
      discountedCourseFee,
      certificateFee,
      additionalFeesTotal,
      totalBeforeDiscount,
      discountAmount,
      finalFee,
    };
  }, [selectedCourse, additionalFees, discountPercentage, overriddenFees]);

  const fetchBatches = async (selectedCourseId) => {
    setLoadingBatches(true);
    try {
      const response = await getBatchesByCourse(selectedCourseId);
      if (response.success) {
        const active = response.data.filter(
          (batch) => batch.status === "Active" || batch.status === "Upcoming",
        );
        setBatches(active);
      } else {
        setBatches([]);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setSelectedCourse(null);
      setInstallments([]);
      setBatches([]);
      setAdditionalFees([]);
      setOverriddenFees({
        admissionFee: null,
        courseFee: null,
        certificateFee: null,
      });
      setIsEditMode(false);
      isInitializingEditRef.current = false;
      prevEnrollmentDateRef.current = null;
      return;
    }

    if (editingEnrollment) {
      // Edit mode - fee data lives in feeStructure (separate document), not enrollment itself
      isInitializingEditRef.current = true;
      isInitPaymentPlanRef.current = true;
      setIsEditMode(true);
      const enrollment = editingEnrollment;
      const fs = enrollment.feeStructure;

      form.setFieldsValue({
        courseId: enrollment.course?._id,
        enrollmentDate: dayjs(enrollment.enrollmentDate),
        batchId: enrollment.batch?._id || null,
        paymentPlanType: fs?.paymentPlanType || "custom",
        discountPercentage: fs?.discountPercentage || 0,
        numberOfInstallments: fs?.numberOfInstallments || 2,
      });

      prevEnrollmentDateRef.current = enrollment.enrollmentDate;

      // Load course details
      const course = courses.find((c) => c._id === enrollment.course?._id);
      if (course) {
        setSelectedCourse(course);
        fetchBatches(course._id);
      }

      // Set overridden fees from feeStructure (not from enrollment document)
      setOverriddenFees({
        admissionFee: fs?.admissionFee ?? null,
        courseFee: fs?.courseFee ?? null,
        certificateFee: fs?.certificateFee ?? null,
      });

      // Set additional fees from feeStructure
      if (fs?.additionalFees?.length > 0) {
        setAdditionalFees(
          fs.additionalFees.map((fee, idx) => ({
            id: `${Date.now()}-${idx}`,
            feeType: fee.feeType || "exam",
            title: fee.title,
            amount: fee.amount,
            paymentMode: fee.paymentMode || "one_time",
          }))
        );
      } else {
        setAdditionalFees([createAdditionalFeeRow()]);
      }

      // Set installments from feeStructure
      if (fs?.installments?.length > 0) {
        setInstallments(fs.installments);
      }
    } else {
      // Create mode
      setIsEditMode(false);
      isInitializingEditRef.current = false;
      isInitPaymentPlanRef.current = false;
      setAdditionalFees([createAdditionalFeeRow()]);
      setOverriddenFees({
        admissionFee: null,
        courseFee: null,
        certificateFee: null,
      });
      prevEnrollmentDateRef.current = null;
      form.setFieldsValue({
        paymentPlanType: "custom",
        discountPercentage: 0,
        numberOfInstallments: 2,
        enrollmentDate: dayjs(),
      });
    }
  }, [visible, editingEnrollment, form, courses]);

  useEffect(() => {
    if (!courseId) {
      setSelectedCourse(null);
      setInstallments([]);
      isInitializingEditRef.current = false;
      return;
    }

    const course = courses.find((item) => item._id === courseId) || null;
    setSelectedCourse(course);
    fetchBatches(courseId);

    // Don't reset batch/installment count when opening an existing enrollment for editing
    if (!isInitializingEditRef.current) {
      form.setFieldValue("batchId", null);
      // Clear fee overrides so the newly selected course's default fees are shown
      setOverriddenFees({
        admissionFee: null,
        courseFee: null,
        certificateFee: null,
      });

      if (course) {
        let defaultCount = 2;
        if (paymentPlanType === "full_payment") {
          defaultCount = 1;
        }
        form.setFieldValue("numberOfInstallments", defaultCount);
      }
    }

    // Clear the initialization flag after the first run so future course changes work normally
    isInitializingEditRef.current = false;
  }, [courseId, courses, form, paymentPlanType]);

  useEffect(() => {
    if (!paymentPlanType) return;

    // Skip auto-defaults during edit initialization — preserve saved values
    if (isInitPaymentPlanRef.current) {
      isInitPaymentPlanRef.current = false;
      return;
    }

    const plan = PLAN_OPTIONS.find((item) => item.value === paymentPlanType);
    if (plan) {
      form.setFieldValue("discountPercentage", plan.defaultDiscount);
    }

    if (paymentPlanType === "full_payment") {
      form.setFieldValue("numberOfInstallments", 1);
      return;
    }

    if (paymentPlanType === "custom") {
      const current = Number(form.getFieldValue("numberOfInstallments")) || 0;
      if (current < 2) {
        form.setFieldValue("numberOfInstallments", 2);
      }
    }
  }, [paymentPlanType, form]);

  useEffect(() => {
    if (!selectedCourse || !enrollmentDate) {
      setInstallments([]);
      prevEnrollmentDateRef.current = null;
      return;
    }

    // When the enrollment date changes, recalculate all due dates from the new date
    // rather than preserving the old dates from existing installments
    const prevDate = prevEnrollmentDateRef.current;
    const dateChanged =
      prevDate !== null && !dayjs(enrollmentDate).isSame(dayjs(prevDate), "day");
    prevEnrollmentDateRef.current = enrollmentDate;

    setInstallments((prev) =>
      buildInstallments(
        numberOfInstallments,
        baseFee,
        enrollmentDate,
        dateChanged ? [] : prev,
        additionalFees,
      ),
    );
  }, [selectedCourse, enrollmentDate, numberOfInstallments, baseFee, additionalFees]);

  const addAdditionalFee = () => {
    setAdditionalFees((prev) => [...prev, createAdditionalFeeRow()]);
  };

  const removeAdditionalFee = (id) => {
    setAdditionalFees((prev) => prev.filter((item) => item.id !== id));
  };

  const updateAdditionalFee = (id, updates) => {
    setAdditionalFees((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...updates };
        if (updates.feeType) {
          if (!item.title || item.title === getFeeTypeLabel(item.feeType)) {
            merged.title = getFeeTypeLabel(updates.feeType);
          }
        }
        return merged;
      }),
    );
  };

  const updateInstallmentDueDate = (index, dateValue) => {
    setInstallments((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              dueDate: dateValue,
            }
          : item,
      ),
    );
  };

  const openFeeEditModal = (feeType, currentValue) => {
    setEditingFeeType(feeType);
    setEditingFeeValue(currentValue);
    setEditingFeeModal(true);
  };

  const closeFeeEditModal = () => {
    setEditingFeeModal(false);
    setEditingFeeType(null);
    setEditingFeeValue(0);
  };

  const saveFeeEdit = () => {
    setOverriddenFees((prev) => ({
      ...prev,
      [editingFeeType]: round2(editingFeeValue),
    }));
    closeFeeEditModal();
  };

  const handleSubmit = (values) => {
    const cleanedAdditionalFees = sanitizeAdditionalFees(additionalFees);
    
    // Validate that fees are not negative
    if (baseFee.admissionFee < 0 || baseFee.courseFee < 0 || baseFee.certificateFee < 0) {
      console.error("Invalid fee values detected:", baseFee);
      return;
    }

    // Format installments properly for backend
    const formattedInstallments = installments.map((inst) => ({
      installmentNumber: inst.installmentNumber,
      description: inst.description,
      amount: round2(inst.amount),
      dueDate: inst.dueDate?.format("YYYY-MM-DD") || inst.dueDate,
      status: inst.status || "Pending",
      paidAmount: inst.paidAmount || 0,
      feeComponents: {
        admissionFee: round2(inst.feeComponents?.admissionFee || 0),
        courseFee: round2(inst.feeComponents?.courseFee || 0),
        certificateFee: round2(inst.feeComponents?.certificateFee || 0),
        examFee: round2(inst.feeComponents?.examFee || 0),
        registrationFee: round2(inst.feeComponents?.registrationFee || 0),
        practicalFee: round2(inst.feeComponents?.practicalFee || 0),
        otherFee: round2(inst.feeComponents?.otherFee || 0),
      },
    }));

    const payload = {
      ...values,
      // Include overridden/custom fees - these will override course defaults in backend
      admissionFee: baseFee.admissionFee,
      courseFee: baseFee.courseFee,
      certificateFee: baseFee.certificateFee,
      examFee: 0,
      registrationFee: 0,
      practicalFee: 0,
      otherFee: 0,
      additionalFees: cleanedAdditionalFees,
      totalFee: baseFee.finalFee,
      discount: baseFee.discountAmount,
      totalDiscount: baseFee.discountAmount,
      discountType: "courseFee",
      discountPercentage: discountPercentage,
      discountOnCourseFee: baseFee.discountAmount,
      finalFee: baseFee.finalFee,
      paymentPlanType: values.paymentPlanType,
      numberOfInstallments: numberOfInstallments,
      // Properly formatted installments with custom fees included
      installments: formattedInstallments,
    };

    console.log("📤 CourseAssignmentForm sending payload:", {
      customFees: {
        admissionFee: baseFee.admissionFee,
        courseFee: baseFee.courseFee,
        certificateFee: baseFee.certificateFee,
      },
      totalFee: baseFee.finalFee,
      numberOfInstallments: formattedInstallments.length,
      installmentsSample: formattedInstallments[0],
    });

    onFinish(payload);
  };

  const installmentColumns = [
    {
      title: "#",
      dataIndex: "installmentNumber",
      key: "installmentNumber",
      width: 70,
    },
    {
      title: "Title",
      dataIndex: "description",
      key: "description",
      render: (description) => <Text>{description}</Text>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => <Text strong>PKR {round2(amount).toLocaleString()}</Text>,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (dueDate, record, index) => (
        <DatePicker
          value={dueDate ? dayjs(dueDate) : null}
          format="YYYY-MM-DD"
          onChange={(dateValue) => updateInstallmentDueDate(index, dateValue)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Paid" ? "green" : "default"}>{status}</Tag>
      ),
    },
  ];

  const paidInstallments = installments.filter((item) => item.status === "Paid").length;
  const unpaidInstallments = installments.length - paidInstallments;

  return (
    <Modal
      title={
        isEditMode
          ? `Edit Course for ${selectedStudent?.studentName || "Student"}`
          : `Assign Course to ${selectedStudent?.studentName || "Student"}`
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={980}
      centered
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Space style={{ width: "100%" }} size={16} align="start">
          <Form.Item
            label="Course"
            name="courseId"
            rules={[{ required: true, message: "Select a course" }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="Select course" showSearch optionFilterProp="children">
              {courses.map((course) => (
                <Option key={course._id} value={course._id}>
                  {course.courseName} ({course.courseId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Enrollment Date"
            name="enrollmentDate"
            rules={[{ required: true, message: "Select enrollment date" }]}
            style={{ minWidth: 220 }}
          >
            <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Form.Item label="Batch (Optional)" name="batchId">
          <Select
            placeholder="Select batch"
            allowClear
            loading={loadingBatches}
            disabled={!courseId || loadingBatches}
          >
            {batches.map((batch) => (
              <Option key={batch._id} value={batch._id}>
                {batch.batchName} - {batch.batchCode} ({batch.currentStudents || 0}/
                {batch.maxStudents})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Card title="Payment Plan" size="small" style={{ marginBottom: 16 }}>
          <Space style={{ width: "100%" }} size={16} align="start">
            <Form.Item
              label="Plan Type"
              name="paymentPlanType"
              rules={[{ required: true, message: "Select plan type" }]}
              style={{ flex: 1 }}
            >
              <Select>
                {PLAN_OPTIONS.map((plan) => (
                  <Option key={plan.value} value={plan.value}>
                    {plan.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Discount (%)"
              name="discountPercentage"
              rules={[{ required: true, message: "Enter discount percentage" }]}
              style={{ minWidth: 180 }}
            >
              <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Installments"
              name="numberOfInstallments"
              rules={[{ required: true, message: "Select installment count" }]}
              style={{ minWidth: 180 }}
            >
              <Select disabled={paymentPlanType === "full_payment"}>
                {(paymentPlanType === "full_payment"
                  ? [1]
                  : Array.from({ length: 23 }, (_, index) => index + 2)
                ).map((count) => (
                  <Option key={count} value={count}>
                    {count}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Alert
            type="info"
            showIcon
            message="For additional fee rows: One-time = shown as a single separate installment. Two-installments = shown as two separate installments with fee title."
          />
        </Card>

        <Card
          title="Additional Fees Structure"
          size="small"
          style={{ marginBottom: 16 }}
          extra={<Button onClick={addAdditionalFee}>Add Fee</Button>}
        >
          {additionalFees.length === 0 && (
            <Text type="secondary">No additional fee added.</Text>
          )}
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            {additionalFees.map((fee) => (
              <Row gutter={8} key={fee.id} align="middle">
                <Col span={5}>
                  <Select
                    value={fee.feeType}
                    onChange={(value) => updateAdditionalFee(fee.id, { feeType: value })}
                    style={{ width: "100%" }}
                  >
                    {ADDITIONAL_FEE_TYPES.map((type) => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <Input
                    value={fee.title}
                    placeholder="Fee title"
                    onChange={(e) =>
                      updateAdditionalFee(fee.id, { title: e.target.value })
                    }
                  />
                </Col>
                <Col span={5}>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    value={fee.amount}
                    onChange={(value) => updateAdditionalFee(fee.id, { amount: value || 0 })}
                  />
                </Col>
                <Col span={5}>
                  <Select
                    value={fee.paymentMode}
                    onChange={(value) =>
                      updateAdditionalFee(fee.id, { paymentMode: value })
                    }
                    style={{ width: "100%" }}
                  >
                    <Option value="one_time">One Time</Option>
                    <Option value="two_installments">Two Installments</Option>
                  </Select>
                </Col>
                <Col span={3}>
                  <Button
                    danger
                    disabled={additionalFees.length === 1}
                    onClick={() => removeAdditionalFee(fee.id)}
                  >
                    Remove
                  </Button>
                </Col>
              </Row>
            ))}
          </Space>
        </Card>

        <Card title="Fee Summary" size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text>Admission Fee: PKR {baseFee.admissionFee.toLocaleString()}</Text>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openFeeEditModal("admissionFee", baseFee.admissionFee)}
              >
                Edit
              </Button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text>Course Fee: PKR {baseFee.courseFee.toLocaleString()}</Text>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openFeeEditModal("courseFee", baseFee.courseFee)}
              >
                Edit
              </Button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text>Certificate Fee: PKR {baseFee.certificateFee.toLocaleString()}</Text>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openFeeEditModal("certificateFee", baseFee.certificateFee)}
              >
                Edit
              </Button>
            </div>
            <Text>Additional Fees Total: PKR {baseFee.additionalFeesTotal.toLocaleString()}</Text>
            <Text>Total Before Discount: PKR {baseFee.totalBeforeDiscount.toLocaleString()}</Text>
            <Text type="success">
              Course Fee Discount ({discountPercentage}%): -PKR {baseFee.discountAmount.toLocaleString()}
            </Text>
            <Text type="success">
              Course Fee After Discount: PKR {baseFee.discountedCourseFee.toLocaleString()}
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              Final Fee: PKR {baseFee.finalFee.toLocaleString()}
            </Text>
            <Space>
              <Tag color="green">Paid: {paidInstallments}</Tag>
              <Tag color="default">Unpaid: {unpaidInstallments}</Tag>
              <Tag color="red">Remaining: PKR {baseFee.finalFee.toLocaleString()}</Tag>
            </Space>
          </Space>
        </Card>

        <Card title="Installment List" size="small" style={{ marginBottom: 16 }}>
          <Table
            dataSource={installments}
            columns={installmentColumns}
            rowKey="installmentNumber"
            pagination={false}
            size="small"
            locale={{ emptyText: "Select course and enrollment date to generate installments" }}
          />
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEditMode ? "Update Course" : "Assign Course"}
          </Button>
        </div>
      </Form>

      {/* Edit Fee Modal */}
      <Modal
        title="Edit Fee"
        open={editingFeeModal}
        onCancel={closeFeeEditModal}
        onOk={saveFeeEdit}
        centered
        width={400}
      >
        <Form layout="vertical">
          <Form.Item
            label={
              editingFeeType === "admissionFee"
                ? "Admission Fee"
                : editingFeeType === "courseFee"
                ? "Course Fee"
                : "Certificate Fee"
            }
          >
            <InputNumber
              size="large"
              className="w-full"
              min={0}
              value={editingFeeValue}
              onChange={(value) => setEditingFeeValue(value || 0)}
              prefix="PKR"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default CourseAssignmentForm;
