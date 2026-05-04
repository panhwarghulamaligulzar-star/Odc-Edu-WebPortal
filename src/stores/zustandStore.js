import { create } from 'zustand';
import { persist } from "zustand/middleware";

const useZustandStore = create(
  persist(
    (set, get) => ({
      token: null,
      adminInfo: null,
      allAdmins:[],
      certifications:0,
      appMinMixView:false,


      setToken: (newToken) => set({ token: newToken }),
      setAdminInfo: (info) => set({ adminInfo: info }),
      getToken: () => get().token,
      getCertifications:(number)=>set({certifications:number}),
      setAppMinMaxWidth:(width)=>set({appMinMixView:width}),

      clearToken: () => set({ token: null, adminInfo: null }),
    }),

    {
      name: "ODC-APP", // ← your app name (localStorage key)
      getStorage: () => localStorage,
    }
  )
);

export default useZustandStore;

