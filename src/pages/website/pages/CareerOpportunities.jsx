import React from "react";
import BannerSection from "./BannerSection";

const CareerOpportunities = () => {
  const jobs = [
    {
      id: 1,
      title: "IT Trainer – Female (Intern)",
      opening: "1 Dec 2025",
      closing: "10 Jan 2026",
      status: "Open"
    },
    {
      id: 2,
      title: "Receptionist – Female (Intern)",
      opening: "1 Dec 2025",
      closing: "10 jan 2026",
      status: "Open"
    },
    {
      id: 3,
      title: "Beautician – Female",
      opening: "1 Dec 2025",
      closing: "10 jan 2026",
      status: "Open"
    },
    {
      id: 4,
      title: "Tailor Master – Female",
      opening: "1 Dec 2025",
      closing: "10 jan 2026",
      status: "Open"
    },
    {
      id: 5,
      title: "Cook & Baker – Female",
      opening: "1 Dec 2025",
      closing: "10 jan 2026",
      status: "Open"
    }
  ];

  const statusClasses = {
    Open: "text-green-700 bg-green-100 border border-green-500",
    Closed: "text-red-700 bg-red-100 border border-red-500"
  };

  return (
    <>
    
    {/* Banner Section */}
<BannerSection
  tag="Career Opportunities"
  title="Join Our Team & Build Your Future"
  description="Explore exciting opportunities to advance your career in a professional, dynamic, and growth-oriented environment. We welcome passionate and talented individuals who strive for excellence."
  highlightText="Your Future"
/>
    
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto text-center">
        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-navy-900">
          Career Opportunities
        </h2>

        <p className="text-gray-600 max-w-2xl mx-auto mt-3 leading-relaxed">
          We offer exciting job opportunities for both fresh and experienced individuals.
          Join our team to grow your career, enhance your skills, and work in a professional
          environment that values talent, dedication, and innovation.
        </p>

        {/* Table Container */}
        <div className="mt-12 overflow-x-auto shadow-xl rounded-lg border border-gray-200">
          <table className="w-full text-left border-collapse">
            {/* Table Head */}
            <thead>
              <tr className="bg-[#001F54] text-white text-sm md:text-base">
                <th className="py-4 px-4 font-semibold border border-gray-300 text-center">S#</th>
                <th className="py-4 px-4 font-semibold border border-gray-300">Job Title</th>
                <th className="py-4 px-4 font-semibold border border-gray-300 text-center">Opening Date</th>
                <th className="py-4 px-4 font-semibold border border-gray-300 text-center">Closing Date</th>
                <th className="py-4 px-4 font-semibold border border-gray-300 text-center">Status</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="text-gray-700 text-sm md:text-base bg-white hover:bg-gray-50 transition"
                >
                  <td className="py-4 px-4 border border-gray-300 text-center">
                    {job.id}
                  </td>

                  <td className="py-4 px-4 border border-gray-300">
                    {job.title}
                  </td>

                  <td className="py-4 px-4 border border-gray-300 text-center">
                    {job.opening}
                  </td>

                  <td className="py-4 px-4 border border-gray-300 text-center">
                    {job.closing}
                  </td>

                  <td className="py-4 px-4 border border-gray-300 text-center">
                    <span
                      className={`px-4 py-1 rounded-full text-sm font-medium ${statusClasses[job.status]}`}
                    >
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
         
        </div>

         <div className="mt-[20px]">
            <p>To apply for the job, please send your CV along with the job title to<a 
    href="mailto:askodysseyacademy@gmail.com"
    className="text-primary font-bold opacity-60 hover:opacity-100 hover:underline ml-1"
  >
    askodysseyacademy@gmail.com
  </a></p>
          </div>
      </div>
    </section>
    </>
  );
};

export default CareerOpportunities;
