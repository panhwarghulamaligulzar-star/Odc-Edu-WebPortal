import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Row,
  Col,
} from "antd";
import { getAllTeachers } from "../../services/feeService";
import { getAllBatches } from "../../services/batchService";
import LoaderSpnar from "../loader/loaderSpnar";

const CourseForm = ({
  form,
  loading = false,
  onSubmit,
  submitLabel = "Save Course",
}) => {
  const [localForm] = Form.useForm();
  const usedForm = form || localForm; // use passed form if exists
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const response = await getAllTeachers();
        if (response.success) {
          setTeachers(response.data);
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    const fetchBatches = async () => {
      setLoadingBatches(true);
      try {
        const response = await getAllBatches();
        if (response.success) {
          setBatches(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching batches:", error);
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchBatches();
  }, []);

  // Watch fees and course name
  const admissionFee = Form.useWatch("admissionFee", usedForm) || 0;
  const courseFee = Form.useWatch("courseFee", usedForm) || 0;
  const certificateFee = Form.useWatch("certificateFee", usedForm) || 0;

  // Auto-calculate totalFee
  useEffect(() => {
    const total =
      Number(admissionFee) +
      Number(courseFee) +
      Number(certificateFee);
    usedForm.setFieldValue("totalFee", total);
  }, [admissionFee, courseFee, certificateFee, usedForm]);

  const handleFinish = (values) => {
    console.log("Form Values:", values); // logs all form data
    console.log(
      "Duration type:",
      typeof values.duration,
      "Value:",
      values.duration,
    );
    console.log("Days value:", values.days);
    if (onSubmit) onSubmit(values);
  };

  return (
    <Form
      form={usedForm}
      layout="vertical"
      onFinish={handleFinish}
      disabled={loading}
    >
      {/* Course ID */}
      <Form.Item
        name="courseId"
        label={
          <span className="text-md !text-[14px] opacity-40">Course ID</span>
        }
        rules={[{ required: true, message: "Please enter Course ID" }]}
      >
        <Input size="large" placeholder="e.g. IT-001" className="form-input" />
      </Form.Item>

      {/* Course Name */}
      <Form.Item
        name="courseName"
        label={
          <span className="text-md !text-[14px] opacity-40">Course Name</span>
        }
        rules={[{ required: true, message: "Please enter Course Name" }]}
      >
        <Input
          size="large"
          placeholder="e.g. Web Development"
          className="form-input"
        />
      </Form.Item>

      {/* Course Category */}
      <Form.Item
        name="courseCategory"
        label={
          <span className="text-md !text-[14px] opacity-40">Course Category</span>
        }
        rules={[{ required: true, message: "Please select Course Category" }]}
      >
        <Select
          size="large"
          placeholder="Select Course Category"
          className="form-input !font-ArialLight"
        >
          <Select.Option value="IT & Vocational">
            IT & Vocational (With System Number)
          </Select.Option>
          <Select.Option value="Coaching">Coaching</Select.Option>
        </Select>
      </Form.Item>

      {/* Teachers Selection */}
      <Form.Item
        name="teacherId"
        label={
          <span className="text-md !text-[14px] opacity-40">
            Assign Teachers (Multiple)
          </span>
        }
      >
        <Select
          mode="multiple"
          size="large"
          placeholder="Select one or more teachers"
          className="form-input !font-ArialLight"
          loading={loadingTeachers}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {teachers.map((teacher) => (
            <Select.Option key={teacher._id} value={teacher._id}>
              {teacher.fullName} ({teacher.teacherId})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="batchIds"
        label={
          <span className="text-md !text-[14px] opacity-40">
            Assign Batches (Multiple)
          </span>
        }
        extra="Select existing batches to quickly link them with this course."
      >
        <Select
          mode="multiple"
          size="large"
          placeholder="Select one or more batches"
          className="form-input !font-ArialLight"
          loading={loadingBatches}
          showSearch
          optionFilterProp="label"
          options={batches.map((batch) => ({
            value: batch._id,
            label: `${batch.batchName} (${batch.batchCode})`,
            searchLabel: `${batch.batchName} ${batch.batchCode} ${batch.course?.courseName || ""}`,
          }))}
          filterOption={(input, option) =>
            (option?.searchLabel || option?.label || "")
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          optionRender={(option) => {
            const batch = batches.find((item) => item._id === option.value);
            return (
              <div className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-[11px] text-slate-400">
                  Current course: {batch?.course?.courseName || "Not linked"}
                </span>
              </div>
            );
          }}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={24}>
          {/* Duration */}
          <Form.Item
            name="duration"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Duration (Months)
              </span>
            }
            rules={[{ required: true, message: "Please select Duration" }]}
          >
            <Select
              size="large"
              placeholder="Select Duration"
              className="form-input !font-ArialLight"
            >
              <Select.Option value={2}>2 Months</Select.Option>
              <Select.Option value={3}>3 Months</Select.Option>
              <Select.Option value={4}>4 Months</Select.Option>
              <Select.Option value={5}>5 Months</Select.Option>
              <Select.Option value={6}>6 Months</Select.Option>
              <Select.Option value={7}>7 Months</Select.Option>
              <Select.Option value={8}>8 Months</Select.Option>
              <Select.Option value={9}>9 Months</Select.Option>
              <Select.Option value={10}>10 Months</Select.Option>
              <Select.Option value={11}>11 Months</Select.Option>
              <Select.Option value={12}>1 Year (12 Months)</Select.Option>
              <Select.Option value={16}>16 Months</Select.Option>
              <Select.Option value={18}>18 Months</Select.Option>
              <Select.Option value={20}>20 Months</Select.Option>
              <Select.Option value={24}>24 Months</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          {/* Admission Fee */}
          <Form.Item
            name="admissionFee"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Admission Fee
              </span>
            }
            rules={[{ required: true }]}
          >
            <InputNumber
              size="large"
              className="w-full form-input !font-ArialLight"
              placeholder="e.g. 2000"
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          {/* Course Fee */}
          <Form.Item
            name="courseFee"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Course Fee
              </span>
            }
            rules={[{ required: true }]}
          >
            <InputNumber
              size="large"
              className="w-full form-input !font-ArialLight"
              placeholder="e.g. 12000"
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          {/* Certificate Fee */}
          <Form.Item
            name="certificateFee"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Certificate Fee
              </span>
            }
            rules={[{ required: true }]}
          >
            <InputNumber
              size="large"
              className="w-full form-input !font-ArialLight"
              placeholder="e.g. 3000"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Total Fee */}
      <Form.Item
        name="totalFee"
        label={
          <span className="text-md !text-[14px] opacity-40">Total Fee</span>
        }
        rules={[{ required: true }]}
      >
        <InputNumber
          size="large"
          className="form-input !font-ArialLight"
          placeholder="Total will calculate automatically"
          disabled
        />
      </Form.Item>

      {/* Submit */}
      <div className="mt-4 pt-4 border-t">
        <Button
          type="primary"
          htmlType="submit"
          onClick={() => usedForm.submit()}
          block
          size="large"
          className="btn-xl hover:!bg-blue-900"
          disabled={loading}
        >
          {loading ? <LoaderSpnar /> : <span>{submitLabel}</span>}
        </Button>
      </div>
    </Form>
  );
};

export default CourseForm;
