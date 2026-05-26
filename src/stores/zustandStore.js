import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createPermissionTemplate,
  normalizePermissionTemplate,
} from "../config/rbac";

const initialPermissions = createPermissionTemplate();

const useZustandStore = create(
  persist(
    (set, get) => ({
      token: null,
      adminInfo: null,
      permissions: initialPermissions,
      isSuperAdmin: false,
      appSettings: null,
      allAdmins: [],
      certifications: 0,
      appMinMixView: false,

      setToken: (newToken) => set({ token: newToken }),
      setAuthSession: ({ token, userData }) =>
        set({
          token: token || null,
          adminInfo: userData
            ? {
                status: 200,
                message: "User account information",
                userData,
              }
            : null,
          permissions: normalizePermissionTemplate(userData?.permissions),
          isSuperAdmin: userData?.isSuperAdmin === true,
        }),
      setAdminInfo: (info) =>
        set({
          adminInfo: info,
          permissions: normalizePermissionTemplate(info?.userData?.permissions),
          isSuperAdmin: info?.userData?.isSuperAdmin === true,
        }),
      setPermissions: (permissions) =>
        set({ permissions: normalizePermissionTemplate(permissions) }),
      setIsSuperAdmin: (isSuperAdmin) =>
        set({ isSuperAdmin: isSuperAdmin === true }),
      setAppSettings: (appSettings) => set({ appSettings }),
      getToken: () => get().token,
      getCertifications: (number) => set({ certifications: number }),
      setAppMinMaxWidth: (width) => set({ appMinMixView: width }),
      clearToken: () =>
        set({
          token: null,
          adminInfo: null,
          permissions: createPermissionTemplate(),
          isSuperAdmin: false,
          appSettings: null,
        }),
    }),
    {
      name: "ODC-APP",
      getStorage: () => localStorage,
      version: 2,
    },
  ),
);

export default useZustandStore;
