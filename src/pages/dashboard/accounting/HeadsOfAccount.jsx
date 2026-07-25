import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Select,
  Space,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
  Tooltip,
  Switch,
  Upload,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { FaFileDownload, FaFileExcel, FaFileImport } from "react-icons/fa";
import { ScaleLoader } from "react-spinners";
import * as XLSX from "xlsx";
import {
  getAccountingTypes,
  getHeadsOfAccount,
  createHeadOfAccount,
  updateHeadOfAccount,
  deleteHeadOfAccount,
} from "../../../services/accountingService";

const { Option } = Select;
const { TextArea } = Input;
const ALL_TYPE_FILTER = "all";

const resolveHeadId = (head) => head?._id || head?.id || head?.key || null;
const normalizeHeadRecord = (head, availableTypes = [], fallbackTypeId = null) => {
  const resolvedHeadId = resolveHeadId(head);
  const resolvedType =
    resolveTypeRecord(head?.type, availableTypes) ||
    resolveTypeRecord(fallbackTypeId, availableTypes) ||
    null;
  const resolvedTypeLabel =
    head?.typeLabel ||
    resolveTypeLabel(head?.type, availableTypes, fallbackTypeId);

  return {
    ...head,
    _id: resolvedHeadId,
    type: resolvedType || head?.type || null,
    typeLabel: resolvedTypeLabel,
  };
};
const normalizeExcelKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getExcelCellValue = (row, possibleKeys = []) => {
  const entries = Object.entries(row || {});

  for (const key of possibleKeys) {
    const normalizedKey = normalizeExcelKey(key);
    const match = entries.find(
      ([entryKey]) => normalizeExcelKey(entryKey) === normalizedKey,
    );

    if (match) {
      return match[1];
    }
  }

  return "";
};

const normalizeTypeValue = (value) => {
  const rawValue = String(value || "").trim();
  const compactValue = rawValue.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!compactValue) {
    return "";
  }

  if (
    compactValue === "income" ||
    compactValue === "incomes" ||
    compactValue === "incomehead" ||
    compactValue === "incomeaccount" ||
    compactValue === "inc" ||
    compactValue.includes("income")
  ) {
    return "income";
  }

  if (
    compactValue === "expense" ||
    compactValue === "expenses" ||
    compactValue === "expensehead" ||
    compactValue === "expenseaccount" ||
    compactValue === "exp" ||
    compactValue.includes("expense")
  ) {
    return "expense";
  }

  return compactValue;
};

const resolveTypeRecord = (typeValue, availableTypes = []) => {
  if (!typeValue) {
    return null;
  }

  if (typeof typeValue === "object") {
    if (typeValue.name) {
      return typeValue;
    }

    const nestedTypeId =
      typeValue._id || typeValue.id || typeValue.value || typeValue.type || null;

    if (nestedTypeId) {
      return (
        availableTypes.find(
          (type) => String(type?._id || "") === String(nestedTypeId),
        ) || null
      );
    }
  }

  return (
    availableTypes.find(
      (type) =>
        String(type?._id || "") === String(typeValue) ||
        normalizeTypeValue(type?.name) === normalizeTypeValue(typeValue),
    ) || null
  );
};

const resolveTypeLabel = (
  typeValue,
  availableTypes = [],
  fallbackTypeId = null,
) => {
  const resolvedType =
    resolveTypeRecord(typeValue, availableTypes) ||
    resolveTypeRecord(fallbackTypeId, availableTypes) ||
    null;

  if (resolvedType?.name === "Income" || resolvedType?.name === "Expense") {
    return resolvedType.name;
  }

  const rawType = String(
    typeValue?._id || typeValue?.id || typeValue || fallbackTypeId || "",
  ).trim();

  if (!rawType) {
    return null;
  }

  if (normalizeTypeValue(rawType) === "income") {
    return "Income";
  }

  if (normalizeTypeValue(rawType) === "expense") {
    return "Expense";
  }

  const matchedType = availableTypes.find(
    (type) => String(type?._id || "") === rawType,
  );

  if (matchedType?.name === "Income" || matchedType?.name === "Expense") {
    return matchedType.name;
  }

  return null;
};

