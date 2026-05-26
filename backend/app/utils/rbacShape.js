import { RBAC_ACTIONS, RBAC_MODULES } from "./rbacConstants.js";

export const createEmptyActions = () =>
  RBAC_ACTIONS.reduce((acc, action) => {
    acc[action] = false;
    return acc;
  }, {});

export const createFullActions = () =>
  RBAC_ACTIONS.reduce((acc, action) => {
    acc[action] = true;
    return acc;
  }, {});

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
    return {
      module: moduleKey,
      actions: {
        ...createEmptyActions(),
        ...plainActions,
      },
    };
  });
