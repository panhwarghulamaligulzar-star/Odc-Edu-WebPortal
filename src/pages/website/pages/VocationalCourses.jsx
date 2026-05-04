import React, { useEffect } from 'react'
import BannerSection from './BannerSection';
 
const VocationalCourses = () => {

   useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

 const courses = [
  {
    title: "Tailoring & Stitching",
    duration: "3–6 Months ",
    fee: "Rs. 20,000",
    image: "https://www.undp.org/sites/g/files/zskgke326/files/2024-06/undp-ly-womencentre-derj-2024.jpeg"
  },
  {
    title: "Beautician & Make Up",
    duration: "4–6 Months",
    fee: "Rs. 80,000",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSn7JF7IGVs1sxybhZ_JjPB8f41D2uPeHLBWA&s"
  },
  {
    title: "Cooking & Baking",
    duration: "4 Months",
    fee: "Rs. 30,000",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeFqT6sKNm-j8fC3tJj7dje1Dtp33SJ6eKaErD8h3DTEp4PJX9mVXT3H-3BgnxEHUEbyI&usqp=CAU"
  }
];


  return (
    <>
      {/* Banner Section */}
      <BannerSection
        tag="Vocational Courses"
        title="Learn Professional Skills & Become Independent"
        description="Equip yourself with practical vocational skills and earn through creativity, craftsmanship, and hands-on learning."
        highlightText="Skills"
      />

      {/* Main Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Section Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            Vocational Courses
          </h2>

          {/* Grid */}
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

                {/* Content */}
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

export default VocationalCourses;
