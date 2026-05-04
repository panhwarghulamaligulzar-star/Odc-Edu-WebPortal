import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import SideBarManu from "./SideBarManu";
import AppHeader from "./AppHeader";
import useZustandStore from "../stores/zustandStore";

const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { appMinMixView } = useZustandStore();
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-gray-100 flex">
      {/* Sidebar */}
      <div
        className={` hidden lg:block transition-all duration-300 ${appMinMixView ? "w-[100px]" : "w-[300px]"}`}
      >
        <SideBarManu isCollapsed={isSidebarCollapsed} />
      </div>
      {/* Main Content */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <AppHeader
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
        {/* Content — the ONE scroll container for the whole app */}
        <div className="flex-1 min-h-0 p-6 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
