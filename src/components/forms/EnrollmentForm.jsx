import React, { useState } from "react";
import {
  Form,
  Input,
  Select,
  Radio,
  DatePicker,
  InputNumber,
  Button,
  Upload
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

const EnrollmentForm = ({ form, loading = false, onSubmit }) => {
  const [localForm] = Form.useForm();
  const usedForm = form || localForm;
  const DUMMY_PHOTO =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  const [imageUrl, setImageUrl] = useState(DUMMY_PHOTO);

const handlePhotoChange = (info) => {
  const file = info.file.originFileObj;
  if (file) {
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
  }
};

  const label = (text) => (
    <span className="text-md !text-[14px] opacity-40">{text}</span>
  );

const Section = ({ title }) => (
  <div className="flex items-center gap-4 mt-8 mb-4">
    <span className="text-[15px] font-semibold text-gray-700 whitespace-nowrap pl-1">
      {title}
    </span>
    <div className="flex-1 border-b border-gray-300" />
  </div>
);



  return (
    <Form
      form={usedForm}
      layout="vertical"
      onFinish={onSubmit}
      disabled={loading}
    >
      {/* ================= Registration Information ================= */}
      <Section title="Registration Information" />

      <Form.Item name="registrationNo" label={label("Registration No")} rules={[{ required: true }]}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="registrationDate" label={label("Registration Date")} rules={[{ required: true }]}>
        <DatePicker size="large" className="w-full form-input" />
      </Form.Item>

      {/* ================= Personal Information ================= */}
      <Section title="Personal Information" />

      <Form.Item name="studentName" label={label("Student Name")} rules={[{ required: true }]}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="gender" label={label("Gender")} rules={[{ required: true }]}>
        <Radio.Group>
          <Radio value="Male">Male</Radio>
          <Radio value="Female">Female</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="dob" label={label("Date of Birth")} rules={[{ required: true }]}>
        <DatePicker size="large" className="w-full form-input" />
      </Form.Item>

      <Form.Item name="caste" label={label("Caste")}>
        <Input size="large" className="form-input !font-Arial" />
      </Form.Item>

     <Form.Item
  name="religion"
  label={label("Religion")}
  rules={[{ required: true, message: "Please select religion" }]}
>
  <Select size="large" className="form-input" placeholder="Select Religion">
    <Select.Option value="Muslim">Muslim</Select.Option>
    <Select.Option value="Non-Muslim">Non-Muslim</Select.Option>
  </Select>
</Form.Item>


      <Form.Item name="cnic" label={label("CNIC / B-Form Number")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      {/* ================= Educational Information ================= */}
      <Section title="Educational Information" />

      <Form.Item name="previousSchool" label={label("Previous School / College")}>
        <Input size="large" className="form-input" />
      </Form.Item>

    <Form.Item
  name="lastClass"
  label={label("Last Class Attended")}
  rules={[{ required: true, message: "Please select last class" }]}
>
  <Select size="large" className="form-input" placeholder="Select Class">
    {[...Array(12)].map((_, i) => (
      <Select.Option key={i + 1} value={`Class ${i + 1}`}>
        Class {i + 1}
      </Select.Option>
    ))}
  </Select>
</Form.Item>


      <Form.Item name="reference" label={label("Reference")}>
        <Select size="large" className="form-input">
          <Select.Option value="Friend">Friend</Select.Option>
          <Select.Option value="Facebook">Facebook</Select.Option>
          <Select.Option value="Family">Family</Select.Option>
          <Select.Option value="School">School</Select.Option>
          <Select.Option value="Walk-in">Walk-in</Select.Option>
          <Select.Option value="Online">Online</Select.Option>
          <Select.Option value="Other">Other</Select.Option>
        </Select>
      </Form.Item>

      {/* ================= Family / Guardian Information ================= */}
      <Section title="Family / Guardian Information" />

      <Form.Item name="fatherName" label={label("Father's Name")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="fatherCnic" label={label("Father's CNIC")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="fatherOccupation" label={label("Father's Occupation")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="guardianName" label={label("Guardian Name (if different)")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="guardianRelation" label={label("Relationship with Student")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="annualIncome" label={label("Annual Income")}>
        <InputNumber size="large" className="w-full form-input" />
      </Form.Item>

      {/* ================= Contact Information ================= */}
      <Section title="Contact Information" />

      <Form.Item name="mobile" label={label("Mobile Number")} rules={[{ required: true }]}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="whatsapp" label={label("WhatsApp Number")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="email" label={label("Email Address")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      {/* ================= Address Information ================= */}
      <Section title="Address Information" />

      <Form.Item name="permanentAddress" label={label("Permanent Address")}>
        <Input.TextArea rows={2} className="form-input" />
      </Form.Item>

      <Form.Item name="currentAddress" label={label("Current Address")}>
        <Input.TextArea rows={2} className="form-input" />
      </Form.Item>

      <Form.Item name="unionCouncil" label={label("Union Council")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="taluka" label={label("Taluka")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      <Form.Item name="district" label={label("District")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      {/* ================= Emergency Contact ================= */}
      <Section title="Emergency Contact" />

      <Form.Item name="emergencyContact" label={label("Emergency Contact Person")}>
        <Input size="large" className="form-input" />
      </Form.Item>

      {/* ================= Course & Teacher ================= */}
      <Section title="Course & Teacher Information" />

      <Form.Item name="courseId" label={label("Add Course")} rules={[{ required: true }]}>
        <Select size="large" className="form-input" placeholder="Select Course" />
      </Form.Item>

      {/* <Form.Item name="teacherId" label={label("Add Teacher")}>
        <Select size="large" className="form-input" placeholder="Select Teacher" />
      </Form.Item> */}

      {/* ================= Photo Upload ================= */}
      <Section title="Student Photo" />

   <Form.Item name="photo" label={label("Photo")}>
  <div className="flex flex-col items-center gap-3">
    {/* Image Preview */}
    <div className="w-32 h-32 rounded-full border-2 border-gray-300 overflow-hidden flex items-center justify-center">
      <img
        src={imageUrl}
        alt="Student"
        className="w-full h-full object-cover"
      />
    </div>

    {/* Upload Button */}
    <Upload
      showUploadList={false}
      maxCount={1}
      beforeUpload={() => false}
      onChange={handlePhotoChange}
    >
      <Button icon={<UploadOutlined />}>Upload Photo</Button>
    </Upload>
  </div>
</Form.Item>

      {/* ================= Submit ================= */}
      <div className="mt-6 pt-4 border-t">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          className="btn-xl hover:!bg-blue-900"
          loading={loading}
        >
          Create Enrollment
        </Button>
      </div>
    </Form>
  );
};

export default EnrollmentForm;
