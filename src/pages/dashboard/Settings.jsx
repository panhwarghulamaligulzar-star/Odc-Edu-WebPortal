import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
} from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  message,
  Avatar,
  Popconfirm,
} from "antd";
import ViewAdminInfo from "../../components/modalBox/ViewAdminInfo";
import UpdateAdmin from "../../components/forms/UpdateAdmin";
import { deleteAdmin, getAllAdminInfo } from "../../services/adminService";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import { useLocation } from "react-router-dom";
import { ScaleLoader } from "react-spinners";
import useZustandStore from "../../stores/zustandStore";

const Settings = () => {
  const { adminInfo } = useZustandStore();
  const hasFullUserAccess =
    adminInfo?.userData?.isSuperAdmin || adminInfo?.userData?.role === "admin";
  const location = useLocation();
  const pathname = location.pathname;
  const title = pathname.split("/").filter(Boolean).pop();
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedFile, setSelectedFile] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminDetails, setAdminDetails] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [form] = Form.useForm();

  const getAllAdminsData = async () => {
    setLoading(true);
    try {
      setIsLoading(true);
      let resp = await getAllAdminInfo();
      const adminData = resp?.data || resp || [];
      setAdmins(adminData);
      setFilteredAdmins(adminData);
      setIsLoading(false);

      if (adminData.length === 0) {
        message.info("No admin records found");
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      message.error("Failed to load admin data");
      setAdmins([]);
      setFilteredAdmins([]);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAdmins = async () => {
      await getAllAdminsData();

      if (hasFullUserAccess) {
        // Super admin sees all records
        setFilteredAdmins(admins);
      } else {
        // Normal admin only sees their own info
        const currentAdmin = admins.filter(
          (item) => item._id === adminInfo?.userData?._id,
        );
        setFilteredAdmins(currentAdmin);
      }
    };

    fetchAdmins();
  }, [adminInfo, admins.length, hasFullUserAccess]);
  // Search functionality
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchText(value);

    if (!value.trim()) {
      setFilteredAdmins(admins);
      return;
    }

    const searchValue = value.toLowerCase().trim();
    const filtered = admins.filter((admin) => {
      const name = (admin.name || "").toLowerCase();
      const email = (admin.email || "").toLowerCase();

      return name.includes(searchValue) || email.includes(searchValue);
    });

    setFilteredAdmins(filtered);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleView = (record) => {
    setSelectedAdmin(record);
    setModalType("view");
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setSelectedAdmin(record);
    setModalType("edit");
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDeleteAdmin = async (id) => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      const resp = await deleteAdmin(id);
      message.success("Admin deleted successfully!");
      getAllAdminsData();
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

  const handleCreate = () => {
    setModalType("create");
    setSelectedAdmin(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (modalType === "create") {
        const newAdmin = {
          id: admins.length + 1,
          ...values,
          role: "Admin",
        };
        setAdmins([...admins, newAdmin]);
        message.success("Admin created successfully");
      } else if (modalType === "edit") {
        setAdmins(
          admins.map((admin) =>
            admin.id === selectedAdmin.id ? { ...admin, ...values } : admin,
          ),
        );
        message.success("Admin updated successfully");
      }
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // Success callback for UpdateAdmin component
  const handleSuccess = () => {
    setIsModalVisible(false);
    getAllAdminsData();
  };

  let columns = [];

  if (hasFullUserAccess) {
    // SUPER ADMIN — full access
    columns = [
      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Profile
          </span>
        ),
        dataIndex: "profile",
        key: "profile",
        width: 200,
        render: (profile) => {
          // Determine the correct image source
          let imageSrc;
          if (!profile) {
            imageSrc =
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s";
          } else if (
            profile.startsWith("http") ||
            profile.startsWith("https")
          ) {
            // It's a URL, use it directly
            imageSrc = profile;
          } else {
            // It's base64 data, prefix with data URI
            imageSrc = `data:image/png;base64,${profile}`;
          }

          return (
            <Avatar src={imageSrc} className="w-12 h-12 rounded-md border" />
          );
        },
      },

      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Name
          </span>
        ),
        dataIndex: "name",
        key: "name",
        render: (text) => (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            {text}
          </span>
        ),
      },

      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Email
          </span>
        ),
        dataIndex: "email",
        key: "email",
        render: (text) => (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            {text}
          </span>
        ),
      },

      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Role
          </span>
        ),
        dataIndex: "role",
        key: "role",
        render: (text) => (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            {text}
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
          <div className="flex gap-2">
            <Button
              onClick={() => handleView(record)}
              icon={<FaEye />}
              size="small"
              className="btn-md hover !bg-blue-900 hover:!text-white"
            >
              View
            </Button>

            <Button
              onClick={() => handleEdit(record)}
              icon={<FaEdit />}
              size="small"
              className="btn-md !bg-secondary !text-primary hover !border !border-transparent"
            >
              Edit
            </Button>

            <Popconfirm
              title="Are you sure?"
              onConfirm={() => handleDeleteAdmin(record._id)}
              disabled={record.isSuperAdmin}
            >
              <Button
                danger
                icon={<FaTrash />}
                size="small"
                disabled={record.isSuperAdmin}
                className="flex items-center gap-1"
              >
                Delete
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ];
  } else {
    // NORMAL ADMIN — can only see themselves
    columns = [
      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Profile
          </span>
        ),
        dataIndex: "profile",
        render: (profile) => {
          // Determine the correct image source
          let imageSrc;
          if (!profile) {
            imageSrc =
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s";
          } else if (
            profile.startsWith("http") ||
            profile.startsWith("https")
          ) {
            // It's a URL, use it directly
            imageSrc = profile;
          } else {
            // It's base64 data, prefix with data URI
            imageSrc = `data:image/png;base64,${profile}`;
          }

          return (
            <Avatar src={imageSrc} className="w-12 h-12 rounded-md border" />
          );
        },
      },

      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Name
          </span>
        ),
        dataIndex: "name",
        render: (text) => (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            {text}
          </span>
        ),
      },

      {
        title: (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            Email
          </span>
        ),
        dataIndex: "email",
        render: (text) => (
          <span className="text-[14px] text-gray-700 font-ArialLight text-nowrap">
            {text}
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
        render: (_, record) => (
          <Button
            onClick={() => handleView(record)}
            size="small"
            icon={<FaEye />}
            className="btn-md hover !bg-blue-900 hover:!text-white"
          >
            View
          </Button>
        ),
      },
    ];
  }

  return (
    <div className="w-full">
      {title === "settings" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "#01134C" }}
              >
                <MdAdminPanelSettings size={22} style={{ color: "#E8FC0A" }} />
              </div>
              <div>
                <h2
                  className="text-xl font-bold m-0"
                  style={{ color: "#01134C" }}
                >
                  Admin Management
                </h2>
                <p className="text-sm m-0" style={{ color: "#6b7280" }}>
                  Account & system configuration
                </p>
              </div>
            </div>
            {hasFullUserAccess && (
              <Button
                type="primary"
                icon={<FaPlus />}
                onClick={handleCreate}
                size="large"
                className="btn-lg hover:!bg-blue-900"
              >
                Create New Admin
              </Button>
            )}
          </div>
          {hasFullUserAccess && (
            <div className="mb-4">
              <Input
                placeholder="Search by name or email..."
                prefix={<FaSearch />}
                value={searchText}
                onChange={handleSearch}
                allowClear
                style={{ width: "100%", maxWidth: "400px" }}
                className="form-input !h-[42px] !bg-accent"
              />
            </div>
          )}
        </div>
      )}

      <div
        className={`${isLoading ? "bg-transparent" : "bg-[#fff] shadow-md "} rounded-md overflow-x-auto`}
      >
        {isLoading ? (
          <div className="w-full h-[500px] flex justify-center items-center">
            <ScaleLoader
              color="#01134C"
              height={28}
              width={6}
              radius={2}
              margin={2}
              loading={true}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredAdmins}
            rowKey={(record) => record._id}
            className="custom-pagination-table"
            loading={{
              spinning: loading,
              indicator: <LoaderSpnar className="text-primary" />,
            }}
            pagination={{ pageSize: 6 }}
            locale={{
              emptyText: searchText ? (
                <span className="text-[14px] text-gray-700 font-ArialLight">
                  No matching admin found
                </span>
              ) : (
                <span className="text-[14px] text-gray-700 font-ArialLight">
                  No admin data found
                </span>
              ),
            }}
          />
        )}
      </div>

      <Modal
        title={
          modalType === "view" ? (
            <h4 className="h4 py-[12px]">Admin Details</h4>
          ) : modalType === "edit" ? (
            <h4 className="h4 py-[12px]">Edit Admin</h4>
          ) : (
            <h4 className="h4 py-[12px]">Create New Admin</h4>
          )
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        footer={false}
      >
        {modalType === "view" ? (
          <ViewAdminInfo selectedAdmin={selectedAdmin} />
        ) : (
          <UpdateAdmin
            selectedAdmin={selectedAdmin}
            modalType={modalType}
            onSuccess={handleSuccess}
            setIsModalVisible={setIsModalVisible}
            getAllAdminsData={getAllAdminsData}
          />
        )}
      </Modal>
    </div>
  );
};

export default Settings;
