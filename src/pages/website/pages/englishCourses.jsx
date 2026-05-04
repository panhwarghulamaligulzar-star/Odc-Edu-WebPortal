import React, { useEffect } from "react";
import BannerSection from "./BannerSection";

const EnglishLanguageCourses = () => {

   useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  const courses = [
    {
      title: "Pre Basic Level",
      duration: "6-Months",
      fee: "Rs. 13,500",
      image:
        "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=800&q=60"
    },
    {
      title: "Basic Level",
      duration: "6-Months",
      fee: "Rs. 13,500",
      image:
        "https://images.unsplash.com/photo-1558021212-51b6ecfa0db9?auto=format&fit=crop&w=800&q=60"
    },
    {
      title: "Intermediate Level",
      duration: "6-Months",
      fee: "Rs. 13,500",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPOxQeb4Akge6ThDWcy5w4_2J5ttnv8tNqLh210nmBv9VAw3jn6oybVgYSk50k1yQE2FQ&usqp=CAU"
    },
    {
      title: "Advanced Level",
      duration: "6-Months",
      fee: "Rs. 16,500",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuU48o21erNayq2zHC7XgQ4US-ZI4u9sz2n_7yuGKk0UE6JuIOTrZkkjnCEIkHaV7Fyrg&usqp=CAU"
    }
  ];

  return (
    <>
      {/* Banner Section */}
<BannerSection
  tag="Career Opportunities"
  title="Join Our Team & Build Your Future"
  description="Explore exciting opportunities to advance your career in a professional, dynamic, and growth-oriented environment. We welcome passionate and talented individuals who strive for excellence."
  highlightText="Your Future"
/>
      {/* Main Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            English Language Levels
          </h2>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses.map((course, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover transform hover:scale-105 transition-all duration-500"
                    onError={(e) =>
                      (e.target.src =
                        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=60")
                    }
                  />
                </div>

                {/* Content */}
                <div className="p-5 text-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {course.title}
                  </h3>

                  <p className="text-gray-600 mt-2">
                    <span className="font-semibold text-gray-700">Duration:</span>{" "}
                    {course.duration}
                  </p>

                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-700">Fee Package:</span>{" "}
                    {course.fee}
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
};

export default EnglishLanguageCourses;
