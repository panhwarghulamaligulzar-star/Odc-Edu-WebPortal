import { Button, DatePicker, Form, Input, Select, Upload, message } from 'antd';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { UploadOutlined } from '@ant-design/icons';
import { createCertification, updateCertification } from '../../services/certificationService';
import LoaderSpnar from '../../components/loader/loaderSpnar';

const UpdateCertification = ({ selectedRecord, modalType, setIsModalVisible, getAllCertificationsData, onSuccess }) => {
  const [form] = Form.useForm();
  const [imagePreview, setImagePreview] = useState(
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s"
  );
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // console.log("selectedRecord", selectedRecord)

  useEffect(() => {
    if (selectedRecord) {
      form.setFieldsValue({
        registrationNo: selectedRecord.registrationNo || '',
        courseId: selectedRecord.courseId || '',
        certificateNo: selectedRecord.certificateNo || '',
        studentName: selectedRecord.studentName || '',
        fatherName: selectedRecord.fatherName || '',
        course: selectedRecord.course || '',
        duration: selectedRecord.duration || '',
        startingDate: selectedRecord.startingDate ? dayjs(selectedRecord.startingDate) : null,
        endingDate: selectedRecord.endingDate ? dayjs(selectedRecord.endingDate) : null,
        issueDate: selectedRecord.issueDate ? dayjs(selectedRecord.issueDate) : null,
        grade: selectedRecord.grade || '',
        skills: selectedRecord.skills || [],
        imageUrl: selectedRecord.imageUrl || '',
      });

      // Set image preview if exists
      if (selectedRecord.imageUrl) {
        setImagePreview(`${selectedRecord.imageUrl}`);
      }
    } else {
      form.resetFields();
      setImagePreview("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s");
      setUploadedFile(null);
    }
  }, [selectedRecord, form]);

  // Handle image change and preview
  // const handleImageChange = (info) => {
  //   const file = info.file.originFileObj || info.file;
    
  //   if (file) {
  //     const isImage = file.type.startsWith('image/');
  //     if (!isImage) {
  //       message.error('You can only upload image files!');
  //       return;
  //     }

  //     const isLt5M = file.size / 1024 / 1024 < 5;
  //     if (!isLt5M) {
  //       message.error('Image must be smaller than 5MB!');
  //       return;
  //     }

  //     setUploadedFile(file);

  //     form.setFieldsValue({
  //       imageUrl: file.name
  //     });

  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       setImagePreview(e.target.result);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  // Create certification with API call
 const createStudentCertification = async (values) => {
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("registrationNo", values.registrationNo);
    formData.append("courseId", values.courseId);
    formData.append("certificateNo", values.certificateNo);
    formData.append("studentName", values.studentName);
    formData.append("fatherName", values.fatherName);
    formData.append("course", values.course);
    formData.append("duration", values.duration);
    formData.append("startingDate", values.startingDate?.format("YYYY-MM-DD"));
    formData.append("endingDate", values.endingDate?.format("YYYY-MM-DD"));
    formData.append("issueDate", values.issueDate?.format("YYYY-MM-DD"));
    formData.append("grade", values.grade);
    formData.append("skills", values.skills);
    // Check real values
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }
    // console.log("formData", formData)
    const response = await createCertification(formData);
    message.success(response?.message || 'Certification created successfully!');
    form.resetFields();
    setUploadedFile(null);
    setIsModalVisible?.(false);
    getAllCertificationsData?.();
    onSuccess?.();
  } catch (error) {
    console.error("Error creating certification:", error);
    message.error(error?.response?.data?.message || "Failed to create certification.");
  } finally {
    setLoading(false);
  }
};

  // Update certification
  const updateCertificationInfo = async (values) => {
    console.log("values", values)
    if (!selectedRecord?._id) {
      message.error("Certification ID not found!");
      return;
    }
    
    setLoading(true);
    
    try {
      const formData = new FormData();
       formData.append("registrationNo", values.registrationNo);
      formData.append("courseId", values.courseId);
      formData.append("certificateNo", values.certificateNo);
      formData.append("fatherName", values.fatherName);
      formData.append("course", values.course);
      formData.append("duration", values.duration);
      formData.append("startingDate", values.startingDate.format("YYYY-MM-DD"));
      formData.append("endingDate", values.endingDate.format("YYYY-MM-DD"));
      formData.append("issueDate", values.issueDate.format("YYYY-MM-DD"));
      formData.append("grade", String(values.grade).trim());
      formData.append("skills", JSON.stringify(values.skills || []));
      formData.append("remarks", values.remarks);

      // if (uploadedFile) {
      //   formData.append("image", uploadedFile);
      // }

      const response = await updateCertification(selectedRecord._id, formData);
      // ✅ Show success message
      if(response?.success==true){
        setIsModalVisible(false);
        message.success(response?.message || 'Certification updated successfully!');
        getAllCertificationsData();
      }
    } catch (error) {
      console.error("Update error", error);
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || "Failed to update certification. Please try again.";
      
      message.error(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission based on modal type
  const handleFormSubmit = (values) => {
    if (modalType === "edit") {
      updateCertificationInfo(values);
    } else {
      createStudentCertification(values);
    }
  };

  return (
    <div className="w-full">
      {/* Scrollable Container */}
      <div className="max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleFormSubmit}
          disabled={loading}
        >
          <Form.Item
            name="registrationNo"
            label={<span className="text-md !text-[14px] opacity-40">Registration No</span>}
            rules={[{ required: true, message: 'Please enter Registration No' }]}
          >
            <Input placeholder="Enter Registration No." size="large" className="form-input" />
          </Form.Item>

          {/* NEW: Registration No */}
          <Form.Item
            name="courseId"
            label={<span className="text-md !text-[14px] opacity-40">Course Id</span>}
            rules={[{ required: true, message: 'Please enter Course Id ' }]}
          >
            <Input placeholder="e.g., IT-0017" size="large" className="form-input" />
          </Form.Item>

          {/* NEW: Certificate No */}
          <Form.Item
            name="certificateNo"
            label={<span className="text-md !text-[14px] opacity-40">Certificate No.</span>}
            rules={[{ required: true, message: 'Please enter Certificate No.' }]}
          >
            <Input placeholder="e.g., 0017" size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="studentName"
            label={<span className="text-md !text-[14px] opacity-40">Student Name</span>}
            rules={[{ required: true, message: 'Please enter Student Name' }]}
          >
            <Input placeholder="Enter Student Name" size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="fatherName"
            label={<span className="text-md !text-[14px] opacity-40">Father's Name</span>}
            rules={[{ required: true, message: "Please enter Father's Name" }]}
          >
            <Input placeholder="Enter Father's Name" size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="course"
            label={<span className="text-md !text-[14px] opacity-40">Course</span>}
            rules={[{ required: true, message: 'Please enter Course' }]}
          >
            <Input placeholder="Enter Course" size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="duration"
            label={<span className="text-md !text-[14px] opacity-40">Duration</span>}
            rules={[{ required: true, message: 'Please enter Duration' }]}
          >
            <Input placeholder="Enter Duration (e.g., 6 Months)" size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="startingDate"
            label={<span className="text-md !text-[14px] opacity-40">Starting Date</span>}
            rules={[{ required: true, message: 'Please select Starting Date' }]}
          >
            <DatePicker style={{ width: '100%' }} size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="endingDate"
            label={<span className="text-md !text-[14px] opacity-40">Ending Date</span>}
            rules={[{ required: true, message: 'Please select Ending Date' }]}
          >
            <DatePicker style={{ width: '100%' }} size="large" className="form-input" />
          </Form.Item>

          <Form.Item
            name="issueDate"
            label={<span className="text-md !text-[14px] opacity-40">Issue Date</span>}
            rules={[{ required: true, message: 'Please select Issue Date' }]}
          >
            <DatePicker style={{ width: '100%' }} size="large" className="form-input" />
          </Form.Item>

        {/* Grade Input - Accept numbers with %, letters, or numeric values */}
        <Form.Item
          name="grade"
          label={<span className="text-md !text-[14px] opacity-40">Grade</span>}
          rules={[{ required: true, message: 'Please enter Grade' }]}
        >
          <Input 
            placeholder="Enter Grade (e.g., 90%, 85, A+, B, C)" 
            size="large" 
            className="form-input" 
          />
        </Form.Item>

        {/* Skills Input - Simple Text */}
        <Form.Item
          name="skills"
          label={<span className="text-md !text-[14px] opacity-40">Skills</span>}
          rules={[{ required: true, message: 'Please enter skills' }]}
        >
          <Input 
            placeholder="Enter skills separated by commas (e.g., HTML, CSS, JavaScript)" 
            size="large" 
            className="form-input" 
          />
        </Form.Item>

          {/* <Form.Item
            name="remarks"
            label={<span className="text-md !text-[14px] opacity-40">Remarks</span>}
          >
            <Input.TextArea 
              placeholder="Enter Remarks" 
              rows={3} 
              size="large" 
              className="form-input" 
            />
          </Form.Item> */}

          {/* Image Preview */}
          {/* <div className="flex justify-center items-center">
            <img
              src={imagePreview}
              alt="Profile Preview"
              style={{
                width: 120,
                height: 120,
                borderRadius: "10px",
                border: "2px solid #01134C",
                objectFit: "cover"
              }}
            />
          </div> */}

          {/* Upload Component */}
          {/* <Form.Item
            className="flex justify-center items-center mt-[20px]"
            name="imageUrl"
            rules={[{ required: modalType !== "edit", message: 'Please upload photo' }]}
          >
            <Upload
              accept="image/*"
              maxCount={1}
              beforeUpload={() => false}
              onChange={handleImageChange}
              showUploadList={true}
            >
              <Button icon={<UploadOutlined />} block size="large">
                <span className="text-md !text-[14px] opacity-40">Upload Photo</span>
              </Button>
            </Upload>
          </Form.Item> */}
        </Form>
      </div>

      {/* Submit Button - Outside scroll container so it stays visible */}
      <div className="mt-4 pt-4 border-t">
        <Button 
          type="primary" 
          htmlType="submit"
          onClick={() => form.submit()}
          block 
          size="large"
          className="btn-xl hover:!bg-blue-900"
          disabled={loading}
        >
          {loading ? <LoaderSpnar /> : modalType === 'edit' ? 'Update Certification' : 'Create Certification'}
        </Button>
      </div>
    </div>
  );
};

export default UpdateCertification;