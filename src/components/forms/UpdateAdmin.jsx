
import { Form, Input, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { createNewAdmin } from "../../services/authService";
import LoaderSpnar from "../loader/loaderSpnar";
import { updateAdminInfo } from "../../services/adminService";
import { Toaster } from "react-hot-toast";


const UpdateAdmin = ({selectedAdmin, modalType, onSuccess,setIsModalVisible,getAllAdminsData}) => {
  const [form] = Form.useForm();
  const [imagePreview, setImagePreview] = useState(
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s"
  );
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {    
    if (selectedAdmin) {
      form.setFieldsValue({
        name: selectedAdmin.name || "",
        email: selectedAdmin.email || "",
        role: selectedAdmin.role || "",
        password: selectedAdmin.password,
        confirmPassword: "",
        profile: selectedAdmin.profile || "",
      });

      if (selectedAdmin.profile) {
        setImagePreview(`data:image/png;base64,${selectedAdmin.profile}`);
      }
    }else{
      form.resetFields()
    }
  }, [selectedAdmin, form]);

  // Handle image change and preview
  const handleImageChange = (info) => {
    const file = info.file.originFileObj || info.file;
    
    if (file) {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Image must be smaller than 5MB!');
        return;
      }

      setUploadedFile(file);

      form.setFieldsValue({
        profile: file.name
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission with API call
  const createAdminAccount = async (values) => {
    // console.log("values", values)
    if (!uploadedFile) {
      message.error('Please upload a profile picture!');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('role', values.role);
      formData.append('password', values.password);
      formData.append('profile', uploadedFile);

      // console.log("formData", formData)
      const response = await createNewAdmin(formData);
      setIsModalVisible(false);
      getAllAdminsData();
      message.success(response?.message)
      form.resetFields();
      setImagePreview("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s");
      setUploadedFile(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating admin:', error);
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || 'Failed to create admin account. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // Update Admin info
 const updateAdmin = async (values) => {
  if (!selectedAdmin?._id) {
    message.error("Admin ID not found!");
    return;
  }
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("email", values.email);
    formData.append("role", values.role);

    if (values.password) {
      formData.append("password", values.password);
    }

    if (uploadedFile) {
      formData.append("profile", uploadedFile);
    }
    const response = await updateAdminInfo(selectedAdmin._id, formData);
    // console.log("response", response)
    if(response?.status==="success"){
    setIsModalVisible(false);
    getAllAdminsData();
    message.success(response?.message)
    }
  } catch (error) {
    console.error("Update error", error);
    message.error(error?.response?.data?.message || "Update failed");
  } finally {
    setLoading(false);
  }
};


  // Handle form submission based on modal type
  const handleFormSubmit = (values) => {
    if (modalType === "edit") {
      updateAdmin(values);
   
    } else {
      createAdminAccount(values);
      console.log("create")
    }
  };

  return (
    <div className="w-full"> 
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleFormSubmit}
        disabled={loading || deleteLoading}
      >
        <Form.Item
          label={<span className="text-md !text-[14px] opacity-40">Name</span>}
          name="name"
          rules={[{ required: true, message: 'Please enter name' }]}
        >
          <Input placeholder="name" size="large" className="form-input"/>
        </Form.Item>

        <Form.Item
          label={<span className="text-md !text-[14px] opacity-40">Email</span>}
          name="email"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: "email", message: "Invalid email" },
          ]}
        >
          <Input placeholder="Enter Email" size="large" className="form-input"/>
        </Form.Item>

        
              <Form.Item
                    label={<span className="text-md !text-[14px] opacity-40">Role</span>}
                    name="role"
                    rules={[
                      { required: true, message: 'Please enter role' },
                    ]}
                  >
                    <Input placeholder="Enter user role" size="large" className="form-input"/>
                  </Form.Item>
          
                {
                  modalType === "create" && (
                <Form.Item
                          label={<span className="text-md !text-[14px] opacity-40">password</span>}
                          name="password"
                          rules={[
                            { required: true, message: 'Please enter password' },
                            { min: 6, message: 'Password must be at least 6 characters' }
                          ]}
                        >
                          <Input.Password placeholder="Enter Password" size="large" className="form-input password-input "/>
                        </Form.Item>
                  )
                }
                
        {modalType !== "edit" && (
          <Form.Item
            label={<span className="text-md !text-[14px] opacity-40">Confirm Password</span>}
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm Password" size="large" className="form-input password-input " />
          </Form.Item>
        )}
                
        {/* Image Preview */}
        <div className="flex justify-center items-center">
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
        </div>

        {/* Upload Component */}
        <Form.Item
          className="flex justify-center items-center mt-[20px]"
          name="profile"
          rules={[{ required: modalType !== "edit", message: 'Please upload profile picture' }]}
        >
          <Upload
            accept="image/*"
            maxCount={1}
            beforeUpload={() => false}
            onChange={handleImageChange}
            showUploadList={true}
          >
            <Button icon={<UploadOutlined />} block size="large">
              <span className="text-md !text-[14px] opacity-40">Upload Profile Picture</span>
            </Button>
          </Upload>
        </Form.Item>

        <Button 
          type="primary" 
          htmlType="submit" 
          block 
          size="large"
          className="btn-xl hover:!bg-blue-900"
        >
          {loading ? <LoaderSpnar/> : modalType === "edit" ? `Update Admin Account` : 'Create Admin Account'}
        </Button>

        
      </Form>
    </div>
  );
};

export default UpdateAdmin;