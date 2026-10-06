import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Space, Upload, message } from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { FileText } from "lucide-react";
import {
  getTeacherPaperHeader,
  updateTeacherPaperHeader,
} from "../../services/testStudioService";

const defaultPaperHeader = {
  logo: "",
  logoText: "",
  academyName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  note: "",
};

const TestPaperHeader = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const loadHeader = async () => {
    setLoading(true);
    try {
      const response = await getTeacherPaperHeader();
      form.setFieldsValue({ ...defaultPaperHeader, ...(response.data || {}) });
    } catch (error) {
      message.error(error.message || "Failed to load paper header");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeader();
  }, []);

  const handleLogoUpload = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      form.setFieldValue("logo", reader.result);
      message.success("Logo added");
    };
    reader.onerror = () => message.error("Failed to read logo file");
    reader.readAsDataURL(file);
    return Upload.LIST_IGNORE;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await updateTeacherPaperHeader(form.getFieldsValue(true));
      message.success(response.message || "Test paper header saved");
      form.setFieldsValue({ ...defaultPaperHeader, ...(response.data || {}) });
    } catch (error) {
      message.error(error.message || "Failed to save paper header");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-accent">
          <FileText size={22} />
        </div>
        <div>
          <h2 className="module-title">Test Paper Header</h2>
          <p className="module-subtitle">Setup academy details once for every downloaded test paper</p>
        </div>
      </div>

      <Card className="rounded-2xl" loading={loading}>
        <Form form={form} layout="vertical">
          <Form.Item name="logo" hidden>
            <Input />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const logo = form.getFieldValue("logo");
              const logoText = form.getFieldValue("logoText");
              return (
                <div className="mb-4 flex flex-col gap-3">
                  {(logo || logoText) ? (
                    <div className="flex w-full items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      {logo ? (
                        <img
                          src={logo}
                          alt="Paper logo"
                          className="h-20 w-20 rounded-lg border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : null}
                      {logoText ? (
                        <div className="text-xl font-ArialBold text-primary">{logoText}</div>
                      ) : null}
                    </div>
                  ) : null}
                  <Space wrap>
                    <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogoUpload}>
                      <Button icon={<PlusOutlined />}>{logo ? "Change Logo" : "Add Logo"}</Button>
                    </Upload>
                    {logo ? (
                      <Button onClick={() => form.setFieldValue("logo", "")}>Remove Logo</Button>
                    ) : null}
                  </Space>
                </div>
              );
            }}
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item name="logoText" label="Logo Text / Header Name">
              <Input className="form-input" placeholder="Text shown beside logo" />
            </Form.Item>
            <Form.Item name="academyName" label="Institute / Academy Name">
              <Input className="form-input" placeholder="e.g. Odyssey Academy Khipro" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input className="form-input" placeholder="Contact number" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input className="form-input" placeholder="Email address" />
            </Form.Item>
            <Form.Item name="website" label="Website">
              <Input className="form-input" placeholder="Website or social link" />
            </Form.Item>
            <Form.Item name="address" label="Address" className="md:col-span-2">
              <Input.TextArea rows={3} placeholder="Institute address" />
            </Form.Item>
            <Form.Item name="note" label="Header Note" className="md:col-span-2">
              <Input.TextArea rows={2} placeholder="Optional campus, session, department, or exam note" />
            </Form.Item>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
              Save Header
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default TestPaperHeader;
