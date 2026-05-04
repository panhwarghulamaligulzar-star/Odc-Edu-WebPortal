import React, { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Tag, Tooltip, Popconfirm, message, Segmented, Switch, Space,
} from "antd";
import { MdAdd, MdEdit, MdDelete, MdPublic, MdSchool, MdDownload, MdPeople } from "react-icons/md";
import { BsCalendarEvent } from "react-icons/bs";
import dayjs from "dayjs";
import { getAllBatches } from "../../services/batchService";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  seedGovernmentHolidays,
} from "../../services/holidayService";
import { markHolidayAttendance } from "../../services/attendanceService";

const { RangePicker } = DatePicker;

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  government: {
    label: "Government",
    color: "red",
    icon: <MdPublic size={14} />,
    bg: "bg-red-50 text-red-700 border-red-200",
    tooltipPrefix: "Public Holiday",
  },
  academy: {
    label: "Academy",
    color: "blue",
    icon: <MdSchool size={14} />,
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    tooltipPrefix: "School Holiday",
  },
};

// ─── HolidayManagement ───────────────────────────────────────────────────────
export default function HolidayManagement() {
  const [holidays, setHolidays]     = useState([]);
  const [batches, setBatches]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [markLoading, setMarkLoading] = useState(null); // holidayId being marked
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [form]                      = Form.useForm();

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const params = typeFilter !== "all" ? { type: typeFilter } : {};
      const res = await getHolidays(params);
      setHolidays(res.data || []);
    } catch {
      message.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  useEffect(() => {
    getAllBatches().then((res) => setBatches(res.data || [])).catch(() => {});
  }, []);

  // ── Open modal (add / edit) ────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ type: "academy", isRecurring: false, affectedBatches: [] });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      reason: record.reason || "",
      isRecurring: record.isRecurring,
      affectedBatches: (record.affectedBatches || []).map((b) => b._id || b),
      dateRange: [
        dayjs(record.date),
        record.endDate ? dayjs(record.endDate) : dayjs(record.date),
      ],
    });
    setModalOpen(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const [startD, endD] = values.dateRange;
      const payload = {
        date:             startD.format("YYYY-MM-DD"),
        endDate:          endD.format("YYYY-MM-DD"),
        name:             values.name,
        type:             values.type,
        reason:           values.reason || "",
        isRecurring:      values.isRecurring || false,
        affectedBatches:  values.affectedBatches || [],
      };

      if (editingId) {
        await updateHoliday(editingId, payload);
        message.success("Holiday updated");
      } else {
        const res = await createHoliday(payload);
        if (payload.type === "academy") {
          message.success(res.message || "Academy holiday created and attendance auto-marked as Holiday");
        } else {
          message.success("Government holiday created — attendance can still be marked on this date if academy is open");
        }
      }
      setModalOpen(false);
      loadHolidays();
    } catch (err) {
      if (err?.errorFields) return; // validation
      message.error(err?.response?.data?.message || "Failed to save holiday");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteHoliday(id);
      message.success("Holiday removed");
      loadHolidays();
    } catch {
      message.error("Failed to remove holiday");
    }
  };

  // ── Mark holiday attendance ───────────────────────────────────────────────
  const handleMarkAttendance = async (holidayId, holidayName) => {
    setMarkLoading(holidayId);
    try {
      const res = await markHolidayAttendance(holidayId);
      message.success(res.message || `Holiday attendance marked for "${holidayName}"`);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to mark attendance");
    } finally {
      setMarkLoading(null);
    }
  };

  // ── Seed government holidays ──────────────────────────────────────────────
  const handleSeed = async () => {
    try {
      const res = await seedGovernmentHolidays();
      message.success(res.message || "Government holidays seeded");
      loadHolidays();
    } catch {
      message.error("Failed to seed government holidays");
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    { title: "#", width: 50, render: (_, __, i) => i + 1 },
    {
      title: "Date",
      width: 180,
      render: (_, r) => {
        const same = !r.endDate || r.date === r.endDate ||
          dayjs(r.date).isSame(dayjs(r.endDate), "day");
        return same
          ? <span className="font-medium">{dayjs(r.date).format("ddd, DD MMM YYYY")}</span>
          : (
            <span className="font-medium">
              {dayjs(r.date).format("DD MMM")} – {dayjs(r.endDate).format("DD MMM YYYY")}
            </span>
          );
      },
    },
    {
      title: "Name / Reason",
      render: (_, r) => (
        <div>
          <span className="font-medium">{r.name}</span>
          {r.reason && (
            <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
          )}
        </div>
      ),
    },
    {
      title: "Type",
      width: 130,
      render: (_, r) => {
        const cfg = TYPE_CONFIG[r.type];
        return (
          <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded border text-xs font-medium ${cfg.bg}`}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      title: "Affected Batches",
      render: (_, r) => {
        const bs = r.affectedBatches || [];
        if (bs.length === 0) return <Tag color="orange">All Batches</Tag>;
        return (
          <div className="flex flex-wrap gap-1">
            {bs.map((b) => (
              <Tag key={b._id || b} color="purple">{b.batchName || b}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Recurring",
      width: 90,
      render: (_, r) => r.isRecurring
        ? <Tag color="green">Yes</Tag>
        : <Tag>No</Tag>,
    },
    {
      title: "Actions",
      width: 140,
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<MdEdit size={14} />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title={`Mark attendance as "Holiday" for "${r.name}"?`}
            description="Creates/updates attendance records for all batch members on this date."
            onConfirm={() => handleMarkAttendance(r._id, r.name)}
            okText="Mark"
          >
          <Tooltip title="Re-mark attendance as Holiday for all members (auto-done on creation for Academy holidays)">
              <Button
                size="small"
                icon={<MdPeople size={14} />}
                loading={markLoading === r._id}
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="Remove this holiday?"
            description="Attendance can be marked on this date again."
            onConfirm={() => handleDelete(r._id)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Remove">
              <Button size="small" danger icon={<MdDelete size={14} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <BsCalendarEvent size={22} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Holiday Management</h2>
            <p className="text-xs text-gray-500">Academy holidays auto-mark all students &amp; teachers. Government holidays are shown in the attendance picker but remain selectable if academy is open.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Tooltip title="Load Pakistan government holidays for 2025–2026">
            <Button icon={<MdDownload size={14} />} onClick={handleSeed}>
              Load Govt. Holidays
            </Button>
          </Tooltip>
          <Button type="primary" icon={<MdAdd size={16} />} onClick={openAdd}>
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Filter + legend */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center justify-between">
        <Segmented
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Government", value: "government" },
            { label: "Academy", value: "academy" },
          ]}
        />
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-400 inline-block" />
            Govt Holiday → tooltip: "Public Holiday – [Name]"
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-400 inline-block" />
            Academy Holiday → tooltip: "School Holiday – [Reason]"
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow">
        <Table
          dataSource={holidays}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          size="middle"
          locale={{ emptyText: "No holidays defined yet. Use 'Load Govt. Holidays' to seed Pakistan official holidays." }}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        title={editingId ? "Edit Holiday" : "Add Holiday"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editingId ? "Update" : "Create"}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="pt-2">
          <Form.Item
            label="Date (or date range for multi-day holidays)"
            name="dateRange"
            rules={[{ required: true, message: "Select a date" }]}
          >
            <RangePicker className="w-full" format="DD MMM YYYY" allowSame />
          </Form.Item>

          <Form.Item
            label="Holiday Name"
            name="name"
            rules={[{ required: true, message: "Enter holiday name" }]}
          >
            <Input placeholder="e.g. Independence Day, Eid ul-Fitr, Sports Day" />
          </Form.Item>

          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "government", label: "🏛️ Government Holiday" },
                { value: "academy",    label: "🏫 Academy Holiday" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Reason / Description" name="reason">
            <Input.TextArea
              rows={2}
              placeholder="e.g. Annual Sports Day, Emergency Closure, Building Renovation"
            />
          </Form.Item>

          <Form.Item
            label="Affected Batches"
            name="affectedBatches"
            extra="Leave empty to apply to ALL batches"
          >
            <Select
              mode="multiple"
              placeholder="All batches (leave empty)"
              allowClear
              showSearch
              filterOption={(input, o) => o?.label?.toLowerCase().includes(input.toLowerCase())}
              options={batches.map((b) => ({
                value: b._id,
                label: `${b.batchName} (${b.batchCode})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Recurring every year (same date)"
            name="isRecurring"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
