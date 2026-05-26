import { useEffect } from "react";
import AppRouter from "./routes/AppRouter";
import "./App.css";
import useZustandStore from "./stores/zustandStore";
import { fetchAppSettings } from "./services/appSettingsService";
import { getMyPermissions } from "./services/adminService";

const applyAppSettings = (settings) => {
  if (!settings) return;

  document.documentElement.style.setProperty("--primary-color", settings.themeColor || "#1a73e8");
  document.documentElement.style.setProperty("--accent-color", settings.accentColor || "#f59e0b");
  document.documentElement.style.setProperty("--font-family", settings.fontFamily || "Inter");
  document.title = settings.schoolName || "School Management System";

  const favicon = document.querySelector("link[rel*='icon']");
  if (favicon && settings.favicon) {
    favicon.href = settings.favicon;
  }
};

const App = () => {
  const { token, appSettings, setAppSettings, setPermissions, setIsSuperAdmin } =
    useZustandStore();

  useEffect(() => {
    applyAppSettings(appSettings);
  }, [appSettings]);

  useEffect(() => {
    fetchAppSettings()
      .then((response) => setAppSettings(response.data))
      .catch(() => {});
  }, [setAppSettings]);

  useEffect(() => {
    if (!token) return;

    getMyPermissions()
      .then((response) => {
        setPermissions(response?.data?.permissions || {});
        setIsSuperAdmin(response?.data?.isSuperAdmin === true);
      })
      .catch(() => {});
  }, [token, setPermissions, setIsSuperAdmin]);

  return <AppRouter />;
};

export default App;
