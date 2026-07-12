import {
  Button,
  Modal,
  message,
  Form,
  Tooltip,
  Popconfirm,
  Empty,
  Tabs,
  Pagination,
  Input,
  Upload,
  Card,
  Tag,
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
  FaFileDownload,
  FaFileImport,
  FaFileExcel,
} from "react-icons/fa";
import { UserOutlined } from "@ant-design/icons";
import { MdMenuBook } from "react-icons/md";
import CourseForm from "../../components/forms/CourseForm";
import BatchManagement from "../../components/forms/BatchManagement";
import {
  createCourse as createCourseAPI,
  getCourses,
  getAllEnrollments,
  updateCourse,
  deleteCourse,
  bulkImportCoursesWorkbook,
} from "../../services/feeService";
import { getAllBatches, getBatchesByCourse } from "../../services/batchService";
import { EditIcon, GraduationCap } from "lucide-react";
import { useModulePermissions } from "../../hooks/usePermissions";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

const COURSES_PER_PAGE = 10;
const ACTIVE_ENROLLMENT_STATUS_SET = new Set(["active", "enrolled"]);

const normalizeEnrollmentStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

const mergeCoursesWithLiveEnrollmentStats = (courses, enrollments) => {
  const courseEnrollmentCounts = new Map();

  (Array.isArray(enrollments) ? enrollments : []).forEach((enrollment) => {
    const status = normalizeEnrollmentStatus(enrollment?.status);
    if (!ACTIVE_ENROLLMENT_STATUS_SET.has(status)) {
      return;
    }

    const courseId = enrollment?.course?._id || enrollment?.course;
    if (!courseId) {
      return;
    }

    const key = String(courseId);
    courseEnrollmentCounts.set(key, (courseEnrollmentCounts.get(key) || 0) + 1);
  });

  return (Array.isArray(courses) ? courses : []).map((course) => ({
    ...course,
    enrolledStudentsCount: courseEnrollmentCounts.get(String(course._id)) || 0,
  }));
};

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
  const [activeTab, setActiveTab] = useState("courses");
  const [selectedBatchCourseId, setSelectedBatchCourseId] = useState(null);
  const [courseSearchTerm, setCourseSearchTerm] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importingWorkbook, setImportingWorkbook] = useState(false);
  const [exportingWorkbook, setExportingWorkbook] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setFetchingCourses(true);
    try {
      const [coursesResponse, enrollmentsResponse] = await Promise.all([
        getCourses(),
        getAllEnrollments({ limit: 10000 }),
      ]);

      if (coursesResponse.success) {
        const liveCourses = mergeCoursesWithLiveEnrollmentStats(
          coursesResponse.data,
          enrollmentsResponse?.success ? enrollmentsResponse.data : [],
        );
        setCourses(liveCourses);
        setCoursePage(1);
      }
    } catch (error) {
      message.error("Failed to fetch courses");
    } finally {
      setFetchingCourses(false);
    }
  };

  const downloadCoursesWorkbookTemplate = () => {
    const workbook = XLSX.utils.book_new();

    const coursesSheet = XLSX.utils.json_to_sheet([
      {
        "Course ID": "IT-006",
        "Course Name": "Graphic Designing",
        "Course Category": "IT & Vocational",
        Duration: 4,
        "Admission Fee": 2000,
        "Course Fee": 22000,
        "Certificate Fee": 3000,
        "Exam Fee": 0,
        "Registration Fee": 0,
        "Practical Fee": 0,
        "Other Fee": 0,
        "Include Exam Fee In Installments": "No",
        "Include Registration Fee In Installments": "No",
        "Include Practical Fee In Installments": "No",
        "Include Other Fee In Installments": "No",
        "Teacher IDs": "",
      },
    ]);

    const batchesSheet = XLSX.utils.json_to_sheet([
      {
        "Batch Code": "GD-M-01",
        "Batch Name": "Graphic Design Morning Batch",
        "Course ID": "IT-006",
        Shift: "Morning",
        Days: "Monday to Saturday",
        "Hours Per Day": 2,
        "Start Date": "2026-06-10",
        "End Date": "2026-10-10",
        "Max Students": 30,
        Status: "Active",
        Description: "Morning regular batch",
        "Is Active": "Yes",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, coursesSheet, "Courses");
    XLSX.utils.book_append_sheet(workbook, batchesSheet, "Batches");
    XLSX.writeFile(
      workbook,
      `courses-batches-template-${dayjs().format("YYYY-MM-DD")}.xlsx`,
    );
  };

  const downloadCoursesWorkbook = async () => {
    setExportingWorkbook(true);
    try {
      const batchesResponse = await getAllBatches();
      const allBatches = batchesResponse?.success ? batchesResponse.data || [] : [];
      const workbook = XLSX.utils.book_new();

      const coursesSheet = XLSX.utils.json_to_sheet(
        courses.map((course) => ({
          "Course ID": course.courseId || "",
          "Course Name": course.courseName || "",
          "Course Category": course.courseCategory || "",
          Duration: course.duration || "",
          "Admission Fee": course.admissionFee || 0,
          "Course Fee": course.courseFee || 0,
          "Certificate Fee": course.certificateFee || 0,
          "Exam Fee": course.examFee || 0,
          "Registration Fee": course.registrationFee || 0,
          "Practical Fee": course.practicalFee || 0,
          "Other Fee": course.otherFee || 0,
          "Include Exam Fee In Installments": course.includeExamFeeInInstallments
            ? "Yes"
            : "No",
          "Include Registration Fee In Installments":
            course.includeRegistrationFeeInInstallments ? "Yes" : "No",
          "Include Practical Fee In Installments":
            course.includePracticalFeeInInstallments ? "Yes" : "No",
          "Include Other Fee In Installments":
            course.includeOtherFeeInInstallments ? "Yes" : "No",
          "Teacher IDs": Array.isArray(course.teacherId)
            ? course.teacherId
                .map((teacher) => teacher?.teacherId || teacher?.fullName || "")
                .filter(Boolean)
                .join(", ")
            : "",
        })),
      );

      const batchesSheet = XLSX.utils.json_to_sheet(
        allBatches.map((batch) => ({
          "Batch Code": batch.batchCode || "",
          "Batch Name": batch.batchName || "",
          "Course ID": batch.course?.courseId || "",
          Shift: batch.shift || "",
          Days: batch.days || "",
          "Hours Per Day": batch.hoursPerDay || "",
          "Start Date": batch.startDate
            ? dayjs(batch.startDate).format("YYYY-MM-DD")
            : "",
          "End Date": batch.endDate ? dayjs(batch.endDate).format("YYYY-MM-DD") : "",
          "Max Students": batch.maxStudents || 30,
          Status: batch.status || "Active",
          Description: batch.description || "",
          "Is Active": batch.isActive === false ? "No" : "Yes",
        })),
      );

      XLSX.utils.book_append_sheet(workbook, coursesSheet, "Courses");
      XLSX.utils.book_append_sheet(workbook, batchesSheet, "Batches");
      XLSX.writeFile(
        workbook,
        `courses-batches-export-${dayjs().format("YYYY-MM-DD")}.xlsx`,
      );
    } catch (error) {
      message.error("Failed to export courses workbook");
    } finally {
      setExportingWorkbook(false);
    }
  };

  const handleCoursesWorkbookImport = async (file) => {
    if (!permissions.import) {
      message.warning("You do not have permission to import courses.");
      return Upload.LIST_IGNORE;
    }

    setImportingWorkbook(true);
    try {
      const response = await bulkImportCoursesWorkbook(file);
      if (response.success) {
        setImportResult(response.data);
        message.success(
          `Import completed: ${response.data.coursesImported} courses, ${response.data.batchesImported} batches added`,
        );
        await fetchCourses();
      } else {
        message.error(response.message || "Import failed");
      }
    } catch (error) {
      message.error(error.message || "Failed to import course workbook");
    } finally {
      setImportingWorkbook(false);
    }

    return false;
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

  const openBatchWorkspace = (course) => {
    if (!permissions.update) {
      message.warning("You do not have permission to manage course batches.");
      return;
    }
    setSelectedBatchCourseId(course._id);
    setActiveTab("batches");
  };

  const openEditModal = async (course) => {
    if (!permissions.update) {
      message.warning("You do not have permission to edit courses.");
      return;
    }
    setLoading(true);
    setEditMode(true);
    setEditingCourse(course);
    try {
      const batchResponse = await getBatchesByCourse(course._id);
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
        batchIds: batchResponse?.success
          ? (batchResponse.data || []).map((batch) => batch._id)
          : [],
      });
      setOpenModal(true);
    } catch (error) {
      message.error("Failed to load linked batches for this course");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    if (!permissions.create) {
      message.warning("You do not have permission to create courses.");
      return;
    }
    setEditMode(false);
    setEditingCourse(null);
    form.resetFields();
    form.setFieldsValue({ batchIds: [] });
    setOpenModal(true);
  };

  const courseSummary = React.useMemo(() => {
    const totalCourses = courses.length;
    const totalTeachers = courses.reduce(
      (sum, course) => sum + Number(course.teacherId?.length || 0),
      0,
    );
    const assignedCourses = courses.filter(
      (course) => Number(course.enrolledStudentsCount || 0) > 0,
    ).length;
    const linkedBatches = courses.reduce(
      (sum, course) => sum + Number(course.linkedBatchesCount || 0),
      0,
    );
    const enrolledStudents = courses.reduce(
      (sum, course) => sum + Number(course.enrolledStudentsCount || 0),
      0,
    );
    const shortCourses = courses.filter((course) => Number(course.duration || 0) <= 6).length;
    const longCourses = courses.filter((course) => Number(course.duration || 0) > 6).length;
    const morningCourses = courses.filter((course) =>
      (course.linkedBatchesCountByShift?.Morning || 0) > 0,
    ).length;
    const eveningCourses = courses.filter((course) =>
      (course.linkedBatchesCountByShift?.Evening || 0) > 0,
    ).length;

    return {
      totalCourses,
      totalTeachers,
      assignedCourses,
      linkedBatches,
      enrolledStudents,
      morningCourses,
      eveningCourses,
      shortCourses,
      longCourses,
    };
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    const keyword = courseSearchTerm.trim().toLowerCase();
    if (!keyword) {
      return courses;
    }

    return courses.filter((course) => {
      const searchableText = [
        course.courseName,
        course.courseId,
        course.courseCategory,
        course.duration,
        course.totalFee,
        ...(course.teacherId || []).map((teacher) => teacher?.fullName),
        ...(course.teacherId || []).map((teacher) => teacher?.teacherId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [courseSearchTerm, courses]);

  const paginatedCourses = React.useMemo(
    () =>
      filteredCourses.slice(
        (coursePage - 1) * COURSES_PER_PAGE,
        coursePage * COURSES_PER_PAGE,
      ),
    [filteredCourses, coursePage],
  );

  const renderCoursesGrid = () => {
    if (fetchingCourses) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoaderSpnar />
        </div>
      );
    }

    if (courses.length === 0) {
      return (
        <Empty
          description="No courses found. Create your first course!"
          className="mt-20"
        />
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Total Courses
            </div>
            <div className="mt-1 text-[21px] font-bold leading-none text-primary">
              {courseSummary.totalCourses}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              All courses in this module
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Assigned Courses
            </div>
            <div className="mt-1 text-[21px] font-bold leading-none text-primary">
              {courseSummary.assignedCourses}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Courses linked with students
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Teacher Links
            </div>
            <div className="mt-1 text-[21px] font-bold leading-none text-primary">
              {courseSummary.totalTeachers}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {courseSummary.enrolledStudents} enrolled students across {courseSummary.linkedBatches} batches
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Course Timing
            </div>
            <div className="mt-1 text-[16px] font-bold leading-none text-primary">
              {courseSummary.morningCourses} morning / {courseSummary.eveningCourses} evening
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Courses with linked morning and evening batches
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Duration Split
            </div>
            <div className="mt-1 text-[16px] font-bold leading-none text-primary">
              {courseSummary.shortCourses} short / {courseSummary.longCourses} long
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              6 months or less vs above 6 months
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8ea2c4]">
              Course Search
            </div>
            <div className="mt-1 text-[11px] leading-5 text-[#64748b]">
              Search by course name, course ID, teacher, duration, category, fee, or related keywords.
            </div>
          </div>
          <div className="flex w-full flex-col gap-1 md:w-[430px] md:shrink-0">
            <Input.Search
              allowClear
              placeholder="Search courses by name, ID, teacher, duration..."
              size="small"
              value={courseSearchTerm}
              className="w-full"
              onChange={(e) => {
                setCourseSearchTerm(e.target.value);
                setCoursePage(1);
              }}
            />
            <div className="text-right text-[10px] font-medium text-[#64748b]">
              {filteredCourses.length} course{filteredCourses.length === 1 ? "" : "s"} found
            </div>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <Empty
            description="No courses match your search"
            className="mt-10"
          />
        ) : (
          <>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {paginatedCourses.map((course) => (
          <div
            key={course._id}
            className="relative rounded-[18px] border border-[#dbe4f0] bg-white px-2.5 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_16px_rgba(15,23,42,0.08)]"
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "122px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "6px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                    marginBottom: "3px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: "700",
                        color: "#8ea2c4",
                        margin: "0 0 4px 0",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        fontFamily: "'Inter-sans', Arial, sans-serif",
                      }}
                    >
                      Course
                    </div>
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#0f172a",
                        margin: "0",
                        lineHeight: "1.2",
                        fontFamily: "'Inter-sans', Arial, sans-serif",
                      }}
                    >
                      {course.courseName}
                    </h3>
                  </div>

                  <div
                    style={{
                      minWidth: "72px",
                      padding: "4px 6px",
                      borderRadius: "10px",
                      background: "#f8fbff",
                      border: "1px solid #dbe4f0",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "6px",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "8px",
                          color: "#8ea2c4",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          lineHeight: "1.1",
                        }}
                      >
                        Students
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#01134C",
                          fontWeight: "800",
                          lineHeight: "1.1",
                          marginTop: "2px",
                        }}
                      >
                        {Number(course.enrolledStudentsCount || 0)}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#eef4ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#01134C",
                        flexShrink: 0,
                      }}
                    >
                      <GraduationCap size={14} />
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    fontWeight: "600",
                  }}
                >
                  {course.courseId}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div
                style={{
                  background: "#f8fbff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "6px 8px",
                }}
              >
                <div
                  style={{
                    fontSize: "8px",
                    color: "#8ea2c4",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  Duration
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#0f172a",
                    fontWeight: "700",
                  }}
                >
                  {course.duration === 1 ? "1 Year" : `${course.duration} Months`}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fbff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "6px 8px",
                }}
              >
                <div
                  style={{
                    fontSize: "8px",
                    color: "#8ea2c4",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  Teacher
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#0f172a",
                    fontWeight: "700",
                    lineHeight: "1.3",
                  }}
                >
                  {course.teacherId?.length
                    ? `${course.teacherId[0]?.fullName || "Assigned"}${course.teacherId.length > 1 ? ` +${course.teacherId.length - 1}` : ""}`
                    : "Not assigned"}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#f8fbff",
                padding: "6px 8px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                marginTop: "5px",
                marginBottom: "5px",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#8ea2c4",
                  marginBottom: "2px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                Total Course Fee
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#01134C",
                  fontFamily: "'Inter-sans', Arial, sans-serif",
                }}
              >
                {course.totalFee?.toLocaleString()} PKR
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "5px",
                marginTop: "auto",
              }}
            >
              <div style={{ display: "flex", gap: "5px" }}>
                {permissions.update && (
                  <Tooltip title="Open linked batches">
                    <div
                      onClick={() => openBatchWorkspace(course)}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "8px",
                        background: "#eef4ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#3B82F6",
                        fontSize: "10px",
                        transition: "all 0.2s ease",
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
                      width: "22px",
                      height: "22px",
                        borderRadius: "8px",
                        background: "#eef4ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#667eea",
                      fontSize: "10px",
                      transition: "all 0.2s ease",
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
                        width: "22px",
                        height: "22px",
                        borderRadius: "8px",
                        background: "#fff1f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#EF4444",
                        fontSize: "10px",
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
        ))}
      </div>
      {filteredCourses.length > COURSES_PER_PAGE && (
        <div className="flex justify-end">
          <Pagination
            current={coursePage}
            pageSize={COURSES_PER_PAGE}
            total={filteredCourses.length}
            onChange={setCoursePage}
            showSizeChanger={false}
          />
        </div>
      )}
      </>
      )}
      </div>
    );
  };

  return (
    <>
      <Modal
        className="courses-module"
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
        mask={{ closable: true }}
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
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
            submitLabel={editMode ? "Update Course" : "Create Course"}
          />
        </div>
      </Modal>

      <Modal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        centered
        width={640}
        title={
          <div className="flex items-center gap-2 text-[#166534]">
            <FaFileExcel />
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Import Courses & Batches Workbook
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
            Upload one workbook with both Courses and Batches tabs
          </div>
          <div style={{ fontSize: "13px", color: "#15803D", marginTop: "8px" }}>
            Supported formats: `.xlsx`, `.xls`, `.csv`
          </div>

          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <Upload
              accept=".xlsx,.xls,.csv"
              beforeUpload={handleCoursesWorkbookImport}
              showUploadList={false}
            >
              <Button
                type="primary"
                icon={<FaFileImport />}
                loading={importingWorkbook}
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
              onClick={downloadCoursesWorkbookTemplate}
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
            Workbook Tabs
          </div>
          <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.7 }}>
            <div><strong>Courses</strong>: create or update course records.</div>
            <div><strong>Batches</strong>: create or update batches linked with courses.</div>
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
              <div>{importResult.coursesImported || 0} new courses imported</div>
              <div>{importResult.coursesUpdated || 0} existing courses updated</div>
              <div>{importResult.batchesImported || 0} new batches imported</div>
              <div>{importResult.batchesUpdated || 0} existing batches updated</div>
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

      <div className="courses-module flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdMenuBook size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="module-title">Courses</h2>
            <p className="module-subtitle">
              Create courses, create batches, and link batches with courses from one module
            </p>
          </div>
        </div>
        {activeTab === "courses" && (
          <div className="flex items-center gap-2">
            {permissions.export && (
              <Button
                onClick={downloadCoursesWorkbook}
                icon={<FaFileDownload />}
                size="large"
                loading={exportingWorkbook}
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
                Create New Course
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="courses-module p-2 pb-[30px] theme-font">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "courses",
              label: <span style={{ fontFamily: "'Inter-sans', Arial, sans-serif" }}>Course Management</span>,
              children: renderCoursesGrid(),
            },
            {
              key: "batches",
              label: <span style={{ fontFamily: "'Inter-sans', Arial, sans-serif" }}>Batch Management</span>,
              children: (
                <BatchManagement
                  courseId={selectedBatchCourseId}
                  courses={courses}
                  onCourseChange={setSelectedBatchCourseId}
                />
              ),
            },
          ]}
        />
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

    </>
  );
};

export default Courses;
