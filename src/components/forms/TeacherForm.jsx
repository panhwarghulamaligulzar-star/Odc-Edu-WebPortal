import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Radio,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Upload,
  Avatar,
  message,
  InputNumber,
} from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";

const TeacherForm = ({
  form,
  loading = false,
  onSubmit,
  courses = [],
  initialImage = null,
  initialTeacher = null,
}) => {
  const [localForm] = Form.useForm();
  const usedForm = form || localForm;
  const [imagePreview, setImagePreview] = useState(initialImage);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [designation, setDesignation] = useState("");
  const [salaryType, setSalaryType] = useState("fixed");
  const [salaryInputKey, setSalaryInputKey] = useState(0);
  
  // Update imagePreview when initialImage changes
  useEffect(() => {
    setImagePreview(initialImage);
    setUploadedFile(null);
  }, [initialImage]);

  useEffect(() => {
    setDesignation(usedForm.getFieldValue("designation") || "");
    setSalaryType(usedForm.getFieldValue("salaryType") || "fixed");
  }, [initialImage, initialTeacher, usedForm]);

  // Reset salary input key when initialImage changes (i.e., when opening edit mode)
  useEffect(() => {
    setSalaryInputKey(prev => prev + 1);
  }, [initialImage]);

  const handleFinish = (values) => {
    // Salary is stored as-is (user can enter: "50000", "50000 PKR", or "50%")
    const processedSalary = values.monthlySalary || null;

    // Prepare the complete data object
    const completeData = {
      // Basic Information
      teacherId: values.teacherId,
      fullName: values.fullName,
      fatherName: values.fatherName,
      gender: values.gender,

      // Contact Information
      contactNo: values.contactNo,
      cnicNo: values.cnicNo,
      address: values.address,

      // Employment Details
      appointmentDate: values.appointmentDate
        ? values.appointmentDate.format("YYYY-MM-DD")
        : null,
      contractPeriod: values.contractPeriod,
      designation: values.designation || null,
      monthlySalary: processedSalary,
      salaryType: values.salaryType || "fixed",
      salaryPerStudent:
        values.salaryType === "per_student" ? values.salaryPerStudent ?? null : null,
      attendanceThreshold:
        values.salaryType === "per_student" ? values.attendanceThreshold ?? 50 : 50,

      // Educational Qualifications
      highestQualification: values.highestQualification || null,
      degreeTitle: values.degreeTitle || null,
      majorSubject: values.majorSubject || null,

      // Experience & Skills
      teachingExperience: values.teachingExperience || null,
      computerSkills: values.computerSkills || null, // This is an array if multiple selected

      // Course Assignment
      courseId: values.courseId || [],

      // Profile Picture
      profilePicture: uploadedFile || null,
    };

    if (onSubmit) {
      onSubmit(completeData);
    }
  };

  const handleImageUpload = (info) => {
    const file = info.file.originFileObj || info.file;

    if (file) {
      // Validate file type
      const isImage = file.type?.startsWith("image/");
      if (!isImage) {
        message.error("You can only upload image files!");
        return;
      }

      // Validate file size (max 2MB)
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error("Image must be smaller than 2MB!");
        return;
      }

      console.log("Image uploaded:", file.name, file.size, file.type);

      // Store the actual file object
      setUploadedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form
      form={usedForm}
      layout="vertical"
      onFinish={handleFinish}
      disabled={loading}
    >
      <Row gutter={16}>
        <Col span={12}>
          {/* Teacher ID */}
          <Form.Item
            name="teacherId"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Employee ID
              </span>
            }
            rules={[{ required: true, message: "Please enter Teacher ID" }]}
          >
            <Input
              size="large"
              placeholder="e.g. T-101"
              className="form-input !font-ArialLight"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          {/* Gender */}
          <Form.Item
            name="gender"
            label={
              <span className="text-md !text-[14px] opacity-40">Gender</span>
            }
            rules={[{ required: true, message: "Please select Gender" }]}
          >
            <Radio.Group size="large" className="w-full">
              <Radio value="Male">Male</Radio>
              <Radio value="Female">Female</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Full Name */}
          <Form.Item
            name="fullName"
            label={
              <span className="text-md !text-[14px] opacity-40">Full Name</span>
            }
            rules={[{ required: true, message: "Please enter Full Name" }]}
          >
            <Input
              size="large"
              placeholder="e.g. Ali Khan"
              className="form-input !font-ArialLight"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          {/* Father's Name */}
          <Form.Item
            name="fatherName"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Father's Name
              </span>
            }
            rules={[{ required: true, message: "Please enter Father's Name" }]}
          >
            <Input
              size="large"
              placeholder="e.g. Ahmed Khan"
              className="form-input !font-ArialLight"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Contact No. */}
          <Form.Item
            name="contactNo"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Contact Number
              </span>
            }
            rules={[
              { required: true, message: "Please enter Contact No." },
              { pattern: /^\d{10,11}$/, message: "Must be 10-11 digits" }
            ]}
            validateTrigger="onChange"
          >
            <Input
              size="large"
              placeholder="e.g. 03001234567"
              className="form-input !font-ArialLight"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                usedForm.setFieldValue("contactNo", val);
              }}
              maxLength={11}
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          {/* CNIC No. */}
          <Form.Item
            name="cnicNo"
            label={
              <span className="text-md !text-[14px] opacity-40">
                CNIC Number
              </span>
            }
            rules={[
              { required: true, message: "Please enter CNIC No." },
              { pattern: /^\d{13}$/, message: "Must be exactly 13 digits" }
            ]}
            validateTrigger="onChange"
          >
            <Input
              size="large"
              placeholder="e.g. 1234512345671"
              className="form-input !font-ArialLight"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                usedForm.setFieldValue("cnicNo", val);
              }}
              maxLength={13}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Date of Appointment */}
          <Form.Item
            name="appointmentDate"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Appointment Date
              </span>
            }
            rules={[
              { required: true, message: "Please select Date of Appointment" },
            ]}
          >
            <DatePicker
              size="large"
              style={{ width: "100%" }}
              className="form-input !font-ArialLight"
              format="YYYY-MM-DD"
              placeholder="Select date"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          {/* Contract Period */}
          <Form.Item
            name="contractPeriod"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Contract Period
              </span>
            }
            rules={[
              { required: true, message: "Please enter Contract Period" },
            ]}
          >
            <Select
              size="large"
              placeholder="Select Period"
              className="form-input !font-ArialLight"
            >
              <Select.Option value="3 Months">3 Months</Select.Option>
              <Select.Option value="6 Months">6 Months</Select.Option>
              <Select.Option value="1 Year">1 Year</Select.Option>
              <Select.Option value="2 Years">2 Years</Select.Option>
              <Select.Option value="Permanent">Permanent</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          {/* Designation */}
          <Form.Item
            name="designation"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Designation
              </span>
            }
          >
            <Select
              size="large"
              placeholder="Select Designation"
              className="form-input !font-ArialLight"
              showSearch
              onChange={(e) => {
                setDesignation(e);
              }}
            >
              <Select.Option value="Director">Director</Select.Option>
              <Select.Option value="Principal">Principal</Select.Option>
              <Select.Option value="Manager">Manager</Select.Option>
              <Select.Option value="Accountant">Accountant</Select.Option>
              <Select.Option value="Receptionist">Receptionist</Select.Option>
              <Select.Option value="Computer Operator">
                Computer Operator
              </Select.Option>
              <Select.Option value="Internee">Internee</Select.Option>
              <Select.Option value="Trainer">Trainer</Select.Option>
              <Select.Option value="Office Boy">Office Boy</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Highest Qualification */}
          <Form.Item
            name="highestQualification"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Highest Qualification
              </span>
            }
          >
            <Select
              size="large"
              placeholder="e.g. Intermediate, Bachelor, Master"
              className="form-input !font-ArialLight"
            >
              <Select.Option value="Intermediate">Intermediate</Select.Option>
              <Select.Option value="Bachelor">Bachelor</Select.Option>
              <Select.Option value="Master">Master</Select.Option>
              <Select.Option value="PhD">PhD</Select.Option>
              <Select.Option value="Diploma">Diploma</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          {/* Degree Title - Text Input */}
          <Form.Item
            name="degreeTitle"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Degree Title
              </span>
            }
          >
            <Input
              size="large"
              placeholder="e.g. BSc, BS, MA, MSc"
              className="form-input !font-ArialLight"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Major / Subject */}
          <Form.Item
            name="majorSubject"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Major / Subject
              </span>
            }
          >
            <Select
              size="large"
              placeholder="Specialization or main teaching subject"
              className="form-input !font-ArialLight"
              showSearch
            >
              <Select.Option value="Computer Science">
                Computer Science
              </Select.Option>
              <Select.Option value="Information Technology">
                Information Technology
              </Select.Option>
              <Select.Option value="Mathematics">Mathematics</Select.Option>
              <Select.Option value="Physics">Physics</Select.Option>
              <Select.Option value="Chemistry">Chemistry</Select.Option>
              <Select.Option value="Biology">Biology</Select.Option>
              <Select.Option value="English">English</Select.Option>
              <Select.Option value="Urdu">Urdu</Select.Option>
              <Select.Option value="History">History</Select.Option>
              <Select.Option value="Geography">Geography</Select.Option>
              <Select.Option value="Economics">Economics</Select.Option>
              <Select.Option value="Business Management">
                Business Management
              </Select.Option>
              <Select.Option value="Graphic Design">
                Graphic Design
              </Select.Option>
              <Select.Option value="Web Development">
                Web Development
              </Select.Option>
              <Select.Option value="Mobile Development">
                Mobile Development
              </Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          {/* Teaching Experience */}
          <Form.Item
            name="teachingExperience"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Experience (Years)
              </span>
            }
          >
            <Select
              size="large"
              placeholder="Select experience"
              className="form-input !font-ArialLight"
            >
              <Select.Option value="Fresh">Fresh</Select.Option>
              <Select.Option value="1">1 Year</Select.Option>
              <Select.Option value="2">2 Years</Select.Option>
              <Select.Option value="3">3 Years</Select.Option>
              <Select.Option value="4">4 Years</Select.Option>
              <Select.Option value="5">5 Years</Select.Option>
              <Select.Option value="6">6 Years</Select.Option>
              <Select.Option value="7">7 Years</Select.Option>
              <Select.Option value="8">8 Years</Select.Option>
              <Select.Option value="9">9 Years</Select.Option>
              <Select.Option value="10+">10+ Years</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Computer Skills */}
          <Form.Item
            name="computerSkills"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Other Skills
              </span>
            }
          >
            <Select
              size="large"
              placeholder="Applicable for IT Teachers"
              className="form-input !font-ArialLight"
              mode="multiple"
              maxTagCount={3}
              maxTagPlaceholder="..."
            >
              <Select.Option value="Basic">Basic</Select.Option>
              <Select.Option value="CIT">CIT</Select.Option>
              <Select.Option value="DIT">DIT</Select.Option>
              <Select.Option value="Specialized Software">
                Specialized Software
              </Select.Option>
              <Select.Option value="MS Office">MS Office</Select.Option>
              <Select.Option value="Graphic Design">
                Graphic Design
              </Select.Option>
              <Select.Option value="Web Development">
                Web Development
              </Select.Option>
              <Select.Option value="Web Designing">Web Designing</Select.Option>
              <Select.Option value="Freelancing">Freelancing</Select.Option>
              <Select.Option value="Digital Marketing">
                Digital Marketing
              </Select.Option>
              <Select.Option value="Programming">Programming</Select.Option>
              <Select.Option value="Database Management">
                Database Management
              </Select.Option>
              <Select.Option value="Baking">Baking</Select.Option>
              <Select.Option value="Cooking">Cooking</Select.Option>
              <Select.Option value="Beautician">Beautician</Select.Option>
              <Select.Option value="Tailoring">Tailoring</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            name="salaryType"
            initialValue="fixed"
            label={
              <span className="text-md !text-[14px] opacity-40">
                Salary Type
              </span>
            }
          >
            <Select
              size="large"
              className="form-input !font-ArialLight"
              onChange={(value) => {
                setSalaryType(value);
                if (value !== "per_student") {
                  usedForm.setFieldsValue({
                    salaryPerStudent: null,
                    attendanceThreshold: 50,
                  });
                }
              }}
            >
              <Select.Option value="fixed">Fixed Monthly Salary</Select.Option>
              <Select.Option value="per_student">
                Per Student Attendance Based
              </Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {/* Monthly Salary */}
          <Form.Item
            name="monthlySalary"
            label={
              <span className="text-md !text-[14px] opacity-40">
                {salaryType === "per_student"
                  ? "Fixed Salary Override"
                  : "Monthly Salary"}
              </span>
            }
          >
            <Input
              key={salaryInputKey}
              size="large"
              placeholder="e.g. 50000, 50000 PKR, or 50%"
              className="form-input !font-ArialLight"
              onChange={(e) => {
                usedForm.setFieldValue("monthlySalary", e.target.value);
              }}
            />
          </Form.Item>
        </Col>

        {salaryType === "per_student" && (
          <>
            <Col span={6}>
              <Form.Item
                name="salaryPerStudent"
                label={
                  <span className="text-md !text-[14px] opacity-40">
                    Salary Per Student
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: "Please enter salary per student",
                  },
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  className="form-input !font-ArialLight !w-full"
                  placeholder="1500"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="attendanceThreshold"
                initialValue={50}
                label={
                  <span className="text-md !text-[14px] opacity-40">
                    Minimum Attendance %
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: "Please enter minimum attendance percentage",
                  },
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  max={100}
                  className="form-input !font-ArialLight !w-full"
                  placeholder="50"
                />
              </Form.Item>
            </Col>
          </>
        )}
      </Row>

      {/* Address - Full Width */}
      <Form.Item
        name="address"
        label={<span className="text-md !text-[14px] opacity-40">Address</span>}
        rules={[{ required: true, message: "Please enter Address" }]}
      >
        <Input.TextArea
          size="large"
          placeholder="Enter complete address"
          className="form-input !font-ArialLight"
          rows={2}
        />
      </Form.Item>

      {/* Profile Picture Upload */}
      <Form.Item
        name="profilePicture"
        label={
          <span className="text-md !text-[14px] opacity-40">
            Profile Picture
          </span>
        }
      >
        <div className="flex items-center gap-4">
          {imagePreview && (
            <Avatar
              size={80}
              src={imagePreview}
              icon={<UserOutlined />}
              className="border-2 border-gray-200"
            />
          )}
          <Upload
            onChange={handleImageUpload}
            beforeUpload={() => false}
            showUploadList={false}
            accept="image/*"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} size="large">
              {imagePreview ? "Change Picture" : "Upload Picture"}
            </Button>
          </Upload>
          {imagePreview && (
            <Button
              danger
              size="large"
              onClick={() => {
                setImagePreview(null);
                setUploadedFile(null);
                usedForm.setFieldsValue({ profilePicture: null });
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </Form.Item>
      {/* Course Assignment - Full Width */}
      {designation === "Trainer" && (
        <Form.Item
          name="courseId"
          label={
            <span className="text-md !text-[14px] opacity-40">
              Assign Courses (Multiple)
            </span>
          }
        >
          <Select
            mode="multiple"
            size="large"
            placeholder="Select courses to assign to this teacher"
            className="form-input !font-ArialLight"
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            maxTagCount={2}
            maxTagPlaceholder="..."
          >
            {courses.map((course) => (
              <Select.Option key={course._id} value={course._id}>
                {course.courseName} ({course.courseId})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {/* Submit Button */}
      <Form.Item>
        <Button
          type="Primery"
          htmlType="submit"
          size="large"
          loading={loading}
          className="bg-primary text-[#ffff] w-full h-[50px]"
        >
          {initialImage ? "Update Employee Info" : "Create Employee"}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TeacherForm;