const HeadsOfAccount = () => {
  const [heads, setHeads] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPE_FILTER);
  const [typesLoaded, setTypesLoaded] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importingHeads, setImportingHeads] = useState(false);
  const [exportingHeads, setExportingHeads] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [form] = Form.useForm();

  // ── Fetch on mount and filter change ──────────────────────
  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!typesLoaded) {
      return;
    }

    fetchHeads();
  }, [typeFilter, typesLoaded]);

  useEffect(() => {
    if (!types.length) {
      return;
    }

    setHeads((prevHeads) =>
      prevHeads.map((head) => normalizeHeadRecord(head, types)),
    );
  }, [types, typeFilter]);

  const getActiveTypeFilter = () =>
    typeFilter && typeFilter !== ALL_TYPE_FILTER ? typeFilter : null;

  const fetchTypes = async () => {
    try {
      const res = await getAccountingTypes();
      if (res?.success) {
        setTypes(res.data);
        setTypesLoaded(true);
      } else {
        console.error("fetchTypes — unexpected response:", res);
        message.error(res?.message || "Failed to load accounting types");
      }
    } catch (err) {
      console.error("fetchTypes error:", err);
      setTypesLoaded(false);
      message.error(err?.message || "Could not connect to accounting API");
    }
  };

  const fetchHeads = async () => {
    setLoading(true);
    try {
      const res = await getHeadsOfAccount(getActiveTypeFilter(), true);
      if (res?.success) {
        setHeads(
          (res.data || []).map((head) =>
            normalizeHeadRecord(head, types),
          ),
        );
      } else {
        console.error("fetchHeads — unexpected response:", res);
        message.error(res?.message || "Failed to load heads of account");
      }
    } catch (err) {
      console.error("fetchHeads error:", err);
      message.error(err?.message || "Could not connect to accounting API");
    } finally {
      setLoading(false);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────
  const openCreateModal = () => {
    setEditingHead(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingHead({
      ...record,
      _id: resolveHeadId(record),
    });
    form.setFieldsValue({
      name: record.name,
      type: record.type?._id || record.type,
      description: record.description,
      isActive: record.isActive !== false,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingHead(null);
    form.resetFields();
  };

  // ── Submit form ────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const normalizedValues = {
        ...values,
        type: String(values.type?._id || values.type || "").trim(),
      };

      if (editingHead) {
        const headId = resolveHeadId(editingHead);
        if (!headId) {
          message.error("Unable to determine the head record to update.");
          return;
        }

        const payload = {
          ...normalizedValues,
          id: headId,
          originalHead: {
            id: headId,
            name: editingHead.name || "",
            type: editingHead.type?._id || editingHead.type || null,
            description: editingHead.description || "",
            isActive: editingHead.isActive !== false,
          },
        };

        const res = await updateHeadOfAccount(headId, payload);
        if (res.success) {
          const updatedHead = normalizeHeadRecord(
            res.data,
            types,
            normalizedValues.type,
          );
          setHeads((prevHeads) =>
            prevHeads.map((head) =>
              resolveHeadId(head) === updatedHead._id ? updatedHead : head,
            ),
          );
          message.success("Head of account updated successfully");
          closeModal();
          if (
            getActiveTypeFilter() &&
            normalizedValues.type !== getActiveTypeFilter()
          ) {
            setTypeFilter(ALL_TYPE_FILTER);
          } else {
            await fetchHeads();
          }
        }
      } else {
        const res = await createHeadOfAccount(normalizedValues);
        if (res.success) {
          const createdHead = normalizeHeadRecord(
            res.data,
            types,
            normalizedValues.type,
          );
          if (
            !getActiveTypeFilter() ||
            normalizedValues.type === getActiveTypeFilter()
          ) {
            setHeads((prevHeads) => [...prevHeads, createdHead]);
          }
          message.success("Head of account created successfully");
          closeModal();
          await fetchHeads();
        }
      }
    } catch (err) {
      if (err?.message) message.error(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await deleteHeadOfAccount(id);
      if (res.success) {
        message.success("Head of account deactivated");
        fetchHeads();
      }
    } catch (err) {
      message.error(err?.message || "Failed to deactivate");
    }
  };

  const downloadHeadsTemplate = () => {
    const templateRows = [
      {
        "Head Name": "Admission Fee",
        Type: "Income",
        Description: "Student admission fee income",
        Status: "Active",
      },
      {
        "Head Name": "Rent",
        Type: "Expense",
        Description: "Office / institute rent",
        Status: "Active",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Heads Of Account");
    XLSX.writeFile(workbook, "heads-of-account-template.xlsx");
  };

  const downloadHeadsWorkbook = () => {
    try {
      setExportingHeads(true);

      const workbook = XLSX.utils.book_new();
      const exportRows = heads.map((head, index) => ({
        "#": index + 1,
        "Head Name": head.name || "",
        Type: head.type?.name || "",
        Description: head.description || "",
        Status: head.isActive === false ? "Inactive" : "Active",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Heads Of Account");
      XLSX.writeFile(workbook, "heads-of-account.xlsx");
      message.success("Heads of account Excel downloaded successfully");
    } catch (error) {
      console.error("downloadHeadsWorkbook error:", error);
      message.error("Failed to download Excel file");
    } finally {
      setExportingHeads(false);
    }
  };

  const handleHeadsImport = async (file) => {
    if (!types.length) {
      message.error("Accounting types are still loading. Please try again.");
      return false;
    }

    setImportingHeads(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rows.length) {
        message.error("Excel sheet is empty");
        return false;
      }

      const typeMap = new Map();
      types.forEach((type) => {
        typeMap.set(normalizeTypeValue(type.name), type);
        typeMap.set(String(type._id || ""), type);
      });
      const currentHeads = [...heads];
      let imported = 0;
      let updated = 0;
      const errors = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const headName = String(
          getExcelCellValue(row, ["Head Name", "name", "head"]),
        ).trim();
        const rawTypeValue = getExcelCellValue(row, [
          "Type",
          "Accounting Type",
          "head type",
        ]);
        const typeName = normalizeTypeValue(rawTypeValue);
        const description = String(
          getExcelCellValue(row, ["Description", "details", "note"]),
        ).trim();
        const statusValue = String(
          getExcelCellValue(row, ["Status", "Active", "isActive"]) || "Active",
        )
          .trim()
          .toLowerCase();

        if (!headName) {
          errors.push(`Row ${index + 2}: Head Name is required`);
          continue;
        }

        const matchedType = typeMap.get(typeName);
        if (!matchedType) {
          errors.push(`Row ${index + 2}: Type must be Income or Expense`);
          continue;
        }

        const isActive = !["inactive", "false", "0", "no"].includes(statusValue);
        const existingHead = currentHeads.find(
          (head) =>
            String(head.name || "").trim().toLowerCase() ===
              headName.toLowerCase() &&
            String(head.type?._id || head.type || "") === String(matchedType._id),
        );

        try {
          if (existingHead) {
            await updateHeadOfAccount(resolveHeadId(existingHead), {
              id: resolveHeadId(existingHead),
              name: headName,
              type: matchedType._id,
              description,
              isActive,
              originalHead: {
                id: resolveHeadId(existingHead),
                name: existingHead.name || "",
                type: existingHead.type?._id || existingHead.type || null,
                description: existingHead.description || "",
                isActive: existingHead.isActive !== false,
              },
            });

            existingHead.name = headName;
            existingHead.type = matchedType;
            existingHead.description = description;
            existingHead.isActive = isActive;
            updated += 1;
          } else {
            const response = await createHeadOfAccount({
              name: headName,
              type: matchedType._id,
              description,
            });

            imported += 1;
            currentHeads.push({
              ...response.data,
              _id: resolveHeadId(response.data),
            });
          }
        } catch (error) {
          errors.push(
            `Row ${index + 2}: ${error?.message || "Failed to import head"}`,
          );
        }
      }

      setImportResult({ imported, updated, errors });
      await fetchHeads();

      if (!errors.length) {
        message.success("Heads of account imported successfully");
      } else {
        message.warning("Import completed with some errors");
      }
    } catch (error) {
      console.error("handleHeadsImport error:", error);
      message.error("Failed to read Excel file");
    } finally {
      setImportingHeads(false);
    }

    return false;
  };

  // ── Table columns ──────────────────────────────────────────
  const columns = [
    {
      title: "#",
      key: "index",
      width: 55,
      render: (_, __, index) => (
        <span className="text-muted font-semibold">{index + 1}</span>
      ),
    },
    {
      title: "Head Name",
      dataIndex: "name",
      key: "name",
      render: (name) => <span className="font-semibold text-dark">{name}</span>,
    },
    {
      title: "Type",
      dataIndex: "typeLabel",
      key: "type",
      render: (_, record) => {
        if (record.typeLabel === "Income") {
          return <Tag color="green">Income</Tag>;
        }

        if (record.typeLabel === "Expense") {
          return <Tag color="red">Expense</Tag>;
        }

        return <Tag color="default">Unknown</Tag>;
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc) => (
        <span className="text-muted text-sm">{desc || "—"}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) =>
        isActive ? (
          <Tag color="blue">Active</Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ borderColor: "#01134C", color: "#01134C" }}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? "Deactivate" : "Already inactive"}>
            <Popconfirm
              title="Deactivate this head of account?"
              description="It won't appear in transaction forms."
              onConfirm={() => handleDelete(resolveHeadId(record))}
              okText="Yes"
              cancelText="No"
              disabled={!record.isActive}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={!record.isActive}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
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
              Import Heads of Account Workbook
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
            Upload heads of account Excel/CSV file or download a ready-made template
          </div>
          <div style={{ fontSize: "13px", color: "#15803D", marginTop: "8px" }}>
            Supported formats: `.xlsx`, `.xls`, `.csv`
          </div>

          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <Upload
              accept=".xlsx,.xls,.csv"
              beforeUpload={handleHeadsImport}
              showUploadList={false}
            >
              <Button
                type="primary"
                icon={<FaFileImport />}
                loading={importingHeads}
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
              onClick={downloadHeadsTemplate}
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
            Head Name, Type, Description, Status
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
              <div>{importResult.imported || 0} new heads imported</div>
              <div>{importResult.updated || 0} existing heads updated</div>
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

      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <AppstoreOutlined style={{ color: "#E8FC0A", fontSize: 20 }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark m-0">
              Heads of Account
            </h2>
            <p className="text-muted text-sm m-0">
              Manage income and expense categories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            onClick={downloadHeadsWorkbook}
            icon={<FaFileDownload />}
            size="large"
            loading={exportingHeads}
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{ backgroundColor: "#01134C", borderColor: "#01134C" }}
          >
            Add Head
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft p-4 mb-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-dark">Filter by Type:</span>
        <Select
          placeholder="All Types"
          style={{ width: 180 }}
          value={typeFilter}
          onChange={(val) => setTypeFilter(val || ALL_TYPE_FILTER)}
        >
          <Option value={ALL_TYPE_FILTER}>All</Option>
          {types.map((t) => (
            <Option key={t._id} value={t._id}>
              {t.name === "Income" ? (
                <Tag color="green" style={{ marginRight: 4 }}>
                  Income
                </Tag>
              ) : (
                <Tag color="red" style={{ marginRight: 4 }}>
                  Expense
                </Tag>
              )}
              {t.name}
            </Option>
          ))}
        </Select>
        <span className="text-muted text-sm ml-auto">
          Total: <strong>{heads.length}</strong> heads
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <ScaleLoader color="#01134C" />
          </div>
        ) : (
          <Table
            dataSource={heads}
            columns={columns}
            rowKey="_id"
            pagination={false}
            scroll={{ x: "max-content" }}
            rowClassName={(record) => (!record.isActive ? "opacity-50" : "")}
          />
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ color: "#01134C" }}>
            <AppstoreOutlined />
            <span>
              {editingHead ? "Edit Head of Account" : "Add Head of Account"}
            </span>
          </div>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editingHead ? "Update" : "Create"}
        confirmLoading={submitLoading}
        okButtonProps={{
          style: { backgroundColor: "#01134C", borderColor: "#01134C" },
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Head Name"
            name="name"
            rules={[{ required: true, message: "Please enter head name" }]}
          >
            <Input placeholder="e.g. Tuition Fee, Salary" />
          </Form.Item>

          <Form.Item
            label="Accounting Type"
            name="type"
            rules={[{ required: true, message: "Please select a type" }]}
          >
            <Select placeholder="Select Income or Expense">
              {types.map((t) => (
                <Option key={t._id} value={t._id}>
                  <Tag
                    color={t.name === "Income" ? "green" : "red"}
                    style={{ marginRight: 6 }}
                  >
                    {t.name}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              rows={3}
              placeholder="Optional description"
              maxLength={200}
              showCount
            />
          </Form.Item>

          {editingHead && (
            <Form.Item label="Status" name="isActive" valuePropName="checked">
              <Switch
                checkedChildren="Active"
                unCheckedChildren="Inactive"
                className="custom-toggle"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default HeadsOfAccount;
