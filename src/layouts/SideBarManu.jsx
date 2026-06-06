import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  MdAccountBalance,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdMenuBook,
  MdOutlineManageAccounts,
  MdOutlineCategory,
  MdOutlineSecurity,
  MdOutlineTune,
  MdReceipt,
  MdSettings,
  MdSwapHoriz,
  MdTrendingUp,
} from "react-icons/md";
import useZustandStore from "../stores/zustandStore";
import { DASHBOARD_MODULE_LINKS } from "../config/rbac";
import { getSidebarLogo } from "../utils/branding";

const SideBarManu = () => {
  const { appMinMixView, permissions, isSuperAdmin, adminInfo, appSettings } = useZustandStore();
  const [accountingOpen, setAccountingOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(true);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const location = useLocation();
  const superAdminMode =
    isSuperAdmin === true || adminInfo?.userData?.isSuperAdmin === true;
  const currentSection = new URLSearchParams(location.search).get("section") || "roles";
  const isSuperAdminSectionActive =
    (location.pathname === "/dashboard/super-admin" && currentSection !== "overview") ||
    location.pathname === "/dashboard/app-settings";
  const isStudentsSectionActive = location.pathname.startsWith("/dashboard/students");

  const navLinks = useMemo(
    () => {
      const links = DASHBOARD_MODULE_LINKS.filter(
        (item) =>
          item.key !== "students" &&
          item.key !== "accounting" &&
          item.key !== "super-admin" &&
          item.key !== "app-settings",
      );

      if (superAdminMode) {
        return links
          .filter((item) => item.key === "dashboard")
          .map((item) => ({
            ...item,
            path: "/dashboard/super-admin?section=overview",
          }));
      }

      return links.filter((item) => {
        if (item.superAdminOnly) return superAdminMode;
        return permissions?.[item.key]?.view === true;
      });
    },
    [superAdminMode, permissions],
  );

  useEffect(() => {
    if (isStudentsSectionActive) {
      setStudentsOpen(true);
    }
  }, [isStudentsSectionActive]);

  const showAccounting = !superAdminMode && permissions?.accounting?.view === true;
  const showStudents = !superAdminMode && permissions?.students?.view === true;
  const studentModuleLink = DASHBOARD_MODULE_LINKS.find((item) => item.key === "students");
  const StudentIcon = studentModuleLink?.icon;

  const studentLinks = [
    {
      title: "All Students",
      path: "/dashboard/students/all",
    },
    {
      title: "Enroll Students",
      path: "/dashboard/students/enrolled",
    },
  ];

  const accountingLinks = [
    {
      icon: MdOutlineCategory,
      title: "Heads of Account",
      path: "/dashboard/accounting/heads",
    },
    {
      icon: MdAccountBalance,
      title: "Banks & Cash",
      path: "/dashboard/accounting/banks",
    },
    {
      icon: MdReceipt,
      title: "Receipt",
      path: "/dashboard/accounting/receipt",
    },
    {
      icon: MdReceipt,
      title: "Transactions",
      path: "/dashboard/accounting/transactions",
    },
    {
      icon: MdSwapHoriz,
      title: "Fund Transfer",
      path: "/dashboard/accounting/fund-transfer",
    },
    {
      icon: MdMenuBook,
      title: "Ledger",
      path: "/dashboard/accounting/ledger",
    },
    {
      icon: MdTrendingUp,
      title: "Profit & Loss",
      path: "/dashboard/accounting/profit-loss",
    },
  ];

  const superAdminLinks = [
    {
      key: "roles",
      title: "Roles & Users",
      path: "/dashboard/super-admin?section=roles",
      icon: MdOutlineManageAccounts,
    },
    {
      key: "permissions",
      title: "Permissions",
      path: "/dashboard/super-admin?section=permissions",
      icon: MdOutlineTune,
    },
    {
      key: "finance",
      title: "Finance Monitor",
      path: "/dashboard/super-admin?section=finance",
      icon: MdAccountBalance,
    },
  ];

  const renderStudentsSection = () => {
    if (!showStudents) return null;

    return (
      <li className="mb-1">
        {appMinMixView ? (
          <NavLink
            to="/dashboard/students/all"
            className={({ isActive: navIsActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border hover:bg-[#0e215fc7] w-[60px] ${
                navIsActive || isStudentsSectionActive
                  ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                  : "bg-transparent border-primary"
              }`
            }
          >
            {StudentIcon ? <StudentIcon size={22} /> : null}
          </NavLink>
        ) : (
          <>
            <button
              onClick={() => setStudentsOpen((prev) => !prev)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border w-full hover:bg-[#0e215fc7] ${
                isStudentsSectionActive
                  ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                  : "bg-transparent border-primary"
              }`}
            >
              {StudentIcon ? <StudentIcon size={22} className="text-accent shrink-0" /> : null}
              <span className="text-[14px] text-accent font-semibold flex-1 text-left">
                Students
              </span>
              {studentsOpen ? (
                <MdKeyboardArrowDown size={18} className="text-accent" />
              ) : (
                <MdKeyboardArrowRight size={18} className="text-accent" />
              )}
            </button>

            {studentsOpen && (
              <ul className="mt-2 space-y-1 pl-4">
                {studentLinks.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border ${
                          navIsActive
                            ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                            : "bg-transparent border-primary hover:bg-[#0e215fc7]"
                        }`
                      }
                    >
                      <span className="text-[13px] text-accent">{item.title}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="h-full shadow-lg bg-primary text-white flex flex-col">
      <div className="p-6 flex justify-center items-center flex-col gap-[15px]">
        <img
          src={getSidebarLogo(appSettings)}
          alt="ODC Logo"
          className="w-[120px] h-[120px] rounded-full object-contain"
        />
      </div>
      <div className="bg-[#0e215fc7] w-full h-[2px] mb-[10px] mt-[-12px]" />
      <nav className="w-full h-full flex flex-col px-4 my-[10px] overflow-y-auto">
        <ul className="space-y-[0px]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isSuperAdminDashboardLink =
              superAdminMode && link.key === "dashboard";
            const isActive = isSuperAdminDashboardLink
              ? location.pathname === "/dashboard/super-admin" &&
                currentSection === "overview"
              : undefined;

            return (
              <React.Fragment key={link.key}>
                <li>
                  {isSuperAdminDashboardLink ? (
                    <Link
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border hover:bg-[#0e215fc7] ${
                        appMinMixView ? "w-[60px]" : "w-full"
                      } ${
                        isActive
                          ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                          : "bg-transparent border-primary"
                      }`}
                    >
                      <Icon size={22} />
                      {!appMinMixView && (
                        <span className="text-[14px] text-accent">{link.label}</span>
                      )}
                    </Link>
                  ) : (
                    <NavLink
                      to={link.path}
                      end={link.path === "/dashboard"}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border hover:bg-[#0e215fc7] ${
                          appMinMixView ? "w-[60px]" : "w-full"
                        } ${
                          navIsActive
                            ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                            : "bg-transparent border-primary"
                        }`
                      }
                    >
                      <Icon size={22} />
                      {!appMinMixView && (
                        <span className="text-[14px] text-accent">{link.label}</span>
                      )}
                    </NavLink>
                  )}
                </li>
                {link.key === "employees" && renderStudentsSection()}
              </React.Fragment>
            );
          })}

          {superAdminMode && (
            <li className="mb-2 mt-2">
              <button
                onClick={() => setSuperAdminOpen((prev) => !prev)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border w-full hover:bg-[#0e215fc7] ${
                  isSuperAdminSectionActive
                    ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                    : "bg-transparent border-primary"
                }`}
              >
                <MdOutlineSecurity size={23} className="text-accent shrink-0" />
                {!appMinMixView && (
                  <>
                    <span className="text-[14px] text-accent font-semibold flex-1 text-left">
                      Roles & Permissions
                    </span>
                    {superAdminOpen ? (
                      <MdKeyboardArrowDown size={18} className="text-accent" />
                    ) : (
                      <MdKeyboardArrowRight size={18} className="text-accent" />
                    )}
                  </>
                )}
              </button>

              {superAdminOpen && !appMinMixView && (
                <ul className="mt-2 space-y-1 pl-4">
                  {superAdminLinks.map((item) => {
                    const active =
                      item.key === "app-settings"
                        ? location.pathname === "/dashboard/app-settings"
                        : location.pathname === "/dashboard/super-admin" &&
                          currentSection === item.key;
                    const ItemIcon = item.icon;

                    return (
                      <li key={item.key}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border ${
                            active
                              ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                              : "bg-transparent border-primary hover:bg-[#0e215fc7]"
                          }`}
                        >
                          <ItemIcon size={18} className="text-accent shrink-0" />
                          <span className="text-[13px] text-accent">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}

          {showAccounting && (
            <li>
              <button
                onClick={() => setAccountingOpen((prev) => !prev)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border w-full hover:bg-[#0e215fc7] bg-transparent border-primary"
              >
                <MdAccountBalance size={25} className="text-secondary" />
                {!appMinMixView && (
                  <>
                    <span className="text-[14px] text-secondary font-semibold flex-1 text-left">
                      Accounting
                    </span>
                    {accountingOpen ? (
                      <MdKeyboardArrowDown size={18} className="text-accent" />
                    ) : (
                      <MdKeyboardArrowRight size={18} className="text-accent" />
                    )}
                  </>
                )}
              </button>
              {accountingOpen && (
                <ul className="mt-1 space-y-1 pl-3">
                  {accountingLinks.map((aLink) => (
                    <li key={aLink.path}>
                      <NavLink
                        to={aLink.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border hover:bg-[#0e215fc7] ${
                            appMinMixView ? "w-[60px]" : "w-full"
                          } ${
                            isActive
                              ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                              : "bg-transparent border-primary"
                          }`
                        }
                      >
                        <aLink.icon size={20} />
                        {!appMinMixView && (
                          <span className="text-[13px] text-accent">{aLink.title}</span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>

        {superAdminMode && !appMinMixView && (
          <div className="mt-auto pt-4">
            <Link
              to="/dashboard/app-settings"
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border ${
                location.pathname === "/dashboard/app-settings"
                  ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                  : "bg-transparent border-primary hover:bg-[#0e215fc7]"
              }`}
            >
              <MdSettings size={18} className="text-accent shrink-0" />
              <span className="text-[13px] text-accent">App Settings</span>
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

export default SideBarManu;
