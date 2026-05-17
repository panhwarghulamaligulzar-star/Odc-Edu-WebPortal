import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Upload,
  message,
  Popconfirm,
  Checkbox,
} from "antd";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaUpload,
  FaSearch,
  FaDownload,
} from "react-icons/fa";
import { IoCloseCircleOutline } from "react-icons/io5";
import { MdSchool } from "react-icons/md";

import * as XLSX from "xlsx";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import ViewCertification from "../../components/modalBox/ViewCertification";
import UpdateCertification from "../../components/forms/UpdateCertification";
import { useLocation } from "react-router-dom";
import {
  deleteCertification,
  getCertification,
  bulkUploadCertifications,
} from "../../services/certificationService";
import useZustandStore from "../../stores/zustandStore";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import { ScaleLoader } from "react-spinners";

dayjs.extend(utc);

const Certification = () => {
  const location = useLocation();
  const { getCertifications } = useZustandStore();
  const [certifications, setCertifications] = useState([]);
  const pathname = location.pathname;
  const title = pathname.split("/").filter(Boolean).pop();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState(false);
  const [staticsData, setStaticsData] = useState();
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);

  // const bannerColumns = [
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>Registration No</span>,
  //     dataIndex: "studentId",
  //     key: "studentId",
  //     width: 150,
  //     render: (text) => <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">{text}</span>,
  //   },
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>Name</span>,
  //     dataIndex: "studentName",
  //     key: "name",
  //     width: 150,
  //     render: (text) => <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">{text}</span>,
  //   },
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>Father's Name</span>,
  //     dataIndex: "fatherName",
  //     key: "fatherName",
  //     width: 150,
  //     render: (text) => <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">{text}</span>,
  //   },
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>Course</span>,
  //     dataIndex: "course",
  //     key: "course",
  //     width: 150,
  //     render: (text) => <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">{text}</span>,
  //   },
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>Duration</span>,
  //     dataIndex: "duration",
  //     key: "duration",
  //     render: (text) => <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">{text}</span>,
  //   },
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>Start Date</span>,
  //     dataIndex: "startingDate",
  //     key: "startingDate",
  //     width: 150,
  //     render: (date) => (
  //       <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">
  //         {date ? dayjs.utc(date).format("DD-MM-YYYY") : ''}
  //       </span>
  //     )
  //   },
  //   {
  //     title: <span className='text-[12px] text-gray-700 font-ArialLight text-nowrap'>End Date</span>,
  //     dataIndex: "endingDate",
  //     key: "endingDate",
  //     width: 150,
  //     render: (date) => (
  //       <span className="text-[12px] text-gray-700 font-ArialLight text-nowrap">
  //         {date ? dayjs.utc(date).format("DD-MM-YYYY") : ''}
  //       </span>
  //     )
  //   },
  // ];
  const [selectedDeletedRecords, setSelectedDeletedRecords] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [form] = Form.useForm();

  // Filter certifications based on search text
  const filteredCertifications = useMemo(() => {
    if (!searchText.trim()) {
      return certifications;
    }

    const searchLower = searchText.toLowerCase();

    return certifications.filter((cert) => {
      const studentName = cert.studentName?.toLowerCase() || "";
      const fatherName = cert.fatherName?.toLowerCase() || "";
      const course = cert.course?.toLowerCase() || "";

      return (
        studentName.includes(searchLower) ||
        fatherName.includes(searchLower) ||
        course.includes(searchLower)
      );
    });
  }, [certifications, searchText]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setTablePage(1);
  }, [searchText]);

  // const [deleteRecord,setDeleteRecord]

  const handleDeleteMultepalRecords = (recordId) => {
    setSelectedDeletedRecords((prev) => {
      if (prev.includes(recordId)) {
        return prev.filter((id) => id !== recordId);
      } else {
        return [...prev, recordId];
      }
    });
  };

  const columns = [
    // {
    //   title: <span className='text-[14px] text-gray-700 font-ArialLight text-nowrap'>Image</span>,
    //   dataIndex: "imageUrl",
    //   key: "imageUrl",
    //   width: 100,
    //   render: (image) => (
    //     <img
    //       src={image}
    //       alt="profile"
    //       className="w-12 h-12 object-cover rounded-md border"
    //     />
    //   ),
    // },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Registration No
        </span>
      ),
      dataIndex: "registrationNo",
      key: "registrationNo",
      width: 200,
      render: (text) => (
        <span className=" text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          courseId
        </span>
      ),
      dataIndex: "courseId",
      key: "courseId",
      width: 200,
      render: (text) => (
        <span className=" text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          certificateNo
        </span>
      ),
      dataIndex: "certificateNo",
      key: "certificateNo",
      width: 200,
      render: (text) => (
        <span className=" text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Name
        </span>
      ),
      dataIndex: "studentName",
      key: "name",
      width: 200,
      render: (text) => (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Father's_Name
        </span>
      ),
      dataIndex: "fatherName",
      key: "fatherName",
      width: 200,
      render: (text) => (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Course
        </span>
      ),
      dataIndex: "course",
      key: "course",
      width: 200,
      render: (text) => (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Duration
        </span>
      ),
      dataIndex: "duration",
      key: "duration",
      render: (text) => (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Start Date
        </span>
      ),
      dataIndex: "startingDate",
      key: "startingDate",
      width: 200,
      render: (date) => (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {dayjs.utc(date).format("DD-MM-YYYY")}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          End Date
        </span>
      ),
      dataIndex: "endingDate",
      key: "endingDate",
      width: 200,
      render: (date) => (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          {dayjs.utc(date).format("DD-MM-YYYY")}
        </span>
      ),
    },
    {
      title: (
        <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
          Actions
        </span>
      ),
      key: "actions",
      width: 200,
      render: (_, record) => (
        <div
          className={`flex items-center gap-2 ${title === "certification" ? "flex-no-wrap" : "flex-wrap"} `}
        >
          <Button
            type="primary"
            icon={<FaEye />}
            size="small"
            onClick={() => handleView(record)}
            className="btn-md hover !bg-blue-900 hover:!text-white"
          >
            View
          </Button>
          <Button
            icon={<FaEdit />}
            size="small"
            onClick={() => handleEdit(record)}
            className="btn-md !bg-secondary !text-primary hover !border !border-transparent"
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure to delete this record?"
            okText={deleteLoading ? "Deleting..." : "Yes"}
            cancelText="No"
            okButtonProps={{ loading: deleteLoading }}
            onConfirm={() => handleDelete(record?._id)}
          >
            <Button
              danger
              icon={<FaTrash />}
              size="small"
              className="flex items-center gap-1"
              disabled={deleteLoading}
            >
              Delete
            </Button>
          </Popconfirm>
          <Checkbox
            className="custom-checkbox"
            checked={selectedDeletedRecords.includes(record?._id)}
            onChange={() => handleDeleteMultepalRecords(record?._id)}
          />
        </div>
      ),
    },
  ];

  const handleView = (record) => {
    setSelectedRecord(record);
    setModalType("view");
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setModalType("edit");
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      const resp = await deleteCertification(id);
      message.success(resp?.message);
      getAllCertificationsData();
    } catch (error) {
      console.error("Error deleting admin:", error);
      message.error(
        error?.response?.data?.message ||
          "Failed to delete admin. Please try again.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDeletedRecords.length === 0) return;
    setBulkDeleteLoading(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      // Delete records sequentially
      for (const id of selectedDeletedRecords) {
        try {
          await deleteCertification(id);
          successCount++;
        } catch (error) {
          console.error(`Error deleting record ${id}:`, error);
          errorCount++;
        }
      }
      // Show results
      if (successCount > 0) {
        message.success(
          `Successfully deleted ${successCount} record${successCount !== 1 ? "s" : ""}`,
        );
      }
      if (errorCount > 0) {
        message.error(
          `Failed to delete ${errorCount} record${errorCount !== 1 ? "s" : ""}`,
        );
      }
      // Clear selections and refresh data
      setSelectedDeletedRecords([]);
      getAllCertificationsData();
    } catch (error) {
      console.error("Bulk delete error:", error);
      message.error("An error occurred during bulk delete");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleCreate = () => {
    setModalType("create");
    setSelectedRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setSelectedRecord(null);
  };

  // Replace your handleExcelUpload function with this corrected version:

  const handleExcelUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setUploadLoading(true);
        const binaryStr = e.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        // console.log("jsonData", jsonData)
        if (jsonData.length === 0) {
          message.error("Excel sheet is empty!");
          setUploadLoading(false);
          return false;
        }
        // Updated convertDate function to handle both DD-MM-YYYY and DD/MM/YYYY formats
        const convertDate = (dateString) => {
          if (!dateString) return null;

          let parts;
          if (dateString.includes("/")) {
            parts = dateString.split("/");
          } else if (dateString.includes("-")) {
            parts = dateString.split("-");
          } else {
            return null;
          }

          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];

          // Convert to YYYY-MM-DD for Mongo
          const isoString = `${year}-${month}-${day}T00:00:00.000Z`;

          return new Date(isoString);
        };

        const formattedData = jsonData.map((row) => ({
          registrationNo: String(
            row.registrationNo || row["Registration No"] || "",
          ),
          courseId: row.courseId || row["Course ID"] || row.CourseId || "",
          certificateNo: String(
            row.certificateNo ||
              row.CertificateNo ||
              row["Certificate No"] ||
              "",
          ),
          studentName: row.studentName || row.Name || row["Student Name"] || "",
          fatherName:
            row.fatherName || row.FatherName || row["Father Name"] || "",
          course: row.course || row.Course || "",
          duration: row.duration || row.Duration || "",
          startingDate: convertDate(
            row.startingDate || row.StartingDate || row["Starting Date"],
          ),
          endingDate: convertDate(
            row.endingDate || row.EndingDate || row["Ending Date"],
          ),
          issueDate: convertDate(
            row.issueDate || row.IssueDate || row["Issue Date"],
          ),
          grade: row.grade
            ? typeof row.grade === "number"
              ? `${Math.round(row.grade * 100)}%`
              : String(row.grade)
            : "",
          skills: row.skills || row.Skills || "",
        }));

        console.log("formattedData", formattedData);
        // Upload to backend
        let resp = await bulkUploadCertifications(formattedData);
        if (resp?.success == true) {
          setUploadLoading(false);
          message.success(resp?.message);
          setUploadStats(true);
          setStaticsData(resp);
          getAllCertificationsData();
        }
      } catch (error) {
        console.error("Error reading Excel file:", error);
        message.error("Failed to read Excel file. Please check the format.");
        setUploadLoading(false);
      }
    };

    reader.readAsBinaryString(file);
    return false; // Prevent auto upload
  };

  // const handleDownloadExcel = () => {
  //   const dataToExport = filteredCertifications.map(cert => (console.log("cert", cert),{
  //     Student_ID: cert.studentId,
  //     certificateNo: cert.certificateNo,
  //     Name: cert.studentName,
  //     Father_Name: cert.fatherName,
  //     Course: cert.course,
  //     Duration: cert.duration,
  //     Start_Date: dayjs(cert.startingDate).format("DD-MM-YYYY"),
  //     End_Date: dayjs(cert.endingDate).format("DD-MM-YYYY"),
  //     issueDate: cert.issueDate
  //   }));

  //   const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Certifications");
  //   XLSX.writeFile(workbook, "certifications.xlsx");
  // };

  const handleDownloadExcel = () => {
    const dataToExport = certifications.map((cert) => ({
      courseId: cert.courseId,
      registrationNo: cert.registrationNo,
      certificateNo: cert.certificateNo,
      studentName: cert.studentName,
      fatherName: cert.fatherName,
      course: cert.course,
      duration: cert.duration,
      startingDate: dayjs(cert.startingDate).format("DD-MM-YYYY"),
      endingDate: dayjs(cert.endingDate).format("DD-MM-YYYY"),
      issueDate: dayjs(cert.issueDate).format("DD-MM-YYYY"),
      grade: cert.grade,
      skills: cert.skills,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Certifications");
    XLSX.writeFile(workbook, "certifications.xlsx");
  };

  // Fetch all certifications
  const getAllCertificationsData = () => {
    setIsLoading(true);
    getCertification()
      .then((data) => {
        const sortedData = data.data.sort((a, b) => {
          return Number(a.certificateNo) - Number(b.certificateNo);
        });
        setCertifications(sortedData);
        getCertifications(sortedData.length);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        message.error("Failed to fetch certifications");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    getAllCertificationsData();
  }, []);

  return (
    <div className="w-full">
      {title === "certification" && (
        <>
          {/* ── Page Header ───────────────────────────────── */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "#01134C" }}
              >
                <MdSchool size={22} style={{ color: "#E8FC0A" }} />
              </div>
              <div>
                <h2
                  className="text-xl font-bold m-0"
                  style={{ color: "#01134C" }}
                >
                  Certifications
                </h2>
                <p className="text-sm m-0" style={{ color: "#6b7280" }}>
                  Manage student certifications &amp; records
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Upload
                beforeUpload={handleExcelUpload}
                accept=".xlsx,.xls"
                showUploadList={false}
                disabled={uploadLoading}
              >
                <Button
                  type="default"
                  icon={<FaUpload />}
                  loading={uploadLoading}
                  className="btn-lg !w-[170px] hover:!bg-green-600 hover:!text-white"
                >
                  {uploadLoading ? "Uploading..." : "Upload Excel"}
                </Button>
              </Upload>
              <Button
                type="default"
                icon={<FaDownload />}
                onClick={handleDownloadExcel}
                className="btn-lg !w-[170px] hover:!bg-blue-900 hover:!text-white"
              >
                Download Excel
              </Button>
              <Button
                type="default"
                icon={<FaPlus />}
                onClick={handleCreate}
                className="btn-lg hover:!bg-blue-900 hover:!text-[#ffff]"
              >
                Create New Certification
              </Button>
            </div>
          </div>

          <div className="mb-4 w-full flex justify-between items-center">
            <Input
              placeholder="Search by Student ID, Name, Father's Name, or Course..."
              prefix={<FaSearch />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: "100%", maxWidth: "400px" }}
              className="form-input !h-[42px] !bg-accent"
            />
            {searchText && (
              <p className="text-sm text-gray-500 mt-2">
                Found {filteredCertifications.length} result(s)
              </p>
            )}
            <div className="flex justify-center gap-[12px] items-center">
              {selectedDeletedRecords.length > 0 && (
                <p>
                  You are Selected <span>{selectedDeletedRecords.length}</span>{" "}
                  record{selectedDeletedRecords.length !== 1 ? "s" : ""}
                </p>
              )}
              {selectedDeletedRecords.length > 0 && (
                <Popconfirm
                  title={`Are you sure you want to delete ${selectedDeletedRecords.length} selected record${selectedDeletedRecords.length !== 1 ? "s" : ""}?`}
                  okText={bulkDeleteLoading ? "Deleting..." : "Yes"}
                  cancelText="No"
                  okButtonProps={{ loading: bulkDeleteLoading }}
                  onConfirm={handleBulkDelete}
                >
                  <Button
                    danger
                    icon={<FaTrash />}
                    size="small"
                    loading={bulkDeleteLoading}
                    className="flex items-center gap-1"
                  >
                    Delete All Selected
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        open={uploadStats}
        onCancel={() => setUploadStats(false)}
        footer={null}
        centered
        width={600}
        closeIcon={false}
      >
        {/* Upload Stats */}
        <div className="p-[10px] bg-blue-50 rounded-md border border-blue-200 w-full">
          <div className="w-full flex justify-end mb-2">
            <button
              onClick={() => setUploadStats(null)}
              className="text-[25px] text-primary w-[35px] h-[35px] rounded-full flex justify-center items-center hover:bg-blue-100"
            >
              <IoCloseCircleOutline />
            </button>
          </div>

          <h4 className="font-semibold text-blue-900 mb-3">
            Upload Statistics:
          </h4>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-lg font-bold text-blue-900">
                {staticsData?.stats?.total}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Success</p>
              <p className="text-lg font-bold text-green-600">
                {staticsData?.stats?.inserted}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Duplicates</p>
              <p className="text-lg font-bold text-yellow-600">
                {staticsData?.stats?.inserted}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-lg font-bold text-red-600">
                {staticsData?.stats?.failed}
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <div className="bg-[#fff] shadow-md rounded-md overflow-x-auto w-full">
        <Table
          columns={columns}
          dataSource={isLoading ? [] : filteredCertifications}
          rowKey="_id"
          className="custom-pagination-table"
          scroll={{ x: "max-content" }}
          pagination={{
            current: tablePage,
            pageSize: tablePageSize,
            showSizeChanger: true,
            pageSizeOptions: [10, 25, 50, 100],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
            onChange: (page, size) => {
              setTablePage(page);
              setTablePageSize(size);
            },
            onShowSizeChange: (current, size) => {
              setTablePageSize(size);
              setTablePage(1);
            },
          }}
          locale={{
            emptyText: isLoading ? (
              <div className="w-full h-[300px] flex justify-center items-center">
                <ScaleLoader
                  color="#01134C"
                  height={28}
                  width={6}
                  radius={2}
                  margin={2}
                  loading={true}
                />
              </div>
            ) : searchText ? (
              "No certifications found matching your search"
            ) : (
              "No certifications available"
            ),
          }}
        />
      </div>

      <Modal
        title={
          modalType === "view" ? (
            <h4 className="h4 py-[12px]">Certification Details</h4>
          ) : modalType === "edit" ? (
            <h4 className="h4 py-[12px]">Edit Certification</h4>
          ) : (
            <h4 className="h4 py-[12px]">Create New Certification</h4>
          )
        }
        open={isModalVisible}
        onCancel={handleModalCancel}
        maskClosable={true}
        footer={false}
        width={modalType === "view" ? 1210 : 600}
      >
        {modalType === "view" ? (
          <ViewCertification selectedRecord={selectedRecord} />
        ) : (
          <UpdateCertification
            selectedRecord={selectedRecord}
            modalType={modalType}
            setIsModalVisible={setIsModalVisible}
            getAllCertificationsData={getAllCertificationsData}
          />
        )}
      </Modal>
    </div>
  );
};

export default Certification;
