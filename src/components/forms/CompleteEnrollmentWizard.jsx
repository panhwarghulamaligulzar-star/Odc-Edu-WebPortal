import React, { useState, useEffect } from "react";
import { Form, Steps, Button, message, Card, Space } from "antd";
import {
  UserOutlined,
  SolutionOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import EnrollmentForm from "./EnrollmentForm";
import EnrollmentFeeConfiguration from "./EnrollmentFeeConfiguration";
import InstallmentPlanPreview from "./InstallmentPlanPreview";
import { createEnrollment } from "../../services/feeService";
import { getCourses } from "../../services/feeService";

const { Step } = Steps;

/**
 * Complete Enrollment Wizard
 * Integrates student data, fee configuration, and installment plan
 */
const CompleteEnrollmentWizard = ({ onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [installmentPlan, setInstallmentPlan] = useState(null);
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      message.error("Failed to load courses");
    }
  };

  const steps = [
    {
      title: "Student Info",
      icon: <UserOutlined />,
      description: "Personal & Contact Details",
    },
    {
      title: "Course & Fees",
      icon: <DollarOutlined />,
      description: "Course Selection & Fee Configuration",
    },
    {
      title: "Review",
      icon: <SolutionOutlined />,
      description: "Review & Confirm",
    },
  ];

  const handleNext = async () => {
    try {
      await form.validateFields();

      if (currentStep === 0) {
        // Save student data and move to fee configuration
        const values = form.getFieldsValue();
        setStudentData(values);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // Fee configuration complete, move to review
        if (!installmentPlan) {
          message.warning("Please configure course and fees");
          return;
        }
        setCurrentStep(2);
      }
    } catch (error) {
      console.error("Validation failed:", error);
      message.error("Please fill in all required fields");
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!installmentPlan) {
      message.error("Installment plan not configured");
      return;
    }

    setLoading(true);
    try {
      const allValues = form.getFieldsValue();

      // Prepare enrollment data
      const enrollmentData = {
        // Student data
        ...studentData,

        // Course and fee data
        courseId: allValues.courseId,
        enrollmentDate: allValues.enrollmentDate.toDate(),

        // Fee structure data
        admissionFee: allValues.admissionFee,
        courseFee: allValues.courseFee,
        certificateFee: allValues.certificateFee,
        totalFee: allValues.totalFee,

        // Discount data
        discountType: allValues.discountType || "none",
        discountOnAdmission: allValues.discountOnAdmission || 0,
        discountOnCourseFee: allValues.discountOnCourseFee || 0,
        totalDiscount: allValues.totalDiscount || 0,

        // Installment data
        numberOfInstallments: installmentPlan.summary.numberOfInstallments,
        installments: installmentPlan.installments,
      };

      const response = await createEnrollment(enrollmentData);

      if (response.success) {
        message.success("Enrollment created successfully!");
        form.resetFields();
        setCurrentStep(0);
        setInstallmentPlan(null);
        setStudentData(null);

        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      message.error(error.message || "Failed to create enrollment");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Student Information
        return (
          <EnrollmentForm
            form={form}
            loading={loading}
            onSubmit={(values) => {
              setStudentData(values);
              handleNext();
            }}
          />
        );

      case 1:
        // Course & Fee Configuration
        return (
          <EnrollmentFeeConfiguration
            form={form}
            courses={courses}
            onInstallmentPlanCalculated={(plan) => {
              setInstallmentPlan(plan);
            }}
          />
        );

      case 2:
        // Review & Confirmation
        return (
          <div>
            <Card title="Student Information" className="mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {studentData?.studentName}
                </div>
                <div>
                  <strong>Registration No:</strong>{" "}
                  {studentData?.registrationNo}
                </div>
                <div>
                  <strong>Mobile:</strong> {studentData?.mobile}
                </div>
                <div>
                  <strong>Email:</strong> {studentData?.email || "N/A"}
                </div>
              </div>
            </Card>

            {installmentPlan && (
              <InstallmentPlanPreview
                installmentPlan={installmentPlan}
                courseInfo={courses.find(
                  (c) => c._id === form.getFieldValue("courseId"),
                )}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="enrollment-wizard">
      <Card>
        <Steps current={currentStep} className="mb-8">
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>

        <div className="step-content">{renderStepContent()}</div>

        <div className="step-actions mt-6 pt-4 border-t flex justify-between">
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrevious} disabled={loading}>
                Previous
              </Button>
            )}
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </Space>

          <Space>
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext} disabled={loading}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                Complete Enrollment
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default CompleteEnrollmentWizard;
