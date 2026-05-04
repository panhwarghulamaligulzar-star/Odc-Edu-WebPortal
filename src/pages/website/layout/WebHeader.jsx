import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Twitter, Linkedin, Menu, X } from 'lucide-react';
import logo from "../../../assets/images/logos/new logo.png"
import { NavLink } from 'react-router-dom';

// ============================================================================
// DATA ARRAYS - Configuration for all links and social media
// ============================================================================

// Contact information for top bar
const contactInfo = [
  {
    id: 'email',
    icon: Mail,
    href: 'mailto:askodysseyacademy@gmail.com',
    text: 'askodysseyacademy@gmail.com',
    ariaLabel: 'Email us'
  },
  {
    id: 'phone',
    icon: Phone,
    href: 'tel:+923492425428',
    text: '(+92) 349-2425428',
    ariaLabel: 'Call us'
  }
];

// Location information
const locationData = {
  href: 'https://www.google.com/maps/search/?api=1&query=Yaseen+Khan+Street,+Near+Kanji+Kapra+Market,+Khipro',
  text: 'Yaseen Khan Street, Near Kanji Kapra Market, Khipro',
  ariaLabel: 'View location on map'
};

// Social media links
const socialLinks = [
  {
    id: 'facebook',
    icon: Facebook,
    href: 'https://www.facebook.com/odysseyacad',
    bgColor: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    label: 'Facebook'
  },
  {
    id: 'instagram',
    icon: Instagram,
    href: 'https://instagram.com',
    bgColor: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
    hoverColor: 'hover:opacity-90',
    label: 'Instagram'
  },
  {
    id: 'youtube',
    icon: Youtube,
    href: 'https://www.youtube.com/@odysseyacad',
    bgColor: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    label: 'YouTube'
  },
  {
    id: 'twitter',
    icon: Twitter,
    href: 'https://twitter.com',
    bgColor: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    label: 'Twitter'
  },
  {
    id: 'linkedin',
    icon: Linkedin,
    href: 'https://linkedin.com',
    bgColor: 'bg-blue-700',
    hoverColor: 'hover:bg-blue-800',
    label: 'LinkedIn'
  }
];

// Navigation menu items
const navigationLinks = [
  { id: 'home', label: 'HOME', href: '/' },
  { id: 'about', label: 'About Us', href: '/about-us' },
  { id: 'services', label: 'Services', href: '/services' },
  { id: 'courses', label: 'COURSES', hasDropdown: true },
  { id: 'certifications', label: 'Certifications', href: '/certifications' },
  { id: 'career', label: 'Career', href: '/career-opportunities' },
  { id: 'gallery', label: 'Gallery', href: '/gallery' },
  { id: 'contact', label: 'Contact Us', href: '/contact' }
];

// Courses dropdown items
const coursesDropdown = [
  { id: 'computer', label: 'Computer Courses', href: '/computer-courses' },
  { id: 'vocational', label: 'Vocational Courses', href: '/vocation-course' },
  { id: 'english', label: 'English Language Courses', href: '/english-course' },
  { id: 'coaching', label: 'Coaching Classes', href: '/coaching-course' }
];

// ============================================================================
// MAIN WebHeader COMPONENT
// ============================================================================

const WebHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false); // 🔥 ADDED (Only addition)
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'shadow-2xl top-[-20px]' : ''
    }`}>
      
      {/* TOP BAR */}
      <div className={`bg-primary text-white py-2 px-4 transition-all duration-300 ${
        isScrolled ? 'h-0 py-0 overflow-hidden opacity-0' : 'h-auto opacity-100'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm gap-2">
          <div className="flex justify-start items-center gap-[10px]">
            {contactInfo.map(({ id, icon: Icon, href, text, ariaLabel }) => (
              <a key={id} href={href} className="flex items-center gap-2 hover:underline text-[14px] lg:text-[18px]" aria-label={ariaLabel}>
                <Icon size={16} />
                <span className="text-xs sm:text-sm">{text}</span>
              </a>
            ))}
          </div>

          <div className="flex justify-center items-center text-[14px] lg:text-[18px]">
            <a href={locationData.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline cursor-pointer" aria-label={locationData.ariaLabel}>
              <MapPin size={16} />
              <span className="text-xs sm:text-sm">{locationData.text}</span>
            </a>
          </div>
        </div>
      </div>

      {/* MIDDLE BAR */}
      <header className={`bg-white shadow-sm transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex w-[95%] m-auto lg:w-full lg:flex-row justify-between items-center transition-all duration-300 ${
            isScrolled ? 'gap-2' : 'gap-4'
          }`}>
            
            <NavLink to="/" className="text-center lg:text-left flex gap-[10px] justify-start items-center">
              <img src={logo} alt="Odyssey Academy Logo" className={`transition-all duration-300 ${
                isScrolled ? 'w-[60px] h-[60px] lg:w-[70px] lg:h-[70px]' : 'w-[90px] h-[90px] lg:w-[100px] lg:h-[100px]'
              }`} />

              <div className='mt-[-20px]'>
                <h2 className={`hidden lg:block font-bold text-primary font-Arial transition-all duration-300 ${
                  isScrolled ? 'text-[28px]' : 'text-[40px]'
                }`}>
                  ODYSSEY ACADEMY
                </h2>

                <h6 className={`h5 hidden lg:block ml-[06px] mt-[-10px] transition-all duration-300 ${
                  isScrolled ? '!text-[14px]' : '!text-[18px]'
                }`}>
                  institute of Technical & Vocational Education
                </h6>
              </div>
            </NavLink>

            <div className={`flex-col items-start justify-start gap-4 transition-all duration-300 ${
              isScrolled ? 'hidden' : 'flex'
            }`}>
              <span className="text-gray-700 font-medium font-Arial">Follow Us:</span>
              <div className="flex items-center gap-3">
                {socialLinks.map(({ id, icon: Icon, href, bgColor, hoverColor, label }) => (
                  <a key={id} href={href} target="_blank" rel="noopener noreferrer" className={`w-9 h-9 flex items-center justify-center rounded-full ${bgColor} text-white ${hoverColor} transition-colors`} aria-label={label}>
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* NAVIGATION */}
      <nav className="bg-primary text-white shadow-lg relative">
        <div className="max-w-7xl mx-auto">

          {/* Mobile Toggle */}
          <div className="lg:hidden flex justify-between items-center px-4 py-3">
            <span className="font-medium">MENU</span>
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-white focus:outline-none" aria-label="Toggle menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex flex-wrap justify-center lg:justify-start">
            {navigationLinks.map(({ id, label, href, hasDropdown }) => (
              <li key={id} className="relative" onMouseEnter={() => hasDropdown && setDropdownOpen(id)} onMouseLeave={() => setDropdownOpen(null)}>
                
                {hasDropdown ? (
                  <div className="block px-4 py-3 text-sm font-medium uppercase cursor-pointer hover:bg-[#0e215fc7] transition-colors">
                    {label}
                  </div>
                ) : (
                  <NavLink
                    to={href}
                    className={({ isActive }) =>
                      `block px-4 py-3 text-sm font-medium uppercase transition-colors hover:bg-[#0e215fc7] ${
                        isActive ? 'border-b-4 border-white bg-[#0e215fc7]' : ''
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                )}

                {hasDropdown && dropdownOpen === id && (
                  <div className="absolute top-full left-0 bg-white shadow-lg rounded-md py-2 min-w-[200px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {coursesDropdown.map((course) => (
                      <NavLink
                        key={course.id}
                        to={course.href}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary transition-colors ${
                            isActive ? 'bg-blue-50 text-primary font-semibold' : ''
                          }`
                        }
                        onClick={() => setDropdownOpen(null)}
                      >
                        {course.label}
                      </NavLink>
                    ))}
                  </div>
                )}

              </li>
            ))}
          </ul>

          {/* MOBILE MENU WITH DROPDOWN FIXED */}
          {menuOpen && (
            <ul className="lg:hidden bg-blue-600 border-t border-blue-500">

              {navigationLinks.map(({ id, label, href, hasDropdown }) => (
                <li key={id} className="border-b border-blue-500">

                  {/* MOBILE COURSES DROPDOWN */}
                  {hasDropdown ? (
                    <>
                      <div
                        onClick={() => setMobileCoursesOpen(!mobileCoursesOpen)}
                        className="flex justify-between items-center px-4 py-3 text-sm font-medium uppercase hover:bg-blue-700 cursor-pointer"
                      >
                        {label}
                        <span>{mobileCoursesOpen ? "▲" : "▼"}</span>
                      </div>

                      {mobileCoursesOpen && (
                        <ul className="bg-blue-700">
                          {coursesDropdown.map((course) => (
                            <li key={course.id}>
                              <NavLink
                                to={course.href}
                                className="block px-6 py-2 text-sm hover:bg-blue-800"
                                onClick={() => setMenuOpen(false)}
                              >
                                {course.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (

                    /* MOBILE CAREER LINK FIX */
                    <NavLink
                      to={href}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm font-medium uppercase hover:bg-blue-700 ${
                          isActive ? 'bg-blue-700 border-l-4 border-white' : ''
                        }`
                      }
                      onClick={() => setMenuOpen(false)}
                    >
                      {label}
                    </NavLink>
                  )}

                </li>
              ))}

            </ul>
          )}

        </div>
      </nav>

    </div>
  );
};

export default WebHeader;
