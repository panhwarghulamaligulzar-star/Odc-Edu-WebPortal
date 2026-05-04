import React, { useState } from "react";

import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdSchool,
  MdSettings,
  MdAdminPanelSettings,
  MdAccountBalance,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdOutlineCategory,
  MdReceipt,
  MdSwapHoriz,
  MdMenuBook,
  MdTrendingUp,
  MdFactCheck,
} from "react-icons/md";
import { HiOutlineBookOpen } from "react-icons/hi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { PiStudentThin } from "react-icons/pi";
import { GrAnnounce } from "react-icons/gr";
// import logo from '../assets/images/logos/odc_logo.png';
import logo from "../assets/images/logos/ODC-PNG.jpg";
import useZustandStore from "../stores/zustandStore";

const SideBarManu = () => {
  const { appMinMixView } = useZustandStore();
  const [accountingOpen, setAccountingOpen] = useState(false);
  const navLinks = [
    { icon: MdDashboard, title: "Dashboard", path: "/dashboard" },
    { icon: HiOutlineBookOpen, title: "Courses", path: "/dashboard/courses" },
    {
      icon: LiaChalkboardTeacherSolid,
      title: "Employees",
      path: "/dashboard/teachers",
    },
    { icon: PiStudentThin, title: "Students", path: "/dashboard/students" },
    {
      icon: MdFactCheck,
      title: "Attendance",
      path: "/dashboard/attendance",
    },
    {
      icon: MdSchool,
      title: "Certifications",
      path: "/dashboard/certification",
    },
    // Accounting accordion is rendered inline below
    {
      icon: GrAnnounce,
      title: "Announcements ",
      path: "/dashboard/announcements",
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

  const bottomManu = [
    {
      icon: MdAdminPanelSettings,
      title: "Admin Info",
      path: "/dashboard/settings",
    },
  ];
  return (
    <div className="h-full shadow-lg bg-primary text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 flex justify-center  items-center flex-col gap-[15px]">
        <img
          src={logo}
          alt="ODC Logo"
          className="w-[120px] h-[120px] rounded-full  object-contain"
        />
        {/* <h4 className="h4 text-secondary opacity-55">CMS</h4> */}
      </div>
      <div className="bg-[#0e215fc7] w-full h-[2px] mb-[10px] mt-[-12px]"></div>
      {/* Menu */}
      <nav className="w-full h-full flex flex-col justify-between px-4 my-[10px]">
        {/* TOP MENU */}
        <ul className="space-y-[0px]">
          {navLinks.map((link, index) => (
            <React.Fragment key={index}>
              <li>
                <NavLink
                  to={link.path}
                  end={link.path === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border 
            hover:bg-[#0e215fc7] 
            ${appMinMixView ? "w-[60px]" : "w-full"} 
            ${
              isActive
                ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                : "bg-transparent border-primary"
            }`
                  }
                >
                  <link.icon size={25} />
                  {!appMinMixView && (
                    <span className="text-[14px] text-accent">
                      {link.title}
                    </span>
                  )}
                </NavLink>
              </li>
              {/* Accounting accordion — inserted after Certifications (index 4) */}
              {index === 4 && (
                <li>
                  <button
                    onClick={() => setAccountingOpen((prev) => !prev)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border w-full
                      hover:bg-[#0e215fc7] bg-transparent border-primary`}
                  >
                    <MdAccountBalance size={25} className="text-secondary" />
                    {!appMinMixView && (
                      <>
                        <span className="text-[14px] text-secondary font-semibold flex-1 text-left">
                          Accounting
                        </span>
                        {accountingOpen ? (
                          <MdKeyboardArrowDown
                            size={18}
                            className="text-accent"
                          />
                        ) : (
                          <MdKeyboardArrowRight
                            size={18}
                            className="text-accent"
                          />
                        )}
                      </>
                    )}
                  </button>
                  {accountingOpen && (
                    <ul className="mt-1 space-y-1 pl-3">
                      {accountingLinks.map((aLink, aIndex) => (
                        <li key={aIndex}>
                          <NavLink
                            to={aLink.path}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border
                              hover:bg-[#0e215fc7]
                              ${appMinMixView ? "w-[60px]" : "w-full"}
                              ${
                                isActive
                                  ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                                  : "bg-transparent border-primary"
                              }`
                            }
                          >
                            <aLink.icon size={20} />
                            {!appMinMixView && (
                              <span className="text-[13px] text-accent">
                                {aLink.title}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )}
            </React.Fragment>
          ))}
        </ul>

        {/* BOTTOM MENU */}
        <ul className="space-y-2 mb-4">
          {bottomManu.map((items, index) => (
            <li key={index}>
              <NavLink
                to={items.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border 
            hover:bg-[#0e215fc7] 
            ${appMinMixView ? "w-[60px]" : "w-full"} 
            ${
              isActive
                ? "bg-[#0e215fc7] shadow-md border-[#2b418bc7]"
                : "bg-transparent border-primary"
            }`
                }
              >
                <items.icon size={25} />
                {!appMinMixView && (
                  <span className="text-[14px] text-accent">{items.title}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default SideBarManu;
