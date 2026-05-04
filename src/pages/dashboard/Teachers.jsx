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
} from "antd";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaPhone,
  FaIdCard,
  FaBook,
  FaCalendar,
  FaUser,
  FaMale,
  FaFemale,
  FaEnvelope,
  FaBriefcase,
  FaPrint,
  FaHome,
} from "react-icons/fa";
import { UserOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import TeacherForm from "../../components/forms/TeacherForm";
import {
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  getCourses,
} from "../../services/feeService";
import dayjs from "dayjs";
import odcLogo from "../../assets/images/logos/new logo.png";
import { MdPeopleAlt } from "react-icons/md";

const Teachers = () => {
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [fetchingTeachers, setFetchingTeachers] = useState(true);
  const [form] = Form.useForm();
  const [showIdCard, setShowIdCard] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Fetch teachers and courses on mount
  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchTeachers = async () => {
    setFetchingTeachers(true);
    try {
      const response = await getAllTeachers();
      console.log("=== FETCHED TEACHERS ===");
      console.log("Response:", response);
      if (response.success) {
        console.log("Teachers Data:", response.data);
        // Log first teacher to see structure
        if (response.data.length > 0) {
          console.log("First Teacher Fields:", Object.keys(response.data[0]));
          console.log("First Teacher Data:", response.data[0]);
        }
        setTeachers(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch teachers");
    } finally {
      setFetchingTeachers(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch courses");
    }
  };

  const handleCreateTeacher = async (values) => {
    setLoading(true);
    try {
      const response = await createTeacher(values);
      if (response.success) {
        message.success("Teacher created successfully!");
        form.resetFields();
        setOpenModal(false);
        fetchTeachers();
      }
    } catch (error) {
      message.error(error.message || "Failed to create teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeacher = async (values) => {
    setLoading(true);
    try {
      const response = await updateTeacher(editingTeacher._id, values);
      if (response.success) {
        message.success("Teacher updated successfully!");
        form.resetFields();
        setOpenModal(false);
        setEditMode(false);
        setEditingTeacher(null);
        fetchTeachers();
      }
    } catch (error) {
      message.error(error.message || "Failed to update teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    try {
      const response = await deleteTeacher(teacherId);
      if (response.success) {
        message.success("Teacher deleted successfully!");
        fetchTeachers();
      }
    } catch (error) {
      message.error(error.message || "Failed to delete teacher");
    }
  };

  const openEditModal = (teacher) => {
    console.log("Editing teacher:", teacher);
    setEditMode(true);
    setEditingTeacher(teacher);
    form.setFieldsValue({
      teacherId: teacher.teacherId,
      fullName: teacher.fullName,
      fatherName: teacher.fatherName,
      gender: teacher.gender,
      appointmentDate: teacher.appointmentDate
        ? dayjs(teacher.appointmentDate)
        : null,
      contactNo: teacher.contactNo,
      contractPeriod: teacher.contractPeriod,
      cnicNo: teacher.cnicNo,
      address: teacher.address,
      courseId: teacher.courseId?.map((c) => c._id) || [],
      // New fields
      designation: teacher.designation,
      highestQualification: teacher.highestQualification,
      degreeTitle: teacher.degreeTitle,
      majorSubject: teacher.majorSubject,
      teachingExperience: teacher.teachingExperience,
      computerSkills: teacher.computerSkills || [],
      monthlySalary: teacher.monthlySalary,
    });
    setOpenModal(true);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setEditingTeacher(null);
    form.resetFields();
    setOpenModal(true);
  };

  const openIdCardModal = (teacher) => {
    console.log("Selected teacher for detail view:", teacher);
    setSelectedTeacher(teacher);
    setShowIdCard(true);
  };

  // Get teacher initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Modal
        title={
          <h4 className="h4 py-[12px]">
            {editMode ? "Edit Teacher" : "Create Employee"}
          </h4>
        }
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setEditMode(false);
          setEditingTeacher(null);
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
          <TeacherForm
            form={form}
            loading={loading}
            onSubmit={editMode ? handleEditTeacher : handleCreateTeacher}
            courses={courses}
            initialImage={editingTeacher?.profilePicture || null}
          />
        </div>
      </Modal>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdPeopleAlt size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0" style={{ color: "#01134C" }}>
              Employees
            </h2>
            <p className="text-sm m-0" style={{ color: "#6b7280" }}>
              Manage staff & teacher profiles
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateModal}
          type="primary"
          icon={<FaPlus />}
          size="large"
          className="btn-lg"
        >
          Create Employee
        </Button>
      </div>

      <div className="p-2">
        {fetchingTeachers ? (
          <div className="flex justify-center items-center h-64">
            <LoaderSpnar />
          </div>
        ) : teachers.length === 0 ? (
          <Empty
            description="No teachers found. Add your first teacher!"
            className="mt-20"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {teachers.map((teacher) => {
              // Debug log for each teacher
              console.log("Rendering teacher card:", {
                id: teacher.teacherId,
                designation: teacher.designation,
                highestQualification: teacher.highestQualification,
                majorSubject: teacher.majorSubject,
                teachingExperience: teacher.teachingExperience,
                allFields: teacher,
              });

              return (
                <div
                  key={teacher._id}
                  style={{
                    width: "100%",
                    height: "260px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    background:
                      "linear-gradient(135deg, #E8F0FE 0%, #F0F4FF 100%)",
                    position: "relative",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  className="hover:shadow-2xl hover:scale-[1.02] overflow-hidden"
                >
                  {/* Main Content Area */}
                  <div
                    style={{
                      display: "flex",
                      height: "calc(100% - 52px)",
                    }}
                  >
                    {/* Left Section - Info */}
                    <div
                      style={{
                        flex: 1,
                        background: "white",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {/* Teacher Information */}
                      <div style={{ flex: 1, overflowY: "auto" }}>
                        {/* ID Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginBottom: "10px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontWeight: "800",
                              minWidth: "80px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            ID:
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              fontWeight: "400",
                              flex: 1,
                              textAlign: "right",
                            }}
                          >
                            {teacher.teacherId || "N/A"}
                          </span>
                        </div>

                        {/* Designation Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontWeight: "800",
                              minWidth: "80px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            Designation:
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              fontWeight: "400",
                              flex: 1,
                              textAlign: "right",
                            }}
                          >
                            {teacher.designation || "N/A"}
                          </span>
                        </div>

                        {/* Phone Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontWeight: "800",
                              minWidth: "80px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            Phone:
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              fontWeight: "400",
                              flex: 1,
                              textAlign: "right",
                            }}
                          >
                            {teacher.contactNo || "N/A"}
                          </span>
                        </div>

                        {/* Qualification Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontWeight: "800",
                              minWidth: "80px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            Education:
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              fontWeight: "400",
                              flex: 1,
                              textAlign: "right",
                            }}
                          >
                            {teacher.highestQualification || "N/A"}
                          </span>
                        </div>

                        {/* Major Subject Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontWeight: "800",
                              minWidth: "80px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            Subject:
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              fontWeight: "400",
                              flex: 1,
                              textAlign: "right",
                            }}
                          >
                            {teacher.majorSubject || "N/A"}
                          </span>
                        </div>

                        {/* Experience Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              fontWeight: "800",
                              minWidth: "80px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            Experience:
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              fontWeight: "400",
                              flex: 1,
                              lineHeight: "1.4",
                              textAlign: "right",
                            }}
                          >
                            {teacher.teachingExperience
                              ? `${teacher.teachingExperience}${teacher.teachingExperience === "Fresh" ? "" : teacher.teachingExperience === "1" ? " Year" : " Years"}`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Photo */}
                    <div
                      style={{
                        width: "160px",
                        background: "#ffff",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      {/* Photo Container */}
                      <div
                        style={{
                          width: "130px",
                          height: "130px",
                          overflow: "hidden",
                          border: "4px solid rgba(255,255,255,0.5)",
                          borderRadius: "16px",
                          background: "#ffff",
                          position: "relative",
                        }}
                      >
                        {teacher.profilePicture ? (
                          <img
                            src={teacher.profilePicture}
                            alt={teacher.fullName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
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
                              fontSize: "40px",
                              color: "white",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                            }}
                          >
                            {getInitials(teacher.fullName)}
                          </div>
                        )}
                      </div>

                      {/* Teacher Name */}
                      <div style={{ textAlign: "center" }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "15px",
                            fontWeight: "bold",
                            letterSpacing: "0.3px",
                            color: "#01134C",
                            lineHeight: "1.3",
                          }}
                        >
                          {teacher.fullName || "Unknown"}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Positioned at bottom */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "16px",
                      right: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "6px",
                      zIndex: 10,
                    }}
                  >
                    <Button
                      type="primary"
                      icon={<FaPrint />}
                      onClick={() => openIdCardModal(teacher)}
                      style={{
                        background: "#01134C",
                        borderColor: "#01134C",
                        fontWeight: "600",
                        fontSize: "11px",
                        height: "30px",
                      }}
                      size="small"
                    >
                      View Details
                    </Button>
                    <div className="flex gap-[10px]">
                      <Button
                        icon={<FaEdit />}
                        onClick={() => openEditModal(teacher)}
                        size="small"
                        style={{
                          background: "white",
                          borderColor: "#01134C",
                          color: "#01134C",
                          height: "30px",
                          width: "30px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                      <Popconfirm
                        title="Delete Teacher"
                        description="Are you sure you want to delete this teacher?"
                        onConfirm={() => handleDeleteTeacher(teacher._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          danger
                          icon={<FaTrash />}
                          size="small"
                          style={{ width: "30px", height: "30px" }}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ID Card Modal - Detailed View */}
      <Modal
        open={showIdCard}
        onCancel={() => {
          setShowIdCard(false);
          setSelectedTeacher(null);
        }}
        footer={null}
        width={700}
        centered
        bodyStyle={{ padding: "0" }}
      >
        {selectedTeacher && (
          <div
            style={{
              width: "100%",
              borderRadius: "16px",
              overflow: "hidden",
              background: "linear-gradient(135deg, #E8F0FE 0%, #F0F4FF 100%)",
              position: "relative",
            }}
          >
            {/* Main Content Area */}
            <div
              style={{
                display: "flex",
                minHeight: "400px",
              }}
            >
              {/* Left Section - Info */}
              <div
                style={{
                  flex: 1,
                  background: "white",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Teacher Information */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {/* ID Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "14px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Employee ID:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.teacherId || "N/A"}
                    </span>
                  </div>

                  {/* Father Name Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Father Name:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.fatherName || "N/A"}
                    </span>
                  </div>

                  {/* Gender Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Gender:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.gender || "N/A"}
                    </span>
                  </div>

                  {/* Phone Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Contact Number:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.contactNo || "N/A"}
                    </span>
                  </div>

                  {/* CNIC Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      CNIC:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                        lineHeight: "1.4",
                      }}
                    >
                      {selectedTeacher.cnicNo || "N/A"}
                    </span>
                  </div>

                  {/* Designation Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Designation:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.designation || "N/A"}
                    </span>
                  </div>

                  {/* Appointment Date Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Appointment Date:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.appointmentDate
                        ? dayjs(selectedTeacher.appointmentDate).format(
                            "DD-MMM-YYYY",
                          )
                        : "N/A"}
                    </span>
                  </div>

                  {/* Contract Period Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Contract Period:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.contractPeriod || "N/A"}
                    </span>
                  </div>

                  {/* Highest Qualification Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Qualification:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.highestQualification || "N/A"}
                    </span>
                  </div>

                  {/* Degree Title Row */}
                  {selectedTeacher.degreeTitle && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          fontWeight: "800",
                          minWidth: "130px",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        Degree Title:
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#333",
                          fontWeight: "400",
                          flex: 1,
                        }}
                      >
                        {selectedTeacher.degreeTitle}
                      </span>
                    </div>
                  )}

                  {/* Major Subject Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Major Subject:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.majorSubject || "N/A"}
                    </span>
                  </div>

                  {/* Teaching Experience Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Experience:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                      }}
                    >
                      {selectedTeacher.teachingExperience
                        ? `${selectedTeacher.teachingExperience}${selectedTeacher.teachingExperience === "Fresh" ? "" : selectedTeacher.teachingExperience === "1" ? " Year" : " Years"}`
                        : "N/A"}
                    </span>
                  </div>

                  {/* Computer Skills Row */}
                  {selectedTeacher.computerSkills &&
                    selectedTeacher.computerSkills.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          marginBottom: "14px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            fontWeight: "800",
                            minWidth: "130px",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          Skills:
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            fontWeight: "400",
                            flex: 1,
                            lineHeight: "1.6",
                          }}
                        >
                          {selectedTeacher.computerSkills.join(", ")}
                        </span>
                      </div>
                    )}

                  {/* Monthly Salary Row */}
                  {selectedTeacher.monthlySalary && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          fontWeight: "800",
                          minWidth: "130px",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        Monthly Salary:
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#333",
                          fontWeight: "400",
                          flex: 1,
                        }}
                      >
                        {selectedTeacher.monthlySalary || "N/A"}
                      </span>
                    </div>
                  )}

                  {/* Address Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        fontWeight: "800",
                        minWidth: "130px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Address:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        fontWeight: "400",
                        flex: 1,
                        lineHeight: "1.4",
                      }}
                    >
                      {selectedTeacher.address || "N/A"}
                    </span>
                  </div>

                  {/* Assigned Courses Row */}
                  {selectedTeacher.courseId &&
                    selectedTeacher.courseId.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          marginBottom: "14px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            fontWeight: "800",
                            minWidth: "130px",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          Assigned Courses:
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            fontWeight: "400",
                            flex: 1,
                            lineHeight: "1.6",
                          }}
                        >
                          {selectedTeacher.courseId
                            .map((c) => c.courseName)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              {/* Right Section - Photo */}
              <div
                style={{
                  width: "250px",
                  background: "#ffff",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                {/* Photo Container */}
                <div
                  style={{
                    width: "200px",
                    height: "200px",
                    overflow: "hidden",
                    border: "4px solid rgba(255,255,255,0.5)",
                    borderRadius: "16px",
                    background: "#ffff",
                    position: "relative",
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
                        fontSize: "60px",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      {getInitials(selectedTeacher.fullName)}
                    </div>
                  )}
                </div>

                {/* Teacher Name */}
                <div style={{ textAlign: "center" }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "20px",
                      fontWeight: "bold",
                      letterSpacing: "0.3px",
                      color: "#01134C",
                      lineHeight: "1.3",
                    }}
                  >
                    {selectedTeacher.fullName}
                  </h4>
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "14px",
                      color: "#666",
                      fontWeight: "500",
                    }}
                  >
                    {selectedTeacher.designation ||
                      selectedTeacher.majorSubject ||
                      "Employee"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .id-card-container, .id-card-container * {
            visibility: visible;
          }
          .id-card-container {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
          .ant-modal-wrap {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default Teachers;
