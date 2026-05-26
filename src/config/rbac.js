import {
  Award,
  BookOpen,
  CalendarCheck,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export const RBAC_MODULES = [
  "dashboard",
  "courses",
  "employees",
  "students",
  "attendance",
  "accounting",
  "certifications",
  "announcements",
];

export const RBAC_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "import",
  "export",
  "print",
  "approve",
];

export const createEmptyPermissionSet = () =>
  RBAC_ACTIONS.reduce((acc, action) => {
    acc[action] = false;
    return acc;
  }, {});

export const createPermissionTemplate = () =>
  RBAC_MODULES.reduce((acc, moduleKey) => {
    acc[moduleKey] = createEmptyPermissionSet();
    return acc;
  }, {});

export const normalizePermissionTemplate = (permissions = {}) => {
  const template = createPermissionTemplate();

  RBAC_MODULES.forEach((moduleKey) => {
    template[moduleKey] = {
      ...createEmptyPermissionSet(),
      ...(permissions?.[moduleKey] || {}),
    };
  });

  return template;
};

export const DASHBOARD_MODULE_LINKS = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "courses",
    label: "Courses",
    path: "/dashboard/courses",
    icon: BookOpen,
  },
  {
    key: "employees",
    label: "Employees",
    path: "/dashboard/teachers",
    icon: Users,
  },
  {
    key: "students",
    label: "Students",
    path: "/dashboard/students",
    icon: GraduationCap,
  },
  {
    key: "attendance",
    label: "Attendance",
    path: "/dashboard/attendance",
    icon: CalendarCheck,
  },
  {
    key: "accounting",
    label: "Accounting",
    path: "/dashboard/accounting/heads",
    icon: DollarSign,
  },
  {
    key: "certifications",
    label: "Certifications",
    path: "/dashboard/certification",
    icon: Award,
  },
  {
    key: "announcements",
    label: "Announcements",
    path: "/dashboard/announcements",
    icon: Megaphone,
  },
  {
    key: "super-admin",
    label: "Roles & Permissions",
    path: "/dashboard/super-admin",
    icon: ShieldCheck,
    superAdminOnly: true,
  },
  {
    key: "app-settings",
    label: "App Settings",
    path: "/dashboard/app-settings",
    icon: Settings,
    superAdminOnly: true,
  },
];

export const getFirstAccessibleDashboardPath = ({
  permissions = {},
  isSuperAdmin = false,
}) => {
  if (isSuperAdmin) {
    return "/dashboard/super-admin?section=overview";
  }

  const match = DASHBOARD_MODULE_LINKS.find((item) => {
    if (item.superAdminOnly) {
      return isSuperAdmin;
    }
    return isSuperAdmin || permissions?.[item.key]?.view;
  });

  return match?.path || null;
};
