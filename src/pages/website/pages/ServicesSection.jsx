import React, { useEffect } from 'react';
import { FaCode, FaDatabase, FaPalette, FaFileInvoiceDollar, FaCalendarAlt, FaClipboardCheck } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import BannerSection from './BannerSection';

const ServicesSection = () => {
  const { pathname } = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Determine if it's the standalone Services page
  const isServicesPage = pathname === "/services";
  const pageTitle = isServicesPage ? "Services" : "Home";
  const isHome = pageTitle === "Home";

  // Background theme
  const bgClass = isHome
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-white";

  // Text colors
  const headingText = isHome ? "text-white" : "text-gray-900";
  const subtitleText = isHome ? "text-white/70" : "text-gray-600";

  // Box theme
  const boxTheme = isHome
    ? "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
    : "bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-200";

  // Icon color
  const iconColor = isHome ? "text-white" : "text-primary";

  const services = [
    {
      icon: <FaCode />,
      title: "Web Designing",
      description:
        "Modern, responsive, and user-friendly websites that work perfectly across devices.",
    },
    {
      icon: <FaDatabase />,
      title: "Data Entry",
      description:
        "Fast, reliable, and confidential data entry services for business, education, and personal needs.",
    },
    {
      icon: <FaPalette />,
      title: "Graphic Designing",
      description:
        "Professional logos, flyers, brochures, branding materials, and creative advertisements.",
    },
    {
      icon: <FaFileInvoiceDollar />,
      title: "Filing of Returns",
      description:
        "Accurate filing of income tax returns, sales tax returns, and official documents.",
    },
    {
      icon: <FaCalendarAlt />,
      title: "Event Management",
      description:
        "We organize and manage events, workshops, trainings, and celebrations professionally.",
    },
    {
      icon: <FaClipboardCheck />,
      title: "Testing Services",
      description:
        "Transparent and reliable educational, recruitment, and skill assessment testing.",
    },
  ];

  return (
    <>
      {/* Banner Only for Services Page */}
      {isServicesPage && (
        <BannerSection
          tag="Services"
          title="Discover Our Professional Services"
          description="Explore the high-quality educational, training, and professional services offered by Odyssey Academy to empower students and organizations."
          highlightText="Our Services"
        />
      )}

      <div className={`w-full h-full py-[100px] ${bgClass}`}>
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${headingText}`}>
              Our Services
            </h1>
            <p className={`text-lg md:text-xl max-w-4xl mx-auto leading-relaxed ${subtitleText}`}>
              We offer high-quality educational, training, and professional services
              to empower students, individuals, and organizations for real success.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className={`${boxTheme} rounded-md p-8 shadow-md transition-all duration-300 transform hover:-translate-y-2`}
              >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div
                    className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl ${iconColor}`}
                  >
                    {service.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-2xl font-bold text-center mb-4 ${headingText}`}>
                  {service.title}
                </h3>

                {/* Description */}
                <p className={`text-center leading-relaxed ${subtitleText}`}>
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ServicesSection;