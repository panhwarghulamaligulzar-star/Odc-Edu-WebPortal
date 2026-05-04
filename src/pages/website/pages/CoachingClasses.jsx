import React, { useEffect } from "react";
import BannerSection from "./BannerSection";

const CoachingClasses = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

 const courses = [
    {
      title: "Primary Level",
      duration: "Monthly",
      fee: "Rs. 1,500 / Month",
      image:
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=60"
    },
    {
      title: "Elementary Level",
      duration: "Monthly",
      fee: "Rs. 2,000 / Month",
      image:
        "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=800&q=60"
    },
    {
      title: "Secondary Level",
      duration: "Ten Months",
      fee: "Rs. 30,000",
      image:
        "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=800&q=60"
    },
    {
      title: "Higher Secondary Level",
      duration: "Ten Months",
      fee: "Rs. 40,000",
      image:
        "https://images.unsplash.com/photo-1558021212-51b6ecfa0db9?auto=format&fit=crop&w=800&q=60"
    }
  ];

  return (
    <>
      {/* Banner Section */}
      <BannerSection
        tag="Coaching Classes"
        title="Expert Guidance for Academic Excellence"
        description="Providing quality education and expert guidance from Grade 1 to Intermediate to help students achieve academic excellence."
        highlightText="Academic Excellence"
      />

      {/* Main Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            Coaching Levels
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

export default CoachingClasses;
