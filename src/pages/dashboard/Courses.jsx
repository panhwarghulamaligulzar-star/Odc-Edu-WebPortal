import {
  Button,
  Modal,
  message,
  Form,
  Card,
  Tag,
  Tooltip,
  Popconfirm,
  Empty,
  Avatar,
  Progress,
} from "antd";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClock,
  FaCalendar,
  FaDollarSign,
  FaUserTie,
  FaMoon,
  FaSun,
  FaGraduationCap,
  FaBook,
  FaIdCard,
  FaEnvelope,
  FaPhone,
  FaMale,
  FaFemale,
  FaUsers,
} from "react-icons/fa";
import { UserOutlined } from "@ant-design/icons";
import { MdMenuBook } from "react-icons/md";
import CourseForm from "../../components/forms/CourseForm";
import BatchManagement from "../../components/forms/BatchManagement";
import {
  createCourse as createCourseAPI,
  getCourses,
  updateCourse,
  deleteCourse,
} from "../../services/feeService";
import { EditIcon, GraduationCap } from "lucide-react";
import { useModulePermissions } from "../../hooks/usePermissions";

const Courses = () => {
  const permissions = useModulePermissions("courses");
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [form] = Form.useForm();
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setFetchingCourses(true);
    try {
      const response = await getCourses();
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch courses");
    } finally {
      setFetchingCourses(false);
    }
  };

  const handleCreateCourse = async (values) => {
    if (!permissions.create) {
      message.warning("You do not have permission to create courses.");
      return;
    }
    setLoading(true);
    try {
      const response = await createCourseAPI(values);
      if (response.success) {
        message.success("Course created successfully!");
        form.resetFields();
        setOpenModal(false);
        fetchCourses();
      }
    } catch (error) {
      message.error(error.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = async (values) => {
    if (!permissions.update) {
      message.warning("You do not have permission to update courses.");
      return;
    }
    setLoading(true);
    try {
      const response = await updateCourse(editingCourse._id, values);
      if (response.success) {
        message.success("Course updated successfully!");
        form.resetFields();
        setOpenModal(false);
        setEditMode(false);
        setEditingCourse(null);
        fetchCourses();
      }
    } catch (error) {
      message.error(error.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!permissions.delete) {
      message.warning("You do not have permission to delete courses.");
      return;
    }
    try {
      const response = await deleteCourse(courseId);
      if (response.success) {
        message.success("Course deleted successfully!");
        fetchCourses();
      }
    } catch (error) {
      message.error(error.message || "Failed to delete course");
    }
  };

  const handleShowTeacherDetails = (teacher) => {
    console.log("Selected teacher:", teacher);
    setSelectedTeacher(teacher);
    setShowTeacherModal(true);
  };

  const openBatchModal = (course) => {
    if (!permissions.update) {
      message.warning("You do not have permission to manage course batches.");
      return;
    }
    setSelectedCourse(course);
    setBatchModalVisible(true);
  };

  const openEditModal = (course) => {
    if (!permissions.update) {
      message.warning("You do not have permission to edit courses.");
      return;
    }
    setEditMode(true);
    setEditingCourse(course);
    form.setFieldsValue({
      courseId: course.courseId,
      courseName: course.courseName,
      courseCategory: course.courseCategory,
      duration: course.duration,
      admissionFee: course.admissionFee,
      courseFee: course.courseFee,
      certificateFee: course.certificateFee,
      totalFee: course.totalFee,
      teacherId: course.teacherId?.map((t) => t._id) || [],
    });
    setOpenModal(true);
  };

  const openCreateModal = () => {
    if (!permissions.create) {
      message.warning("You do not have permission to create courses.");
      return;
    }
    setEditMode(false);
    setEditingCourse(null);
    form.resetFields();
    setOpenModal(true);
  };

  return (
    <>
      <Modal
        title={
          <h4 className="h4 py-[12px]">
            {editMode ? "Edit Course" : "Create Course"}
          </h4>
        }
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setEditMode(false);
          setEditingCourse(null);
          form.resetFields();
        }}
        maskClosable
        footer={null}
        width={900}
        centered
      >
        <div
          style={{ maxHeight: "800px", overflowY: "auto", paddingRight: "8px" }}
        >
          <CourseForm
            form={form}
            loading={loading}
            onSubmit={editMode ? handleEditCourse : handleCreateCourse}
          />
        </div>
      </Modal>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdMenuBook size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
              Courses
            </h2>
            <p className="text-sm m-0" style={{ color: "#6b7280" }}>
              Browse & manage course catalog
            </p>
          </div>
        </div>
        {permissions.create && (
          <Button
            onClick={openCreateModal}
            type="primary"
            icon={<FaPlus />}
            size="large"
            className="btn-lg"
          >
            Create New Course
          </Button>
        )}
      </div>

      <div className="p-2 pb-[30px]">
        {fetchingCourses ? (
          <div className="flex justify-center items-center h-64">
            <LoaderSpnar />
          </div>
        ) : courses.length === 0 ? (
          <Empty
            description="No courses found. Create your first course!"
            className="mt-20"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {courses.map((course) => {
              // Debug log to check teacher data
              console.log(
                "Course:",
                course.courseName,
                "Teachers:",
                course.teacherId,
              );

              // Get course initials
              const getCourseInitials = (name) => {
                return name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
              };

              // Generate random progress for demo (you can replace with actual data)
              const progress = Math.floor(Math.random() * 60) + 20;

              return (
                <div
                  key={course._id}
                  className="relative"
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    border: "1px solid #E8EAF0",
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px",
                    minHeight: "240px",
                    borderColor: "#D1D6D4",
                  }}
                >
                  {/* Top Section - Title, Action Icon, and Status */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#2D3748",
                          margin: "0 0 4px 0",
                          fontFamily: "'Arial-bold', sans-serif",
                        }}
                      >
                        {course.courseName}
                      </h3>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#718096",
                          fontWeight: "500",
                        }}
                      >
                        {course.courseId}
                      </div>
                    </div>
                    {/* Action Icon Button */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        background: "rgba(1, 19, 76, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#01134C",
                        fontSize: "14px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <GraduationCap />
                    </div>
                  </div>

                  {/* Description Section */}
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#4A5568",
                      lineHeight: "1.4",
                      margin: "0 0 12px 0",
                      flex: 1,
                    }}
                  >
                    Duration:{" "}
                    {course.duration === 1
                      ? "1 Year"
                      : `${course.duration} Months`}
                  </p>

                  {/* Info Section with Icon */}
                  <div
                    style={{
                      borderTop: "",
                      paddingTop: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    {course.teacherId && course.teacherId.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "8px",
                        }}
                      >
                        {/* Teacher Profile Picture */}
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "2px solid #E8EAF0",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#F0F2F5",
                          }}
                        >
                          {course.teacherId[0]?.profilePicture ? (
                            <img
                              src={course.teacherId[0].profilePicture}
                              alt={course.teacherId[0].fullName}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; background: ${course.teacherId[0].gender === "Male" ? "#667eea" : "#FF5B7D"}; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold;">${course.teacherId[0].fullName
                                  ?.split(" ")
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}</div>`;
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background:
                                  course.teacherId[0]?.gender === "Male"
                                    ? "#667eea"
                                    : "#FF5B7D",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "16px",
                                fontWeight: "bold",
                              }}
                            >
                              {course.teacherId[0]?.fullName
                                ?.split(" ")
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#718096",
                              fontWeight: "500",
                            }}
                          >
                            Teacher
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#2D3748",
                              fontWeight: "600",
                            }}
                          >
                            {course.teacherId[0]?.fullName || "N/A"}
                            {course.teacherId.length > 1 &&
                              ` +${course.teacherId.length - 1}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fee Section */}
                  <div
                    style={{
                      background: "#F7FAFC",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E8EAF0",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#718096",
                        marginBottom: "2px",
                      }}
                    >
                      Total Course Fee
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#01134C",
                        fontFamily: "'Arial-bold', sans-serif",
                      }}
                    >
                      {course.totalFee?.toLocaleString()} PKR
                    </div>
                  </div>

                  {/* Bottom Action Section */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "auto",
                    }}
                  >
                    {/* Left Icons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {permissions.update && (
                        <Tooltip title="Manage Batches">
                          <div
                            onClick={() => openBatchModal(course)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              background: "rgba(59, 130, 246, 0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "#3B82F6",
                              fontSize: "14px",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(59, 130, 246, 0.25)";
                              e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                "rgba(59, 130, 246, 0.15)";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <FaUsers />
                          </div>
                        </Tooltip>
                      )}
                      {permissions.update && (
                        <div
                          onClick={() => openEditModal(course)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "rgba(102, 126, 234, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#667eea",
                            fontSize: "14px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(102, 126, 234, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              "rgba(102, 126, 234, 0.15)";
                          }}
                        >
                          <FaEdit />
                        </div>
                      )}
                      {permissions.delete && (
                        <Popconfirm
                          title="Delete Course"
                          description="Are you sure you want to delete this course?"
                          onConfirm={() => handleDeleteCourse(course._id)}
                          okText="Yes"
                          cancelText="No"
                          okButtonProps={{ danger: true }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              background: "#FEF2F2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "#EF4444",
                              fontSize: "14px",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <FaTrash />
                          </div>
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher Details Modal */}
      <Modal
        open={showTeacherModal}
        onCancel={() => setShowTeacherModal(false)}
        footer={null}
        width={650}
        centered
        bodyStyle={{ padding: "0" }}
      >
        {selectedTeacher && (
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              background: "white",
            }}
          >
            {/* Main Card Container */}
            <div
              style={{
                display: "flex",
                minHeight: "380px",
                background: "white",
                position: "relative",
              }}
            >
              {/* Left Section - White Background */}
              <div
                style={{
                  flex: 1,
                  background: "white",
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {/* Top Section - Icon and Title */}
                <div>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "#01134C",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "24px",
                      marginBottom: "16px",
                      border: "3px solid #01134C",
                    }}
                  >
                    <FaIdCard />
                  </div>
                  <h2
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "22px",
                      fontWeight: "bold",
                      color: "#01134C",
                      fontFamily: "'Arial-bold', sans-serif",
                    }}
                  >
                    Teacher Identity
                  </h2>
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "#718096",
                      fontWeight: "600",
                    }}
                  >
                    Identity Card
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      lineHeight: "1.6",
                      color: "#4B5563",
                      margin: "0",
                      marginBottom: "20px",
                    }}
                  >
                    This card verifies that the holder is a qualified
                    instructor, committed to providing quality education and
                    professional development.
                  </p>
                </div>

                {/* Bottom Section - Name, ID, and Barcode */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)",
                    color: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    marginTop: "16px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "24px",
                      fontWeight: "bold",
                      fontFamily: "'Arial-bold', sans-serif",
                    }}
                  >
                    {selectedTeacher.fullName}
                  </h3>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      opacity: 0.95,
                    }}
                  >
                    {selectedTeacher.teacherId}
                  </div>
                  {/* Barcode */}
                  <div
                    style={{
                      fontSize: "11px",
                      letterSpacing: "3px",
                      fontFamily: "monospace",
                      opacity: 0.8,
                      fontWeight: "bold",
                    }}
                  >
                    ║ ║║ ║ ║║ ║ ║║ ║ ║║ ║ ║║ ║ ║
                  </div>
                </div>
              </div>

              {/* Right Section - Profile Photo */}
              <div
                style={{
                  width: "280px",
                  background:
                    "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Decorative background shapes */}
                <div
                  style={{
                    position: "absolute",
                    top: "-40px",
                    right: "-40px",
                    width: "120px",
                    height: "120px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "-20px",
                    right: "20px",
                    width: "80px",
                    height: "80px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "50%",
                  }}
                />

                {/* Profile Picture Container */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "200px",
                      height: "200px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "4px solid rgba(255,255,255,0.4)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                      background: "#F3F4F6",
                    }}
                  >
                    {selectedTeacher.profilePicture ? (
                      <img
                        src={selectedTeacher.profilePicture}
                        alt={selectedTeacher.fullName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; background: #01134C; display: flex; align-items: center; justify-content: center; color: white; font-size: 60px; font-weight: bold;">${selectedTeacher.fullName
                            ?.split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}</div>`;
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "#01134C",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "60px",
                          fontWeight: "bold",
                        }}
                      >
                        {selectedTeacher.fullName
                          ?.split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Verification Badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-10px",
                      right: "-10px",
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      background: "white",
                      border: "4px solid rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px",
                      color: "#0EA5E9",
                      fontWeight: "bold",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    ✓
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Info Panel */}
            <div
              style={{
                background: "#F8F9FA",
                padding: "20px 28px",
                borderTop: "1px solid #E8EAF0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#718096",
                    fontWeight: "700",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <FaEnvelope style={{ color: "#01134C", fontSize: "14px" }} />
                  Email
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#2D3748",
                    fontWeight: "500",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedTeacher.email || "N/A"}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#718096",
                    fontWeight: "700",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <FaPhone style={{ color: "#01134C", fontSize: "14px" }} />
                  Contact
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#2D3748",
                    fontWeight: "500",
                  }}
                >
                  {selectedTeacher.contactNo}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#718096",
                    fontWeight: "700",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <FaIdCard style={{ color: "#01134C", fontSize: "14px" }} />
                  Specialization
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#2D3748",
                    fontWeight: "500",
                  }}
                >
                  {selectedTeacher.specialization || "Instructor"}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Management Modal */}
      <Modal
        open={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          setSelectedCourse(null);
        }}
        footer={null}
        width={1320}
        centered
        destroyOnClose
      >
        {selectedCourse && (
          <BatchManagement
            courseId={selectedCourse._id || selectedCourse.id || selectedCourse.courseId}
            courseName={selectedCourse.courseName}
          />
        )}
      </Modal>
    </>
  );
};

export default Courses;
