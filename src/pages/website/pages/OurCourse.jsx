import React from 'react';
import { BookOpen, Briefcase, Globe, GraduationCap } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const CourseCard = ({ icon: Icon, title, description, image, gradient, link:link }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full">
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden flex-shrink-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Icon Overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed mb-6 flex-grow">
          {description}
        </p>
        
        {/* Button */}
        <NavLink to={link}>
        <button className="relative w-full py-3 px-6 bg-primary text-white font-semibold rounded-xl overflow-hidden group/btn transition-all duration-300 hover:shadow-lg">
          <span className="relative z-10 flex items-center justify-center gap-2">
            READ MORE
            <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <div className="absolute inset-0 bg-blue-900 transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300 origin-left"></div>
        </button>
        </NavLink>
      </div>
      
      {/* Decorative Element */}
      <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradient} rounded-full opacity-0 group-hover:opacity-20 transition-all duration-700 group-hover:scale-150`}></div>
    </div>
  );
};

export default function CoursesSection() {
  const courses = [
    {
      icon: BookOpen,
      title: "Computer Courses",
      description: "Empowering students with Advanced digital skills through practical and career oriented IT training programs.",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80",
      gradient: "from-blue-500 to-cyan-500",
      link:"/computer-courses",
    },
    {
      icon: Briefcase,
      title: "Vocational Courses",
      description: "Equipping learners with hands on professional skills to build independence and earn through creativity and craftsmanship.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
      gradient: "from-purple-500 to-pink-500",
      link:"/vocation-course",
   
    },
    {
      icon: Globe,
      title: "English Language Course",
      description: "Enhancing communication, confidence, and fluency through interactive English learning sessions for all levels.",
      image: "https://media.istockphoto.com/id/185158084/photo/young-male-student-holding-folders-and-smiling.jpg?s=612x612&w=0&k=20&c=W9jiLdwP6-kDWl6LgAyrzgl4JPATvOgsi8VuS4__pDU=",
      gradient: "from-orange-500 to-red-500",
       link:"/english-course",
    
    },
    {
      icon: GraduationCap,
      title: "Coaching Classes",
      description: "Providing quality education and expert guidance from Grade 1 to Intermediate to help students achieve academic excellence.",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
      gradient: "from-green-500 to-teal-500",
      link:"/coaching-course",
    }
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fadeIn">
          <h1 className="text-4xl font-bold font-Arial text-primary">
            Our Popular Courses
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive and market oriented programs designed to build knowledge, confidence, and skills.
          </p>
          <div className="mt-6 h-1 w-24 bg- bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {courses.map((course, index) => (
            <div 
              key={index}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <CourseCard {...course} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}