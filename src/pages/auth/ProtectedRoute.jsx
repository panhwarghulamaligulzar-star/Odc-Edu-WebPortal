import { Navigate, useLocation } from "react-router-dom";
import useZustandStore from "../../stores/zustandStore";
import { getFirstAccessibleDashboardPath } from "../../config/rbac";

export default function ProtectedRoute({
  children,
  moduleKey = null,
  action = "view",
  superAdminOnly = false,
  employeeOnly = false,
}) {
  const location = useLocation();
  const { token, permissions, isSuperAdmin, adminInfo } = useZustandStore();
  const localToken = localStorage.getItem("token");
  const superAdminMode =
    isSuperAdmin === true || adminInfo?.userData?.isSuperAdmin === true;
  const roleName = adminInfo?.userData?.role || "";
  const employeeMode = String(roleName || "").toLowerCase() === "employee";

  if (!token && !localToken) {
    return <Navigate to="/login" replace />;
  }

  if (employeeOnly) {
    return employeeMode ? children : <Navigate to="/dashboard/no-access" replace />;
  }

  if (employeeMode && !employeeOnly) {
    return <Navigate to="/employee-dashboard" replace />;
  }

  if (superAdminOnly && !superAdminMode) {
    const target = getFirstAccessibleDashboardPath({
      permissions,
      isSuperAdmin: superAdminMode,
    });
    return (
      <Navigate
        to={target || "/dashboard/no-access"}
        replace
      />
    );
  }

  if (moduleKey && !superAdminMode && permissions?.[moduleKey]?.[action] !== true) {
    const target = getFirstAccessibleDashboardPath({
      permissions,
      isSuperAdmin: superAdminMode,
    });

    if (!target) {
      return <Navigate to="/dashboard/no-access" replace />;
    }

    if (location.pathname === target) {
      return <Navigate to="/dashboard/no-access" replace />;
    }

    return <Navigate to={target} replace />;
  }

  return children;
}
