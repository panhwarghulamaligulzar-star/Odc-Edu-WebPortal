import { usePermission } from "../hooks/usePermissions";

const PermissionGuard = ({
  moduleKey,
  action = "view",
  children,
  fallback = null,
}) => {
  const allowed = usePermission(moduleKey, action);
  return allowed ? children : fallback;
};

export default PermissionGuard;
