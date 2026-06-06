import { useEffect, useRef, useState } from 'react';
import { FaSearch, FaUser, FaSignOutAlt, FaCog, FaBars, FaTimes } from 'react-icons/fa';
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

// Helper function to get correct profile image source
const getProfileImageSrc = (profile) => {
  if (!profile) {
    return "/dummy-user.png";
  } else if (profile.startsWith('http') || profile.startsWith('https')) {
    // It's a URL, use it directly
    return profile;
  } else {
    // It's base64 data, prefix with data URI
    return `data:image/png;base64,${profile}`;
  }
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
            >
             <div
              className="btn-md-cricle cursor-pointer"
              onClick={() => setDropdownOpen((prev) => !prev)}
             >
            <img
              src={getProfileImageSrc(adminInfo?.userData?.profile)}
              alt="profile"
              className="w-12 h-12 rounded-full object-cover border border-gray-300 shadow-sm"
            />
          </div>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="px-4 py-2 text-gray-700 font-medium  flex justify-start items-center "><FaSignOutAlt className="mr-2" /><span>{adminInfo?.userData?.name}</span></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FaSignOutAlt className="mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>


          </div>
        </header>
    </div>
  )
}

export default AppHeader;
