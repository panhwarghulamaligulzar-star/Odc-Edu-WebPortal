import { RBAC_ACTIONS, RBAC_MODULES } from "./rbacConstants.js";

export const createEmptyActions = () =>
  ({
    ...RBAC_ACTIONS.reduce((acc, action) => {
      acc[action] = false;
      return acc;
    }, {}),
    studentAttendance: false,
    teacherAttendance: false,
  });

export const createFullActions = () =>
  ({
    ...RBAC_ACTIONS.reduce((acc, action) => {
      acc[action] = true;
      return acc;
    }, {}),
    studentAttendance: true,
    teacherAttendance: true,
  });

export const createFullPermissionsMap = () =>
  RBAC_MODULES.reduce((acc, moduleKey) => {
    acc[moduleKey] = createFullActions();
    return acc;
  }, {});

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === "function") {
    return value.toObject();
  }
  return { ...value };
};

export const normalizePermissions = (permissions = []) =>
  RBAC_MODULES.map((moduleKey) => {
    const existing = permissions.find((item) => item?.module === moduleKey);
    const plainActions = toPlainObject(existing?.actions);
    const actions = {
      ...createEmptyActions(),
      ...plainActions,
    };
    if (moduleKey === "attendance" && plainActions.view === true) {
      if (typeof plainActions.studentAttendance !== "boolean") {
        actions.studentAttendance = true;
      }
      if (typeof plainActions.teacherAttendance !== "boolean") {
        actions.teacherAttendance = true;
      }
    }
    return { module: moduleKey, actions };
  });
