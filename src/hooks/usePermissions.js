import useZustandStore from "../stores/zustandStore";
import {
  DASHBOARD_MODULE_LINKS,
  RBAC_ACTIONS,
  getFirstAccessibleDashboardPath,
} from "../config/rbac";

const FULL_ACCESS_PERMISSIONS = Object.freeze(
  RBAC_ACTIONS.reduce((acc, action) => {
    acc[action] = true;
    return acc;
  }, {}),
);

const EMPTY_PERMISSIONS = Object.freeze({});

export const usePermission = (moduleKey, action = "view") => {
  return useZustandStore((state) => {
    if (state.isSuperAdmin || state.adminInfo?.userData?.isSuperAdmin === true) {
      return true;
    }
    return state.permissions?.[moduleKey]?.[action] ?? false;
  });
};

export const useModuleAccess = (moduleKey) => {
  return usePermission(moduleKey, "view");
};

export const useModulePermissions = (moduleKey) => {
  return useZustandStore((state) => {
    if (state.isSuperAdmin || state.adminInfo?.userData?.isSuperAdmin === true) {
      return FULL_ACCESS_PERMISSIONS;
    }

    return state.permissions?.[moduleKey] || EMPTY_PERMISSIONS;
  });
};

export const useAccessibleDashboardLinks = () => {
  return useZustandStore((state) =>
    DASHBOARD_MODULE_LINKS.filter((item) => {
      if (item.superAdminOnly) return state.isSuperAdmin;
      return state.isSuperAdmin || state.permissions?.[item.key]?.view;
    }),
  );
};

export const useFirstAccessibleDashboardPath = () => {
  return useZustandStore((state) =>
    getFirstAccessibleDashboardPath({
      permissions: state.permissions,
      isSuperAdmin: state.isSuperAdmin,
    }),
  );
};
