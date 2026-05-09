import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  DatePicker,
  Upload,
  Button,
  Modal,
  Switch,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import moment from "moment";
import { FaEye, FaPlus } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline, MdCampaign } from "react-icons/md";
import { formatDateOnlyForApi } from "../../utils/date";
import {
  createNewAnnouncement,
  getAllAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../services/announcement";
import { ScaleLoader } from "react-spinners";

// ==================== CONSTANTS ====================
const MODAL_TYPES = {
  CREATE: "create",
  EDIT: "edit",
  VIEW: "view",
};

const IMAGE_CONSTRAINTS = {
  MAX_SIZE_MB: 5,
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/jpg", "image/gif"],
};

// ==================== MAIN COMPONENT ====================
const Announcement = () => {
  // State Management
  const [form] = Form.useForm();
  const [announcements, setAnnouncements] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(MODAL_TYPES.CREATE);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ==================== API HANDLERS ====================

  /**
   * Fetch all announcements from the server
   */
  const fetchAnnouncements = async () => {
    try {
      setFetchLoading(true);
      const response = await getAllAnnouncement();

      // Handle different response structures
      const data = response?.data || response?.announcements || response;

      if (Array.isArray(data)) {
        setAnnouncements(data);
      } else {
        setAnnouncements([]);
        message.warning("No announcements found");
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
      message.error("Failed to load announcements. Please try again.");
      setAnnouncements([]);
    } finally {
      setFetchLoading(false);
    }
  };

  /**
   * Create a new announcement
   */
  const handleCreateAnnouncement = async (values) => {
    try {
      // Validation
      if (!values.date || !values.title?.trim() || !values.text?.trim()) {
        message.error("Please fill in all required fields");
        return;
      }

      if (!uploadedFile) {
        message.error("Please upload a banner image");
        return;
      }

      setLoading(true);

      // Prepare FormData
      const formData = new FormData();
      formData.append("title", values.title.trim());
      formData.append("text", values.text.trim());
      formData.append("date", formatDateOnlyForApi(values.date));
      formData.append("isActive", values.isActive ?? true);
      formData.append("bannerImage", uploadedFile);

      // API Call
      const response = await createNewAnnouncement(formData);

      if (response && !response.error) {
        message.success("Announcement created successfully!");
        await fetchAnnouncements();
        closeModal();
      } else {
        throw new Error(response?.message || "Failed to create announcement");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      handleApiError(error, "create");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing announcement
   */
  const handleUpdateAnnouncement = async (values) => {
    try {
      if (!selectedAnnouncement?._id && !selectedAnnouncement?.id) {
        message.error("No announcement selected for update");
        return;
      }

      if (!values.date || !values.title?.trim() || !values.text?.trim()) {
        message.error("Please fill in all required fields");
        return;
      }

      setLoading(true);
      // Prepare FormData
      const formData = new FormData();
      formData.append("title", values.title.trim());
      formData.append("text", values.text.trim());
      formData.append("date", formatDateOnlyForApi(values.date));
      formData.append("isActive", values.isActive ?? true);

      if (uploadedFile) {
        formData.append("bannerImage", uploadedFile);
      }

      // API Call
      const announcementId =
        selectedAnnouncement._id || selectedAnnouncement.id;
      const response = await updateAnnouncement(announcementId, formData);

      if (response && !response.error) {
        message.success("Announcement updated successfully!");
        await fetchAnnouncements();
        closeModal();
      } else {
        throw new Error(response?.message || "Failed to update announcement");
      }
    } catch (error) {
      console.error("Error updating announcement:", error);
      handleApiError(error, "update");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete an announcement with confirmation
   */
  const handleDeleteAnnouncement = (announcement) => {
    const announcementId = announcement._id || announcement.id;

    if (!announcementId) {
      message.error("Invalid announcement ID");
      return;
    }

    Modal.confirm({
      title: "Delete Announcement",
      content:
        "Are you sure you want to delete this announcement? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setLoading(true);
          const response = await deleteAnnouncement(announcementId);

          if (response && !response.error) {
            message.success("Announcement deleted successfully!");
            await fetchAnnouncements();
          } else {
            throw new Error(
              response?.message || "Failed to delete announcement",
            );
          }
        } catch (error) {
          console.error("Error deleting announcement:", error);
          handleApiError(error, "delete");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // ==================== MODAL HANDLERS ====================

  /**
   * Open modal for create/edit/view operations
   */
  const openModal = (type, announcement = null) => {
    setModalType(type);
    setSelectedAnnouncement(announcement);

    if (type === MODAL_TYPES.EDIT && announcement) {
      // Populate form for editing
      form.setFieldsValue({
        title: announcement.title,
        date: announcement.date ? moment(announcement.date) : null,
        text: announcement.text,
        isActive: announcement.isActive ?? true,
      });

      // Set image preview if exists
      if (announcement.bannerImage) {
        setImagePreview(`data:image/jpeg;base64,${announcement.bannerImage}`);
      }
    } else if (type === MODAL_TYPES.VIEW && announcement) {
      // Populate form for viewing
      form.setFieldsValue({
        title: announcement.title,
        date: announcement.date ? moment(announcement.date) : null,
        text: announcement.text,
        isActive: announcement.isActive,
      });

      if (announcement.bannerImage) {
        setImagePreview(`data:image/jpeg;base64,${announcement.bannerImage}`);
      }
    } else {
      // Reset for create
      resetModalState();
    }

    setModalVisible(true);
  };

  /**
   * Close modal and reset state
   */
  const closeModal = () => {
    setModalVisible(false);
    resetModalState();
  };

  /**
   * Reset modal state
   */
  const resetModalState = () => {
    form.resetFields();
    setSelectedAnnouncement(null);
    setImagePreview(null);
    setUploadedFile(null);
    setModalType(MODAL_TYPES.CREATE);
  };

  // ==================== FILE UPLOAD HANDLERS ====================

  /**
   * Handle image upload and validation
   */
  const handleImageChange = (info) => {
    const file = info.file.originFileObj || info.file;

    if (!file) return;

    // Validate file type
    const isImage = IMAGE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type);
    if (!isImage) {
      message.error("You can only upload image files (JPG, PNG, GIF)!");
      return;
    }

    // Validate file size
    const isValidSize = file.size / 1024 / 1024 < IMAGE_CONSTRAINTS.MAX_SIZE_MB;
    if (!isValidSize) {
      message.error(
        `Image must be smaller than ${IMAGE_CONSTRAINTS.MAX_SIZE_MB}MB!`,
      );
      return;
    }

    // Set file and preview
    setUploadedFile(file);
    form.setFieldsValue({ bannerImage: file.name });

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  /**
   * Remove uploaded image
   */
  const handleRemoveImage = () => {
    setImagePreview(null);
    setUploadedFile(null);
    form.setFieldsValue({ bannerImage: null });
  };

  // ==================== FORM HANDLERS ====================

  /**
   * Handle form submission based on modal type
   */
  const handleFormSubmit = (values) => {
    if (modalType === MODAL_TYPES.CREATE) {
      handleCreateAnnouncement(values);
    } else if (modalType === MODAL_TYPES.EDIT) {
      handleUpdateAnnouncement(values);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Handle API errors consistently
   */
  const handleApiError = (error, operation) => {
    let errorMessage = `Failed to ${operation} announcement. `;

    if (error?.response?.data) {
      errorMessage +=
        error.response.data.error ||
        error.response.data.message ||
        "Please try again.";
    } else if (error?.request) {
      errorMessage += "No response from server. Please check your connection.";
    } else if (error?.message) {
      errorMessage += error.message;
    } else {
      errorMessage += "An unexpected error occurred.";
    }

    message.error(errorMessage);
  };

  /**
   * Get modal title based on type
   */
  const getModalTitle = () => {
    const titles = {
      [MODAL_TYPES.CREATE]: "Create Announcement",
      [MODAL_TYPES.EDIT]: "Edit Announcement",
      [MODAL_TYPES.VIEW]: "View Announcement",
    };
    return <h4 className="h4 py-[12px]">{titles[modalType]}</h4>;
  };

  /**
   * Get modal footer based on type
   */
  const getModalFooter = () => {
    if (modalType === MODAL_TYPES.VIEW) {
      return [
        <Button key="close" onClick={closeModal}>
          Close
        </Button>,
      ];
    }
    return null;
  };

  // ==================== RENDER FUNCTIONS ====================

  /**
   * Render individual announcement item
   */
  const renderAnnouncementItem = (item) => {
    const itemId = item._id || item.id;
    const displayDate = item.createdAt || item.date;

    return (
      <div
        key={itemId}
        className="animate-fade-in bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow mb-2"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center">
          {/* Image */}
          <div className="md:col-span-1 flex md:justify-start">
            <div className="w-[50px] h-[50px] bg-gray-100 rounded-lg flex items-center justify-center text-xl overflow-hidden">
              {item.bannerImage ? (
                <img
                  src={`data:image/jpeg;base64,${item.bannerImage}`}
                  alt="Announcement"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400">📢</span>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="md:col-span-5">
            <h3 className="font-semibold text-gray-900 text-base">
              {item.title || item.text}
            </h3>
          </div>

          {/* Date */}
          <div className="md:col-span-3">
            <span className="text-sm text-gray-500 md:hidden font-medium">
              Publish Date:{" "}
            </span>
            <span className="text-sm text-gray-600">
              {displayDate ? moment(displayDate).format("MMM DD, YYYY") : "N/A"}
            </span>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <span className="text-sm text-gray-500 md:hidden font-medium">
              Status:{" "}
            </span>
            <span className="inline-block text-sm text-gray-700">
              {item.isActive ? "Published" : "Draft"}
            </span>
          </div>

          {/* Actions */}
          <div className="md:col-span-1 flex gap-2">
            <button
              onClick={() => openModal(MODAL_TYPES.VIEW, item)}
              className="btn-md-cricle !w-[30px] !h-[30px]"
              title="View"
            >
              <FaEye className="text-gray-600" />
            </button>
            <button
              onClick={() => openModal(MODAL_TYPES.EDIT, item)}
              className="btn-md-cricle !w-[30px] !h-[30px]"
              title="Edit"
            >
              <FiEdit className="text-gray-600" />
            </button>
            <button
              onClick={() => handleDeleteAnnouncement(item)}
              className="btn-md-cricle !w-[30px] !h-[30px]"
              title="Delete"
            >
              <MdDeleteOutline className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
      <p className="text-lg mb-2">No announcements yet</p>
      <p className="text-sm">Create your first announcement to get started</p>
    </div>
  );

  /**
   * Render loading state
   */
  const renderLoadingState = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
      <ScaleLoader
        color="#01134C"
        height={28}
        width={6}
        radius={2}
        margin={2}
        loading={true}
      />
    </div>
  );

  // ==================== MAIN RENDER ====================
  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdCampaign size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
              Announcements
            </h2>
            <p className="text-sm m-0" style={{ color: "#6b7280" }}>
              Broadcast notices & updates
            </p>
          </div>
        </div>
        <Button
          type="default"
          icon={<FaPlus />}
          onClick={() => openModal(MODAL_TYPES.CREATE)}
          className="btn-lg hover:!bg-blue-900 hover:!text-[#ffff] !w-[240px]"
        >
          Create New Announcement
        </Button>
      </div>

      {/* Table Header - Desktop Only */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 bg-white border-b border-gray-200 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        <div className="col-span-1">
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            IMAGE
          </span>
        </div>
        <div className="col-span-5">
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            TITLE
          </span>
        </div>
        <div className="col-span-3">
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            PUBLISH DATE
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            STATUS
          </span>
        </div>
        <div className="col-span-1">
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            ACTIONS
          </span>
        </div>
      </div>

      {/* Announcements List */}
      {fetchLoading ? (
        renderLoadingState()
      ) : announcements.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="space-y-2">
          {announcements.map((item) => renderAnnouncementItem(item))}
        </div>
      )}

      {/* Modal for Create/Edit/View */}
      <Modal
        open={modalVisible}
        title={getModalTitle()}
        onCancel={closeModal}
        footer={getModalFooter()}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          disabled={modalType === MODAL_TYPES.VIEW}
        >
          {/* Date Field */}
          <Form.Item
            label={
              <span className="text-md !text-[14px] opacity-40">Date</span>
            }
            name="date"
            rules={[{ required: true, message: "Please select a date" }]}
          >
            <DatePicker
              className="form-input w-full"
              disabled={modalType === MODAL_TYPES.VIEW}
              format="YYYY-MM-DD"
            />
          </Form.Item>

          {/* Title Field */}
          <Form.Item
            label={
              <span className="text-md !text-[14px] opacity-40">Title</span>
            }
            name="title"
            rules={[
              { required: true, message: "Please enter announcement title" },
              { min: 3, message: "Title must be at least 3 characters" },
            ]}
          >
            <Input
              placeholder="Enter announcement title"
              disabled={modalType === MODAL_TYPES.VIEW}
              className="form-input"
              maxLength={100}
              showCount
            />
          </Form.Item>

          {/* Text Field */}
          <Form.Item
            label={
              <span className="text-md !text-[14px] opacity-40">Text</span>
            }
            name="text"
            rules={[
              { required: true, message: "Please enter announcement text" },
              { min: 10, message: "Text must be at least 10 characters" },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter announcement text"
              disabled={modalType === MODAL_TYPES.VIEW}
              className="form-input"
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Image Upload */}
          <Form.Item
            label={
              <span className="text-md !text-[14px] opacity-40">
                Banner Image
              </span>
            }
            name="bannerImage"
            rules={
              modalType === MODAL_TYPES.CREATE
                ? [{ required: true, message: "Please upload an image" }]
                : []
            }
          >
            <div className="flex flex-col items-center">
              {!imagePreview && modalType !== MODAL_TYPES.VIEW && (
                <Upload
                  accept="image/*"
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={handleImageChange}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />} block size="large">
                    Upload Image (Max {IMAGE_CONSTRAINTS.MAX_SIZE_MB}MB)
                  </Button>
                </Upload>
              )}

              {imagePreview && (
                <div className="flex flex-col items-center w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-32 object-cover rounded-md border border-gray-400 mb-2"
                  />
                  {modalType !== MODAL_TYPES.VIEW && (
                    <Button danger size="small" onClick={handleRemoveImage}>
                      Remove Image
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Form.Item>

          {/* Active Toggle */}
          <Form.Item
            label={
              <span className="text-md !text-[14px] opacity-40">
                Active Status
              </span>
            }
            name="isActive"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              disabled={modalType === MODAL_TYPES.VIEW}
              className="custom-toggle"
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </Form.Item>

          {/* Submit Button */}
          {modalType !== MODAL_TYPES.VIEW && (
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="btn-xl hover:!bg-blue-900"
                size="large"
              >
                {modalType === MODAL_TYPES.EDIT
                  ? "Update Announcement"
                  : "Create Announcement"}
              </Button>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Animations */}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Announcement;
