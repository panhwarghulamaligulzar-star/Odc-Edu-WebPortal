import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Switch,
  Tabs,
  Upload,
  message,
} from "antd";
import { SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { Palette } from "lucide-react";
import useZustandStore from "../../stores/zustandStore";
import {
  fetchAppSettings,
  updateAppSettings,
  uploadBrandingAsset,
} from "../../services/appSettingsService";
import { getBrandLogo, getPdfBrandLogo, getSchoolName } from "../../utils/branding";

const fontOptions = ["Inter", "Poppins", "Roboto", "Lato", "Nunito", "Outfit"];
const pdfFonts = ["Helvetica", "Times New Roman", "Courier"];
const pdfSizes = ["A4", "Letter", "Legal"];

const UploadButton = ({ label, onUpload, preview }) => (
  <div className="space-y-3">
    {preview ? (
      <img
        src={preview}
        alt={label}
        className="h-24 w-24 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
      />
    ) : null}
    <Upload
      showUploadList={false}
      accept=".png,.jpg,.jpeg,.svg,.ico,.webp,.gif,image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp,image/gif"
      beforeUpload={(file) => {
        onUpload(file);
        return false;
      }}
    >
      <Button
        icon={<UploadOutlined />}
        className="!h-11 !rounded-xl !border-slate-200 !bg-white !px-5 !font-semibold !text-primary hover:!border-primary hover:!text-primary"
      >
        {label}
      </Button>
    </Upload>
  </div>
);

const AppSettingsPage = () => {
  const [form] = Form.useForm();
  const { appSettings, setAppSettings } = useZustandStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetchAppSettings();
      setAppSettings(response.data);
      form.setFieldsValue(response.data);
    } catch (error) {
      message.error(error?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (appSettings) {
      form.setFieldsValue(appSettings);
    }
  }, [appSettings, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await updateAppSettings(values);
      setAppSettings(response.data);
      message.success("Settings updated successfully");
    } catch (error) {
      message.error(error?.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (type, file) => {
    setUploading(true);
    try {
      const response = await uploadBrandingAsset(type, file);
      setAppSettings(response.data.settings);
      form.setFieldsValue(response.data.settings);
      await loadSettings();
      message.success("Asset uploaded successfully");
    } catch (error) {
      console.error("Branding upload failed:", error);
      message.error(error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary text-accent flex items-center justify-center">
          <Palette size={22} />
        </div>
        <div>
          <h2 className="module-title">App Settings</h2>
          <p className="module-subtitle">
            Control branding, report styling, and school metadata
          </p>
        </div>
      </div>

      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        <Tabs
          items={[
            {
              key: "branding",
              label: "Branding",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card className="rounded-2xl shadow-sm">
                      <Form.Item name="schoolName" label="School Name">
                        <Input className="form-input !h-[46px]" />
                      </Form.Item>
                      <Form.Item name="tagline" label="Tagline">
                        <Input className="form-input !h-[46px]" />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="themeColor" label="Theme Color">
                            <Input type="color" className="form-input !h-[46px] !p-2" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="accentColor" label="Accent Color">
                            <Input type="color" className="form-input !h-[46px] !p-2" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="fontFamily" label="Font Family">
                        <Select
                          className="role-select-theme"
                          options={fontOptions.map((item) => ({ label: item, value: item }))}
                        />
                      </Form.Item>
                      <div className="flex flex-wrap gap-4">
                        <UploadButton
                          label="Upload Logo"
                          preview={appSettings?.logo}
                          onUpload={(file) => handleUpload("logo", file)}
                        />
                        <UploadButton
                          label="Upload Favicon"
                          preview={appSettings?.favicon}
                          onUpload={(file) => handleUpload("favicon", file)}
                        />
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card className="h-full rounded-2xl shadow-sm">
                      <div
                        className="rounded-2xl p-6 min-h-[280px]"
                        style={{
                          background: `linear-gradient(135deg, ${appSettings?.themeColor || "#1a73e8"} 0%, ${appSettings?.accentColor || "#f59e0b"} 100%)`,
                          fontFamily: appSettings?.fontFamily || "Inter",
                        }}
                      >
                        <div className="bg-white/90 rounded-xl p-4">
                          <div className="mb-4 flex items-center gap-3">
                            <img
                              src={getBrandLogo(appSettings)}
                              alt={getSchoolName(appSettings)}
                              className="h-14 w-14 rounded-xl bg-white object-contain p-1 shadow-sm"
                            />
                            <div>
                              <div className="text-lg font-bold">{getSchoolName(appSettings)}</div>
                              <div className="text-sm text-gray-500">
                                {appSettings?.tagline || "Live branding preview"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 p-3 rounded-lg border" style={{ borderColor: appSettings?.themeColor || "#1a73e8" }}>
                            Sidebar + header colors will follow these settings.
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "pdf",
              label: "PDF Reports",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card className="rounded-2xl shadow-sm">
                      <Form.Item name="pdfHeaderText" label="PDF Header Text">
                        <Input maxLength={120} className="form-input !h-[46px]" />
                      </Form.Item>
                      <Form.Item name="pdfFooterText" label="PDF Footer Text">
                        <Input maxLength={180} className="form-input !h-[46px]" />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="pdfPrimaryColor" label="PDF Primary Color">
                            <Input type="color" className="form-input !h-[46px] !p-2" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="pdfFontFamily" label="PDF Font Family">
                            <Select
                              className="role-select-theme"
                              options={pdfFonts.map((item) => ({ label: item, value: item }))}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="pdfPageSize" label="PDF Page Size">
                        <Select
                          className="role-select-theme"
                          options={pdfSizes.map((item) => ({ label: item, value: item }))}
                        />
                      </Form.Item>
                      <UploadButton
                        label="Upload PDF Logo"
                        preview={appSettings?.pdfLogo}
                        onUpload={(file) => handleUpload("pdf-logo", file)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card className="h-full rounded-2xl shadow-sm">
                      <div className="rounded-xl border p-5 bg-white min-h-[280px]">
                        <div className="mb-4 flex justify-center">
                          <img
                            src={getPdfBrandLogo(appSettings)}
                            alt="PDF Logo"
                            className="h-16 w-16 object-contain"
                          />
                        </div>
                        <div className="text-center font-bold" style={{ color: appSettings?.pdfPrimaryColor || "#1a73e8" }}>
                          {appSettings?.schoolName}
                        </div>
                        <div className="text-center text-sm mt-2">{appSettings?.pdfHeaderText || "PDF header preview"}</div>
                        <div className="mt-10 border-t pt-4 text-xs text-gray-500">
                          {appSettings?.pdfFooterText || "Footer preview"} | Page 1 of 1
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "contact",
              label: "Contact & School Info",
              children: (
                <Card className="rounded-2xl shadow-sm">
                  <Form.Item name="address" label="Address">
                    <Input.TextArea rows={4} className="form-input !py-3" />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item name="phone" label="Phone">
                        <Input className="form-input !h-[46px]" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="email" label="Email">
                        <Input className="form-input !h-[46px]" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="website" label="Website">
                        <Input className="form-input !h-[46px]" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ),
            },
            {
              key: "system",
              label: "System",
              children: (
                <Card className="rounded-2xl shadow-sm">
                  <Form.Item name="maintenanceMode" label="Maintenance Mode" valuePropName="checked">
                    <Switch className="theme-switch" />
                  </Form.Item>
                  <Form.Item
                    name="showAccountingBalancesToUsers"
                    label="Show Accounting Balances To Accounting Users"
                    valuePropName="checked"
                  >
                    <Switch className="theme-switch" />
                  </Form.Item>
                  <p className="text-sm text-gray-500">
                    Import/export and reset actions can now use the stored JSON payload from these settings.
                  </p>
                </Card>
              ),
            },
          ]}
        />

        <div className="mt-6 flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={loading || uploading}
            className="!h-12 !rounded-xl !border-primary !bg-primary !px-6 !font-semibold hover:!bg-[#0e215fc7]"
          >
            Save Settings
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AppSettingsPage;
