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
  Pagination,
  Input,
  Upload,
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
  FaFileExcel,
  FaFileImport,
  FaFileDownload,
} from "react-icons/fa";
import { UserOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import TeacherForm from "../../components/forms/TeacherForm";
import {
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  getCourses,
  bulkImportTeachers,
} from "../../services/feeService";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import odcLogo from "../../assets/images/logos/new logo.png";
import { MdPeopleAlt } from "react-icons/md";
import { useModulePermissions } from "../../hooks/usePermissions";

const TEACHERS_PER_PAGE = 10;

const Teachers = () => {
  const permissions = useModulePermissions("employees");
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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importingEmployees, setImportingEmployees] = useState(false);
  const [exportingEmployees, setExportingEmployees] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Fetch teachers and courses on mount
  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchTeachers = async () => {
    setFetchingTeachers(true);
    try {
      const response = await getAllTeachers();
      if (response.success) {
        setTeachers(response.data);
        setCurrentPage(1);
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
    if (!permissions.create) {
      message.warning("You do not have permission to create employees.");
      return;
    }
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
    if (!permissions.update) {
      message.warning("You do not have permission to update employees.");
      return;
    }
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
    if (!permissions.delete) {
      message.warning("You do not have permission to delete employees.");
      return;
    }
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

  const downloadEmployeeTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      {
        "Employee ID": "ODC/HR-2026-01",
        "Full Name": "Azeem Khan",
        "Father Name": "Abdul Kareem",
        Gender: "Male",
        "Appointment Date": "2026-06-01",
        "Contact Number": "03354587898",
        "Contract Period": "1 Year",
        "CNIC Number": "4210112345671",
        Address: "Khipro, Sindh",
        Designation: "Director",
        "Highest Qualification": "Master",
        "Degree Title": "MBA",
        "Major Subject": "Business Management",
        Experience: "10+",
        "Other Skills": "MS Office, Management",
        "Monthly Salary": "85000",
        "Assigned Courses": "",
      },
      {
        "Employee ID": "ODC/HR-2026-02",
        "Full Name": "Asad Ali",
        "Father Name": "Nazeer Ahmed",
        Gender: "Male",
        "Appointment Date": "2026-06-02",
        "Contact Number": "03331238691",
        "Contract Period": "6 Months",
        "CNIC Number": "4210112345672",
        Address: "Sanghar, Sindh",
        Designation: "Trainer",
        "Highest Qualification": "Master",
        "Degree Title": "MSc",
        "Major Subject": "Computer Science",
        Experience: "3",
        "Other Skills": "CIT, DIT, Web Development",
        "Monthly Salary": "50000",
        "Assigned Courses": "English Language",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(
      workbook,
      `employees-import-template-${dayjs().format("YYYY-MM-DD")}.xlsx`,
    );
  };

  const downloadEmployeesWorkbook = () => {
    setExportingEmployees(true);
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(
        teachers.map((teacher) => ({
          "Employee ID": teacher.teacherId || "",
          "Full Name": teacher.fullName || "",
          "Father Name": teacher.fatherName || "",
          Gender: teacher.gender || "",
          "Appointment Date": teacher.appointmentDate
            ? dayjs(teacher.appointmentDate).format("YYYY-MM-DD")
            : "",
          "Contact Number": teacher.contactNo || "",
          "Contract Period": teacher.contractPeriod || "",
          "CNIC Number": teacher.cnicNo || "",
          Address: teacher.address || "",
          Designation: teacher.designation || "",
          "Highest Qualification": teacher.highestQualification || "",
          "Degree Title": teacher.degreeTitle || "",
          "Major Subject": teacher.majorSubject || "",
          Experience: teacher.teachingExperience || "",
          "Other Skills": Array.isArray(teacher.computerSkills)
            ? teacher.computerSkills.join(", ")
            : "",
          "Monthly Salary": teacher.monthlySalary || "",
          "Assigned Courses": Array.isArray(teacher.courseId)
            ? teacher.courseId
                .map((course) => course?.courseName || course?.courseId || "")
                .filter(Boolean)
                .join(", ")
            : "",
        })),
      );

      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
      XLSX.writeFile(
        workbook,
        `employees-export-${dayjs().format("YYYY-MM-DD")}.xlsx`,
      );
    } catch (error) {
      message.error("Failed to export employees workbook");
    } finally {
      setExportingEmployees(false);
    }
  };

  const handleEmployeeImport = async (file) => {
    if (!permissions.import) {
      message.warning("You do not have permission to import employees.");
      return Upload.LIST_IGNORE;
    }

    setImportingEmployees(true);
    try {
      const response = await bulkImportTeachers(file);
      if (response.success) {
        setImportResult(response.data);
        message.success(
          `Import completed: ${response.data.imported} new, ${response.data.updated} updated`,
        );
        await fetchTeachers();
      } else {
        message.error(response.message || "Import failed");
      }
    } catch (error) {
      message.error(error.message || "Failed to import employees");
    } finally {
      setImportingEmployees(false);
    }

    return false;
  };

  const openEditModal = (teacher) => {
    if (!permissions.update) {
      message.warning("You do not have permission to edit employees.");
      return;
    }
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
    if (!permissions.create) {
      message.warning("You do not have permission to create employees.");
      return;
    }
    setEditMode(false);
    setEditingTeacher(null);
    form.resetFields();
    setOpenModal(true);
  };

  const openIdCardModal = (teacher) => {
    if (!permissions.print) {
      message.warning("You do not have permission to print employee cards.");
      return;
    }
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

  const formatExperience = (value) => {
    if (!value) return "N/A";
    if (value === "Fresh") return "Fresh";
    if (value === "1") return "1 Year";
    return `${value} Years`;
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return true;

    const searchableText = [
      teacher.fullName,
      teacher.teacherId,
      teacher.designation,
      teacher.contactNo,
      teacher.highestQualification,
      teacher.degreeTitle,
      teacher.majorSubject,
      teacher.teachingExperience,
      teacher.gender,
      teacher.email,
      teacher.address,
      ...(teacher.computerSkills || []),
      ...(teacher.courseId || []).map((course) => course?.courseName),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(keyword);
  });

  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * TEACHERS_PER_PAGE,
    currentPage * TEACHERS_PER_PAGE,
  );

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
        mask={{ closable: true }}
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

      <Modal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        centered
        width={620}
        title={
          <div className="flex items-center gap-2 text-[#166534]">
            <FaFileExcel />
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Import Employees Workbook
            </span>
          </div>
        }
      >
        <div
          style={{
            border: "2px dashed #16A34A",
            borderRadius: "18px",
            padding: "28px 22px",
            background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
            textAlign: "center",
          }}
        >
          <div className="flex justify-center mb-4 text-[#15803D] text-[54px]">
            <FaFileExcel />
          </div>
          <div style={{ fontSize: "15px", color: "#166534", fontWeight: 600 }}>
            Upload employee Excel/CSV file or download a ready-made template
          </div>
          <div style={{ fontSize: "13px", color: "#15803D", marginTop: "8px" }}>
            Supported formats: `.xlsx`, `.xls`, `.csv`
          </div>

          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <Upload
              accept=".xlsx,.xls,.csv"
              beforeUpload={handleEmployeeImport}
              showUploadList={false}
            >
              <Button
                type="primary"
                icon={<FaFileImport />}
                loading={importingEmployees}
                style={{
                  background: "#15803D",
                  borderColor: "#15803D",
                  borderRadius: "10px",
                  height: "40px",
                  paddingInline: "18px",
                  fontWeight: 600,
                }}
              >
                Upload File
              </Button>
            </Upload>
            <Button
              icon={<FaFileDownload />}
              onClick={downloadEmployeeTemplate}
              style={{
                borderColor: "#16A34A",
                color: "#166534",
                borderRadius: "10px",
                height: "40px",
                paddingInline: "18px",
                fontWeight: 600,
              }}
            >
              Download Template
            </Button>
          </div>
        </div>

        <div
          style={{
            marginTop: "18px",
            padding: "16px",
            borderRadius: "14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
            Template Columns
          </div>
          <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.7 }}>
            Employee ID, Full Name, Father Name, Gender, Appointment Date,
            Contact Number, Contract Period, CNIC Number, Address, Designation,
            Highest Qualification, Degree Title, Major Subject, Experience,
            Other Skills, Monthly Salary, Assigned Courses
          </div>
        </div>

        {importResult && (
          <div
            style={{
              marginTop: "18px",
              padding: "16px",
              borderRadius: "14px",
              background: "#FEFCE8",
              border: "1px solid #FACC15",
            }}
          >
            <div style={{ fontWeight: 700, color: "#92400E", marginBottom: "10px" }}>
              Import Summary
            </div>
            <div style={{ color: "#713F12", fontSize: "14px", lineHeight: 1.8 }}>
              <div>{importResult.imported || 0} new employees imported</div>
              <div>{importResult.updated || 0} existing employees updated</div>
              <div>{importResult.errors?.length || 0} errors</div>
            </div>
            {importResult.errors?.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  background: "white",
                  borderRadius: "10px",
                  border: "1px solid #FDE68A",
                  padding: "10px 12px",
                  color: "#B91C1C",
                  fontSize: "13px",
                  lineHeight: 1.7,
                }}
              >
                {importResult.errors.map((error, index) => (
                  <div key={`${error}-${index}`}>{error}</div>
                ))}
              </div>
            )}
          </div>
        )}
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
            <h2 className="module-title">Employees</h2>
            <p className="module-subtitle">
              Manage staff & teacher profiles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {permissions.export && (
            <Button
              onClick={downloadEmployeesWorkbook}
              icon={<FaFileDownload />}
              size="large"
              loading={exportingEmployees}
              style={{
                background: "#EFF6FF",
                borderColor: "#BFDBFE",
                color: "#1D4ED8",
                borderRadius: "12px",
                fontWeight: 600,
              }}
            >
              Download Excel
            </Button>
          )}
          {permissions.import && (
            <Button
              onClick={() => {
                setImportResult(null);
                setImportModalVisible(true);
              }}
              icon={<FaFileImport />}
              size="large"
              style={{
                background: "#F0FDF4",
                borderColor: "#BBF7D0",
                color: "#166534",
                borderRadius: "12px",
                fontWeight: 600,
              }}
            >
              Import Excel
            </Button>
          )}
          {permissions.create && (
            <Button
              onClick={openCreateModal}
              type="primary"
              icon={<FaPlus />}
              size="large"
              className="btn-lg"
            >
              Create Employee
            </Button>
          )}
        </div>
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
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
                  Employee Search
                </div>
                <div className="mt-1 text-[11px] leading-5 text-[#64748b]">
                  Search by name, ID, designation, subject, phone, qualification, or related keywords.
                </div>
              </div>
              <div className="flex w-full flex-col gap-1 md:w-[430px] md:shrink-0">
                <Input.Search
                  allowClear
                  placeholder="Search employees by name, designation, subject, phone..."
                  size="small"
                  value={searchTerm}
                  className="w-full"
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <div className="text-right text-[10px] font-medium text-[#64748b]">
                  {filteredTeachers.length} employee{filteredTeachers.length === 1 ? "" : "s"} found
                </div>
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <Empty
                description="No employees match your search"
                className="mt-10"
              />
            ) : (
              <>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {paginatedTeachers.map((teacher) => {
              return (
                <div
                  key={teacher._id}
                  className="flex h-full min-h-[124px] flex-col rounded-[18px] border border-[#dbe4f0] bg-white p-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_16px_rgba(15,23,42,0.08)]"
                >
                  <div
                    className="mb-2 flex items-start justify-between gap-2 rounded-[14px] border border-[#e6edf7] bg-[#f8fbff] px-2.5 py-2"
                  >
                    <div
                      className="flex min-w-0 flex-1 flex-col"
                      style={{ fontFamily: "'Inter-sans', Arial, sans-serif" }}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
                        Employee
                      </span>
                      <h3 className="mt-1 line-clamp-2 text-[12px] font-bold leading-[1.15] text-[#0f172a]">
                        {teacher.fullName || "Unknown"}
                      </h3>
                      <span className="mt-0.5 text-[9px] font-medium text-[#64748b]">
                        {teacher.teacherId || "No ID"}
                      </span>
                      <div className="mt-1 inline-flex w-fit rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-[#01134C] shadow-sm">
                        {teacher.designation || "Employee"}
                      </div>
                    </div>

                    <div
                      className="flex h-[50px] w-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#01134C] text-[18px] font-bold uppercase text-white shadow-[0_8px_18px_rgba(1,19,76,0.16)]"
                      style={{ fontFamily: "'Inter-sans', Arial, sans-serif" }}
                    >
                      {teacher.profilePicture ? (
                        <img
                          src={teacher.profilePicture}
                          alt={teacher.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(teacher.fullName)
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-[10px] border border-[#e6edf7] bg-white px-2 py-1.5">
                      <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
                        Phone
                      </div>
                      <div className="mt-0.5 truncate text-[10px] font-semibold text-[#0f172a]">
                        {teacher.contactNo || "N/A"}
                      </div>
                    </div>
                    <div className="rounded-[10px] border border-[#e6edf7] bg-white px-2 py-1.5">
                      <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
                        Education
                      </div>
                      <div className="mt-0.5 truncate text-[10px] font-semibold text-[#0f172a]">
                        {teacher.highestQualification || "N/A"}
                      </div>
                    </div>
                    <div className="rounded-[10px] border border-[#e6edf7] bg-white px-2 py-1.5">
                      <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
                        Subject
                      </div>
                      <div className="mt-0.5 truncate text-[10px] font-semibold text-[#0f172a]">
                        {teacher.majorSubject || "N/A"}
                      </div>
                    </div>
                    <div className="rounded-[10px] border border-[#e6edf7] bg-white px-2 py-1.5">
                      <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
                        Experience
                      </div>
                      <div className="mt-0.5 truncate text-[10px] font-semibold text-[#0f172a]">
                        {formatExperience(teacher.teachingExperience)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-[10px] border border-[#e6edf7] bg-[#f8fbff] px-2 py-1.5">
                    {permissions.print && (
                      <Button
                        type="primary"
                        icon={<FaPrint />}
                        onClick={() => openIdCardModal(teacher)}
                        style={{
                          background: "#01134C",
                          borderColor: "#01134C",
                          fontWeight: "600",
                          fontSize: "9px",
                          height: "24px",
                          borderRadius: "8px",
                        }}
                        size="small"
                      >
                        View Details
                      </Button>
                    )}
                    <div className="flex gap-[5px]">
                      {permissions.update && (
                        <Button
                          icon={<FaEdit />}
                          onClick={() => openEditModal(teacher)}
                          size="small"
                          style={{
                            background: "white",
                            borderColor: "#01134C",
                            color: "#01134C",
                            height: "22px",
                            width: "22px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "8px",
                          }}
                        />
                      )}
                      {permissions.delete && (
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
                            style={{ width: "22px", height: "22px", borderRadius: "8px" }}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {filteredTeachers.length > TEACHERS_PER_PAGE && (
              <div className="flex justify-end">
                <Pagination
                  current={currentPage}
                  pageSize={TEACHERS_PER_PAGE}
                  total={filteredTeachers.length}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                />
              </div>
            )}
              </>
            )}
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
        styles={{ body: { padding: "0" } }}
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
