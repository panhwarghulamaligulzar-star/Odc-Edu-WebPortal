import React, { useState, useEffect } from "react";
import {
  Form,
  Select,
  Card,
  InputNumber,
  DatePicker,
  Space,
  Radio,
  Divider,
  Alert,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DollarOutlined,
  PercentageOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import InstallmentPlanPreview from "./InstallmentPlanPreview";

const { Text, Title } = Typography;

/**
 * EnrollmentFeeConfiguration Component
 * Handles course selection, fee breakdown, discount configuration, and installment plan
 */
const EnrollmentFeeConfiguration = ({
  form,
  courses = [],
  onInstallmentPlanCalculated,
}) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [installmentPlan, setInstallmentPlan] = useState(null);
  const [discountType, setDiscountType] = useState("none");

  // Watch form values
  const courseId = Form.useWatch("courseId", form);
  const enrollmentDate = Form.useWatch("enrollmentDate", form);
  const discountOnAdmission = Form.useWatch("discountOnAdmission", form) || 0;
  const discountOnCourseFee = Form.useWatch("discountOnCourseFee", form) || 0;

  // Handle course selection
  useEffect(() => {
    if (courseId && courses.length > 0) {
      const course = courses.find((c) => c._id === courseId);
      setSelectedCourse(course);

      // Set default fee values
      if (course) {
        form.setFieldsValue({
          admissionFee: course.admissionFee,
          courseFee: course.courseFee,
          certificateFee: course.certificateFee,
          courseDuration: course.duration,
        });

        // Recalculate installment plan
        calculateInstallmentPlan(course);
      }
    } else {
      setSelectedCourse(null);
      setInstallmentPlan(null);
    }
  }, [courseId, courses]);

  // Recalculate when discount changes
  useEffect(() => {
    if (selectedCourse) {
      calculateInstallmentPlan(selectedCourse);
    }
  }, [discountType, discountOnAdmission, discountOnCourseFee, enrollmentDate]);

  const calculateInstallmentPlan = (course) => {
    if (!course || !enrollmentDate) return;

    const plan = calculateInstallmentPlanHelper({
      admissionFee: course.admissionFee,
      courseFee: course.courseFee,
      certificateFee: course.certificateFee,
      courseDuration: course.duration,
      discountOnAdmission,
      discountOnCourseFee,
      discountType,
      startDate: enrollmentDate.toDate(),
    });

    setInstallmentPlan(plan);

    // Pass to parent component
    if (onInstallmentPlanCalculated) {
      onInstallmentPlanCalculated(plan);
    }

    // Update form with calculated values
    form.setFieldsValue({
      totalBeforeDiscount: plan.summary.totalBeforeDiscount,
      totalDiscount: plan.summary.totalDiscount,
      totalFee: plan.summary.totalFee,
      numberOfInstallments: plan.summary.numberOfInstallments,
    });
  };

  const calculateInstallmentPlanHelper = (feeConfig) => {
    const {
      admissionFee = 0,
      courseFee = 0,
      certificateFee = 0,
      courseDuration = 3,
      discountOnAdmission = 0,
      discountOnCourseFee = 0,
      discountType = "none",
      startDate = new Date(),
    } = feeConfig;

    // Calculate discounted fees
    let finalAdmissionFee = admissionFee;
    let finalCourseFee = courseFee;

    if (discountType === "admission" || discountType === "both") {
      finalAdmissionFee = Math.max(0, admissionFee - discountOnAdmission);
    }

    if (discountType === "courseFee" || discountType === "both") {
      finalCourseFee = Math.max(0, courseFee - discountOnCourseFee);
    }

    // Calculate monthly course fee
    const monthlyCourseFee = finalCourseFee / courseDuration;

    // Build installment plan
    const installments = [];
    const startDateObj = new Date(startDate);

    // First Installment: Admission Fee + First Month Course Fee
    const firstInstallmentAmount = finalAdmissionFee + monthlyCourseFee;
    installments.push({
      installmentNumber: 1,
      description: "Admission Fee + First Month Course Fee",
      feeComponents: {
        admissionFee: finalAdmissionFee,
        courseFee: monthlyCourseFee,
        certificateFee: 0,
      },
      amount: Math.round(firstInstallmentAmount * 100) / 100,
      dueDate: new Date(startDateObj),
      status: "Pending",
      paidAmount: 0,
    });

    // Middle Installments: Monthly Course Fee
    for (let i = 2; i <= courseDuration; i++) {
      const dueDate = new Date(startDateObj);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const isLastMonth = i === courseDuration;

      if (isLastMonth) {
        // Last Installment: Last Month Course Fee + Certificate Fee
        const lastInstallmentAmount = monthlyCourseFee + certificateFee;
        installments.push({
          installmentNumber: i,
          description: "Last Month Course Fee + Certificate Fee",
          feeComponents: {
            admissionFee: 0,
            courseFee: monthlyCourseFee,
            certificateFee: certificateFee,
          },
          amount: Math.round(lastInstallmentAmount * 100) / 100,
          dueDate: dueDate,
          status: "Pending",
          paidAmount: 0,
        });
      } else {
        installments.push({
          installmentNumber: i,
          description: `Month ${i} Course Fee`,
          feeComponents: {
            admissionFee: 0,
            courseFee: monthlyCourseFee,
            certificateFee: 0,
          },
          amount: Math.round(monthlyCourseFee * 100) / 100,
          dueDate: dueDate,
          status: "Pending",
          paidAmount: 0,
        });
      }
    }

    // Calculate totals
    const totalBeforeDiscount = admissionFee + courseFee + certificateFee;
    const totalDiscount =
      (discountType === "admission" || discountType === "both"
        ? discountOnAdmission
        : 0) +
      (discountType === "courseFee" || discountType === "both"
        ? discountOnCourseFee
        : 0);
    const totalFee = finalAdmissionFee + finalCourseFee + certificateFee;

    return {
      installments,
      summary: {
        admissionFee,
        courseFee,
        certificateFee,
        totalBeforeDiscount,
        discountOnAdmission:
          discountType === "admission" || discountType === "both"
            ? discountOnAdmission
            : 0,
        discountOnCourseFee:
          discountType === "courseFee" || discountType === "both"
            ? discountOnCourseFee
            : 0,
        totalDiscount,
        finalAdmissionFee,
        finalCourseFee,
        finalCertificateFee: certificateFee,
        totalFee,
        monthlyCourseFee: Math.round(monthlyCourseFee * 100) / 100,
        numberOfInstallments: courseDuration,
        courseDuration,
      },
    };
  };

  return (
    <div className="enrollment-fee-configuration">
      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>Course & Fee Configuration</span>
          </Space>
        }
        className="mb-4"
      >
        {/* Course Selection */}
        <Form.Item
          name="courseId"
          label="Select Course"
          rules={[{ required: true, message: "Please select a course" }]}
        >
          <Select
            size="large"
            placeholder="Select Course"
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {courses.map((course) => (
              <Select.Option key={course._id} value={course._id}>
                {course.courseName} - {course.duration} Months
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Enrollment Date */}
        <Form.Item
          name="enrollmentDate"
          label="Enrollment Date"
          rules={[{ required: true, message: "Please select enrollment date" }]}
        >
          <DatePicker
            size="large"
            className="w-full"
            placeholder="Select enrollment date"
            suffixIcon={<CalendarOutlined />}
          />
        </Form.Item>

        {selectedCourse && (
          <>
            <Divider orientation="left">Fee Breakdown</Divider>

            {/* Fee Components */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card size="small" className="text-center bg-blue-50">
                <Text type="secondary">Admission Fee</Text>
                <div className="text-2xl font-bold text-blue-600">
                  Rs. {selectedCourse.admissionFee?.toLocaleString()}
                </div>
              </Card>
              <Card size="small" className="text-center bg-green-50">
                <Text type="secondary">Course Fee</Text>
                <div className="text-2xl font-bold text-green-600">
                  Rs. {selectedCourse.courseFee?.toLocaleString()}
                </div>
              </Card>
              <Card size="small" className="text-center bg-purple-50">
                <Text type="secondary">Certificate Fee</Text>
                <div className="text-2xl font-bold text-purple-600">
                  Rs. {selectedCourse.certificateFee?.toLocaleString()}
                </div>
              </Card>
            </div>

            <Divider orientation="left">Discount Configuration</Divider>

            {/* Discount Type Selection */}
            <Form.Item
              name="discountType"
              label="Apply Discount On"
              initialValue="none"
            >
              <Radio.Group
                onChange={(e) => setDiscountType(e.target.value)}
                value={discountType}
              >
                <Radio value="none">No Discount</Radio>
                <Radio value="admission">Admission Fee Only</Radio>
                <Radio value="courseFee">Course Fee Only</Radio>
                <Radio value="both">Both Admission & Course</Radio>
              </Radio.Group>
            </Form.Item>

            {/* Discount Inputs */}
            {(discountType === "admission" || discountType === "both") && (
              <Form.Item
                name="discountOnAdmission"
                label="Discount on Admission Fee"
                rules={[
                  {
                    type: "number",
                    max: selectedCourse.admissionFee,
                    message: `Cannot exceed Rs. ${selectedCourse.admissionFee}`,
                  },
                ]}
              >
                <InputNumber
                  size="large"
                  className="w-full"
                  min={0}
                  max={selectedCourse.admissionFee}
                  prefix="Rs."
                  suffix={<PercentageOutlined />}
                  placeholder="Enter discount amount"
                />
              </Form.Item>
            )}

            {(discountType === "courseFee" || discountType === "both") && (
              <Form.Item
                name="discountOnCourseFee"
                label="Discount on Course Fee"
                rules={[
                  {
                    type: "number",
                    max: selectedCourse.courseFee,
                    message: `Cannot exceed Rs. ${selectedCourse.courseFee}`,
                  },
                ]}
              >
                <InputNumber
                  size="large"
                  className="w-full"
                  min={0}
                  max={selectedCourse.courseFee}
                  prefix="Rs."
                  suffix={<PercentageOutlined />}
                  placeholder="Enter discount amount"
                />
              </Form.Item>
            )}

            {/* Hidden fields for form submission */}
            <Form.Item name="admissionFee" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="courseFee" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="certificateFee" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="courseDuration" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="totalBeforeDiscount" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="totalDiscount" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="totalFee" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="numberOfInstallments" hidden>
              <InputNumber />
            </Form.Item>
          </>
        )}
      </Card>

      {/* Installment Plan Preview */}
      {installmentPlan && enrollmentDate && (
        <InstallmentPlanPreview
          installmentPlan={installmentPlan}
          courseInfo={selectedCourse}
        />
      )}

      {!enrollmentDate && selectedCourse && (
        <Alert
          message="Please select an enrollment date to view the installment plan"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      )}
    </div>
  );
};

export default EnrollmentFeeConfiguration;
