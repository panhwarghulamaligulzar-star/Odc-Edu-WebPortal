 import React, { useEffect } from 'react'
import BannerSection from './BannerSection';
 
 const CompCourse = () => {
  

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const courses = [
  {
    title: "Diploma in Information Technology (DIT)",
    duration: "1 Year",
    fee: "Rs. 52,000",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
  },
  {
    title: "Certificate in Information Technology (CIT)",
    duration: "6 Months",
    fee: "Rs. 13,500",
    image: "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=800&q=80"
  },
  {
    title: "Computerized Accounting",
    duration: "3 Months",
    fee: "Rs. 7,500",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80"
  },
  {
    title: "Web Designing",
    duration: "4 Months",
    fee: "Rs. 26,500",
    image: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&q=80"
  },
  {
    title: "MS Office",
    duration: "3 Months",
    fee: "Rs. 7,500",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80"
  },
  {
    title: "Graphic Designing",
    duration: "4 Months",
    fee: "Rs. 7,500",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80"
  }
];


  return (

   <>
    <BannerSection
  tag="Our Courses"
  title="Your Journey to IT Excellence Starts Here"
  description="Choose from a wide range of certified computer courses taught by experienced instructors. Practical training, modern labs, and job-focused learning."
  highlightText="Excellence"
/>

  
    <section className="py-16 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Section Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
          Our Professional Courses
        </h2>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 hover:-translate-y-1"
            >
              {/* Image */}
              <div className="h-48 w-full overflow-hidden">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Course Content */}
              <div className="p-5 text-center">
                <h3 className="text-lg font-semibold text-gray-800 leading-snug">
                  {course.title}
                </h3>

                <p className="text-gray-600 mt-2">
                  <span className="font-semibold">Duration:</span> {course.duration}
                </p>

                <p className="text-gray-600">
                  <span className="font-semibold">Fee Package:</span> {course.fee}
                </p>

                <button className="mt-4 bg-primary text-white py-2 px-6 rounded-full hover:bg-blue-900 transition-all duration-300">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
     </>
  );
 }
 
 export default CompCourse
 