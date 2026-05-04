import React from 'react';
import { Award, Briefcase, UserCheck, TrendingUp } from 'lucide-react';
import BannerSection from './BannerSection';


const ServicesPage = () => {
  // Services data array - Add/edit services here for easy updates
  const servicesData = [
    {
      id: 1,
      icon: Award,
      title: "Scholarships",
      tagline: "Unlock Your Academic Potential",
      description: "We offer scholarships across various courses to support needy and deserving students, making quality education accessible for everyone.",
      bgColor: "bg-blue-500",
      hoverColor: "hover:bg-blue-600"
    },
    {
      id: 2,
      icon: Briefcase,
      title: "Internships",
      tagline: "Real World Experience Starts Here",
      description: "Internship opportunities are available for students who complete their courses with outstanding performance, giving them a head start in their career.",
      bgColor: "bg-blue-400",
      hoverColor: "hover:bg-blue-500"
    },
    {
      id: 3,
      icon: UserCheck,
      title: "Job Placement",
      tagline: "Step Confidently Into Your Career",
      description: "Students who successfully complete their internship are placed in jobs or referred to leading organizations, ensuring a smooth transition into the workforce.",
      bgColor: "bg-blue-300",
      hoverColor: "hover:bg-blue-400"
    },
    {
      id: 4,
      icon: TrendingUp,
      title: "Business Support",
      tagline: "Empowering Future Entrepreneurs",
      description: "We encourage and support students in starting their own business after acquiring essential skills, helping them turn their ideas into reality.",
      bgColor: "bg-blue-500",
      hoverColor: "hover:bg-blue-600"
    }
  ];

  return (
    <>
     

      {/* Services Section Container - Positioned with negative margin to overlap hero */}
      <div className="max-w-7xl mx-auto px-4 mt-[70px] relative z-10 mb-[100px]">
         <div className="w-full flex justify-center items-center pb-[30px]">
            <div className="text-center">
              <h1 className="text-4xl font-bold font-Arial text-primary">Our Key Features</h1>
              <p className="text-lg sm:text-xl text-primary opacity-45">
                Where Modern Education Meets Practical Experience
              </p>
            </div>
          </div>
      {/* Grid Layout - Responsive columns based on screen size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
        {/* Map through services array to render each card */}
        {servicesData.map((service) => {
          const IconComponent = service.icon;
          
          return (
            <div
              key={service.id}
              className={`${service.bgColor} ${service.hoverColor} text-white p-6 lg:p-8 text-center transition-colors`}
            >
              {/* Icon Container */}
              <div className="flex justify-center mb-4">
                <IconComponent size={48} strokeWidth={1.5} />
              </div>
              
              {/* Service Title */}
              <h3 className="text-lg lg:text-xl font-bold mb-3">
                {service.title}
              </h3>
              
              {/* Service Tagline */}
              <p className="text-xs lg:text-sm leading-relaxed mb-2 font-semibold">
                {service.tagline}
              </p>
              
              {/* Service Description */}
              <p className="text-xs lg:text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  </>
  );
};

export default ServicesPage;