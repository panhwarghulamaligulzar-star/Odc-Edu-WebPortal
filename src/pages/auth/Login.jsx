import { Form, Input, Button, Checkbox, message } from "antd";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { getAdminInformation, getMyPermissions } from "../../services/adminService";
import { adminLogin } from "../../services/authService";
import useZustandStore from "../../stores/zustandStore";
import { useState } from "react";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import { getFirstAccessibleDashboardPath } from "../../config/rbac";
import { getBrandLogo, getSchoolName } from "../../utils/branding";

const Login = () => {
  const {
    setAuthSession,
    setAdminInfo,
    setPermissions,
    setIsSuperAdmin,
    clearToken,
    appSettings,
  } =
    useZustandStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleAdminLogin = async (values) => {
    setLoading(true);
    try {
      clearToken();

      const payload = {
        ...values,
        email: values.email?.trim(),
      };

      const response = await adminLogin(payload);
      const { token } = response;

      if (token) {
        setAuthSession({
          token,
          userData: response?.user || null,
        });
        localStorage.setItem("token", token);

        let currentPermissions = response?.user?.permissions;
        let currentSuperAdmin = response?.user?.isSuperAdmin === true;

        try {
          const permissionsResponse = await getMyPermissions();
          currentPermissions = permissionsResponse?.data?.permissions || currentPermissions;
          currentSuperAdmin = permissionsResponse?.data?.isSuperAdmin === true;
          setPermissions(currentPermissions);
          setIsSuperAdmin(currentSuperAdmin);
        } catch (permissionsError) {
          console.error("Permission refresh after login failed:", permissionsError);
        }

        try {
          const profileResponse = await getAdminInformation(response?.userId);
          setAdminInfo(profileResponse);
        } catch (profileError) {
          console.error("Profile fetch after login failed:", profileError);
        }

        const firstPath = getFirstAccessibleDashboardPath({
          permissions: currentPermissions,
          isSuperAdmin: currentSuperAdmin,
        });

        navigate(firstPath || "/dashboard/no-access");

        message.success(`welcom Admin ${response?.user?.name || ""}`.trim());
      }
    } catch (error) {
      message.error(error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex justify-center items-center px-4">
      <div className="w-full max-w-[1400px] h-full flex flex-col md:flex-row justify-center items-center gap-[20px] m-auto ">
        <div className="w-full md:w-[500px] text-center md:text-left px-2">
          <h1 className="h1 text-[25px] lg:!text-[48px] text-primary">
            {getSchoolName(appSettings)}
          </h1>
          <p className="sub-heading-sm mt-[-10px] lg:mt-0 py-[5px] text-primary">
            Admin Control Center
          </p>

          <div className="branding-features mt-4 hidden lg:block">
            {[
              "Secure Access",
              "Real-time Dashboard",
              "Complete Management",
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-center md:justify-start items-center gap-[5px]"
              >
                <span className="btn-sm-cricle opacity-60 my-[8px] !text-primary">
                  ✓
                </span>
                <span className="text-md text-primary opacity-30">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full md:w-[500px] bg-accent rounded-[10px] p-[30px] mt-10 md:mt-0">
          <div className="form-container !bg-transparent">
            <div className="w-[150px] h-[150px] md:w-[150px] md:h-[150px] m-auto flex justify-center items-center mt-[-60px] md:mt-[-100px] rounded-full overflow-hidden border border-[#ffff] bg-[#ffff] p-[06px]">
              <img
                src={getBrandLogo(appSettings)}
                className="w-full h-full object-contain"
                alt="logo"
              />
            </div>

            <div className="form-header flex flex-col gap-[8px] mb-[40px] mt-6">
              <h2 className="h4 text-center">Welcome Back</h2>
              <p className="text-md text-center opacity-40">
                Sign in to your admin account
              </p>
            </div>

            <Form form={form} name="login" onFinish={handleAdminLogin}>
              <Form.Item
                name="email"
                rules={[
                  {
                    required: true,
                    message: (
                      <span className="font-Arial text-[15px]">
                        Email is required
                      </span>
                    ),
                  },
                  {
                    type: "email",
                    message: (
                      <span className="font-Arial text-[15px]">
                        Enter a valid email
                      </span>
                    ),
                  },
                ]}
              >
                <div className="flex flex-col gap-[6px]">
                  <label className="text-md !text-[14px] opacity-40">
                    Email Address
                  </label>
                  <Input
                    placeholder="admin@school.edu"
                    className="form-input"
                    autoComplete="email"
                  />
                </div>
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  {
                    required: true,
                    message: (
                      <span className="font-Arial text-[15px]">
                        Password is required
                      </span>
                    ),
                  },
                  {
                    min: 6,
                    message: (
                      <span className="font-Arial text-[15px]">
                        Password must be at least 6 characters
                      </span>
                    ),
                  },
                ]}
              >
                <div className="flex flex-col gap-[6px]">
                  <label className="text-md !text-[14px] opacity-40">
                    Password
                  </label>
                  <Input.Password
                    placeholder="Enter your password"
                    className="form-input password-input"
                    iconRender={(visible) =>
                      visible ? (
                        <FaEye className="text-[40px]" />
                      ) : (
                        <FaEyeSlash className="text-[40px]" />
                      )
                    }
                  />
                </div>
              </Form.Item>

              <Form.Item>
                <Checkbox className="custom-checkbox">
                  <span className="text-md !text-[14px] opacity-40">
                    Forgot password
                  </span>
                </Checkbox>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="btn-xl w-full hover:!bg-blue-950"
                >
                  {loading ? (
                    <LoaderSpnar />
                  ) : (
                    <>
                      <span className="text-md !text-[14px] text-accent">
                        Sign In
                      </span>
                      <span className="btn-arrow">→</span>
                    </>
                  )}
                </Button>
              </Form.Item>
            </Form>

            <div className="form-footer text-center mt-4">
              <p className="text-md !text-[14px]">
                Need help?{" "}
                <a href="#support" className="text-md !text-[14px] underline">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
