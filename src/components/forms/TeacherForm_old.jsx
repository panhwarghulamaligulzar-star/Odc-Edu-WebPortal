import React from "react";
import { Form, Input, Radio, Select, DatePicker, Button } from "antd";

const TeacherForm = ({ form, loading = false, onSubmit, courses = [] }) => {
  const [localForm] = Form.useForm();
  const usedForm = form || localForm; // use passed form if exists

  const handleFinish = (values) => {
    console.log("Form Values:", values); // logs all form data
    if (onSubmit) onSubmit(values);
  };

  return (
    <Form
      form={usedForm}
      layout="vertical"
      onFinish={handleFinish}
      disabled={loading}
    >
      {/* Teacher ID */}
      <Form.Item
        name="teacherId"
        label={<span  className="text-md !text-[14px] opacity-40">Teacher ID</span>}
        rules={[{ required: true, message: "Please enter Teacher ID" }]}
      >
        <Input size="large" placeholder="e.g. TCH-001" className="form-input" />
      </Form.Item>

      {/* Full Name */}
      <Form.Item
        name="fullName"
        label={<span  className="text-md !text-[14px] opacity-40">Full Name</span> }
        rules={[{ required: true, message: "Please enter Full Name" }]}
      >
        <Input size="large" placeholder="Full Name" className="form-input" />
      </Form.Item>

      {/* Father's Name */}
      <Form.Item
        name="fatherName"
        label={<span className="text-md !text-[14px] opacity-40">Father’s Name</span>}
        rules={[{ required: true, message: "Please enter Father's Name" }]}
      >
        <Input size="large" placeholder="Father’s Name" className="form-input" />
      </Form.Item>

      {/* Gender */}
      <Form.Item
        name="gender"
        label={<span className="text-md !text-[14px] opacity-40">Gender</span>}
        rules={[{ required: true, message: "Please select Gender" }]}
      >
        <Radio.Group>
          <Radio value="Male">Male</Radio>
          <Radio value="Female">Female</Radio>
        </Radio.Group>
      </Form.Item>

      {/* Date of Appointment */}
      <Form.Item
        name="appointmentDate"
        label={<span className="text-md !text-[14px] opacity-40">Date of Appointment</span>}
        rules={[{ required: true, message: "Please select Date of Appointment" }]}
      >
        <DatePicker size="large" style={{ width: "100%" }} className="form-input" />
      </Form.Item>

      {/* Contact No. */}
      <Form.Item
        name="contactNo"
        label= {<span className="text-md !text-[14px] opacity-40">Contact No</span>}
        rules={[{ required: true, message: "Please enter Contact No." }]}
      >
        <Input size="large" placeholder="Contact No." className="form-input" />
      </Form.Item>

      {/* Contract Period */}
      <Form.Item
        name="contractPeriod"
        label={<span  className="text-md !text-[14px] opacity-40">Contract Period</span>}
        rules={[{ required: true, message: "Please enter Contract Period" }]}
      >
        <Input size="large" placeholder="Contract Period" className="form-input" />
      </Form.Item>

      {/* CNIC No. */}
      <Form.Item
        name="cnicNo"
        label={<span  className="text-md !text-[14px] opacity-40">CNIC No.</span>}
        rules={[{ required: true, message: "Please enter CNIC No." }]}
      >
        <Input size="large" placeholder="CNIC No." className="form-input" />
      </Form.Item>

      {/* Address */}
      <Form.Item
        name="address"
        label={<span className="text-md !text-[14px] opacity-40">Address</span>}
        rules={[{ required: true, message: "Please enter Address" }]}
      >
        <Input size="large" placeholder="Address" className="form-input" />
      </Form.Item>

      {/* Course Dropdown - Multiple Selection */}
      <Form.Item
        name="courseId"
        label={<span className="text-md !text-[14px] opacity-40">Assign Courses (Multiple)</span>}
      >
        <Select 
          mode="multiple" 
          size="large" 
          placeholder="Select courses to assign" 
          className="form-input !font-Arial"
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {courses.map(course => (
            <Select.Option key={course._id} value={course._id}>
              {course.courseName} ({course.courseId})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* Submit */}
      <div className="mt-4 pt-4 border-t">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          className="btn-xl hover:!bg-blue-900"
          disabled={loading}
        >
          <span>Create Teacher</span>
        </Button>
      </div>
    </Form>
  );
};

export default TeacherForm;
