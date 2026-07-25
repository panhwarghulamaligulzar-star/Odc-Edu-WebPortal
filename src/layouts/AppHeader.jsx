import { useEffect, useRef, useState } from 'react';
import { FaSearch, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { NavLink, useNavigate } from 'react-router-dom';
import useZustandStore from '../stores/zustandStore';
import { TbArrowsMaximize } from "react-icons/tb";


const AppHeader = ({ isSidebarCollapsed, toggleSidebar }) => {
const [dropdownOpen, setDropdownOpen] = useState(false);
const profileMenuRef = useRef(null);
const navigate = useNavigate()

  const {adminInfo,setAppMinMaxWidth,appMinMixView,isSuperAdmin}=useZustandStore();
const handleLogout = () => {
  setDropdownOpen(false);
  const { clearToken, } = useZustandStore.getState();
  clearToken();
  localStorage.clear();
  navigate("/login", { replace: true });
};

const getProfileImageSrc = (profile) => {
  const rawProfile = String(profile || "").trim();

  if (!rawProfile) {
    return null;
  }

  if (
    rawProfile.startsWith("http://") ||
    rawProfile.startsWith("https://") ||
    rawProfile.startsWith("data:image")
  ) {
    return rawProfile;
  }

  return `data:image/png;base64,${rawProfile}`;
};

const getUserInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "NA";
  }

  const first = parts[0]?.[0] || "";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || "";

  return `${first}${last}`.toUpperCase();
};

useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      profileMenuRef.current &&
      !profileMenuRef.current.contains(event.target)
    ) {
      setDropdownOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

const profileImageSrc = getProfileImageSrc(adminInfo?.userData?.profile);
const profileInitials = getUserInitials(adminInfo?.userData?.name);


  return (
    <div>
       <header className="bg-[#ffff]  p-4 flex justify-between items-center border-b border-[#D1D6D4]">
          {/* Left: Search Bar */}
          <div className='w-full flex gap-[12px]  justify-start items-center'>
            <button onClick={()=>setAppMinMaxWidth(!appMinMixView)} className='w-[40px] h-[40px]  bg-light border border-[#D1D6D4] rounded-md flex justify-center items-center'>
              <span><TbArrowsMaximize />
            </span>
            </button>
          
          <div className="flex items-center form-input !h-[42px] px-3 py-2 w-1/3">
            <FaSearch className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none flex-1 text-gray-700"
            />
          </div>
           </div>
          {/* Right: User Profile */}
          <div className="relative flex gap-[10px] ">
            <NavLink to={isSuperAdmin ? "/dashboard/app-settings" : "/dashboard/settings"}>
             <div
              className="btn-md-cricle cursor-pointer" >
              <FaCog className="text-gray-700 text-xl" />
            </div>
            </NavLink>
            <div
              className="relative"
              ref={profileMenuRef}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
             <button
              type="button"
              className="btn-md-cricle cursor-pointer overflow-hidden"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="Open profile menu"
            >
              {profileImageSrc ? (
                <img
                  src={profileImageSrc}
                  alt={adminInfo?.userData?.name || "profile"}
                  className="w-12 h-12 rounded-full object-cover border border-gray-300 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border border-gray-300 shadow-sm bg-[#01134C] text-white flex items-center justify-center font-semibold text-sm">
                  {profileInitials}
                </div>
              )}
            </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full pt-2 z-50">
                  <div className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-gray-700 font-medium border-b border-gray-100">
                      <div className="text-sm font-semibold truncate">
                        {adminInfo?.userData?.name || "Profile"}
                      </div>
                    </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FaSignOutAlt className="mr-2" />
                    Logout
                  </button>
                </div>
                </div>
              )}
            </div>


          </div>
        </header>
    </div>
  )
}

export default AppHeader;
