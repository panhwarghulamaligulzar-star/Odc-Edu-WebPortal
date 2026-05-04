import { CheckCircle } from "lucide-react";   // ✅ Added
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import BannerSection from "./BannerSection";
import ceoImage from "../../../assets/images/web-images/raw/ceo.jpg";
import ctoImage from "../../../assets/images/web-images/raw/cto.png";
import ServicesPage from "./ServicesPage";
import ExpertTrainers from "./ExpertTrainers";

import { GraduationCap, Users, Laptop, Sparkles } from "lucide-react";
import ContactSection from "./ContactSection";

const programs = [
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: "English Language Courses",
    description: "for communication and professional development.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Vocational Training",
    description:
      "programs for females, including Tailoring, Beautician, and Cooking & Baking.",
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: "Coaching Classes",
    description: "from Grade 1 to Intermediate.",
  },
  {
    icon: <Laptop className="w-6 h-6" />,
    title: "Computer Courses",
    description:
      "such as Certificate in Information Technology (CIT), Diploma in Information Technology (DIT), Computerized Accounting, MS Office Special, Graphic Designing, and Web Designing.",
  },
];

const AboutUs = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isAboutPage = pathname === "/about-us" || pathname === "/about";
  const pageTitle = isAboutPage ? "About Us" : "Home";
  const isHome = pageTitle === "Home";

  const bgClass = isHome
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-white";

  const textClass = isHome ? "text-white" : "text-gray-900";

  const smallTextClass = isHome ? "text-white/60" : "text-gray-700";

  const boxClass = isHome
    ? "bg-white/10 backdrop-blur-sm border border-white/20"
    : "bg-white shadow-lg border border-gray-200";

  const boxTextClass = isHome ? "text-white" : "text-gray-900";

  const statsBoxClass = isHome
    ? "bg-white/10 backdrop-blur-sm border border-white/20"
    : "bg-gray-100 border border-gray-200";

  const statsNumberClass = isHome
    ? "text-white"
    : "text-blue-900 font-bold";

  const statsLabelClass = isHome ? "text-white/50" : "text-gray-600";

  return (
    <>
      {isAboutPage && (
        <BannerSection
          tag="About Us"
          title="Learn More About Odyssey Academy"
          description="Discover our mission, vision, and dedication to providing quality education, skill development, and career opportunities for students."
          highlightText="About Us"
        />
      )}

      <div
        className={`w-full h-full ${bgClass} flex justify-start items-start py-16 md:py-[100px]`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-6 lg:space-y-8">
              <div className="inline-block">
                <span
                  className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium uppercase tracking-wide ${
                    isHome
                      ? "bg-white/10 text-white border border-white/30"
                      : "bg-blue-100 text-blue-900 border border-blue-300"
                  }`}
                >
                  {pageTitle}
                </span>
              </div>

              <div className="space-y-4">
                <h1
                  className={`text-3xl lg:text-[30px] font-bold leading-tight ${textClass}`}
                >
                  Dedicated to providing quality education, skill development,
                  and career opportunities.
                </h1>
                <p
                  className={`${smallTextClass} text-base md:text-lg leading-relaxed max-w-xl`}
                >
                  Odyssey Academy Khipro, established in September 2024, is a
                  leading educational and training institute dedicated to
                  empowering youth through quality education and practical
                  skills. Located in the heart of Khipro, a region connected
                  with Achro Thar, Odyssey Academy proudly stands as a pioneer
                  institution offering modern, skill-based learning opportunities
                  in a backward area where such facilities were once limited
                </p>
              </div>
            </div>
            

            {/* Images */}
            <div className="relative mt-6 lg:mt-0 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto lg:mx-0">
                {/* CEO */}
                <div
                  className={`${boxClass} rounded-2xl overflow-hidden transition-shadow relative`}
                >
                  <div className="aspect-[3/4] bg-gray-200">
                    <img
                      src={ceoImage}
                      alt="CEO"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-white text-sm">Abdul Azim Bozdar</h3>
                    <p className="text-white font-bold">CEO</p>
                    <CheckCircle className="w-5 h-5 text-white absolute top-4 right-4" />
                  </div>
                </div>

                {/* CTO */}
                <div
                  className={`${boxClass} rounded-2xl overflow-hidden transition-shadow relative`}
                >
                  <div className="aspect-[3/4] bg-gray-200">
                    <img
                      src={ctoImage}
                      alt="CTO"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-white text-sm">Asad Ali Bozdar</h3>
                    <p className="text-white font-bold">Founder & MD</p>
                    <CheckCircle className="w-5 h-5 text-white absolute top-4 right-4" />
                  </div>
                </div>
              </div>

              {isHome && (
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary rounded-full blur-3xl opacity-30 -z-10"></div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <div
              className={`${statsBoxClass} text-center p-6 rounded-xl hover:scale-105 transition`}
            >
              <div className={`text-4xl font-bold mb-2 ${statsNumberClass}`}>
                150+
              </div>
              <div className={`text-sm font-medium ${statsLabelClass}`}>
                Admissions
              </div>
            </div>

            <div
              className={`${statsBoxClass} text-center p-6 rounded-xl hover:scale-105 transition`}
            >
              <div className={`text-4xl font-bold mb-2 ${statsNumberClass}`}>
                20+
              </div>
              <div className={`text-sm font-medium ${statsLabelClass}`}>
                Scholarships
              </div>
            </div>

            <div
              className={`${statsBoxClass} text-center p-6 rounded-xl hover:scale-105 transition`}
            >
              <div className={`text-4xl font-bold mb-2 ${statsNumberClass}`}>
                9+
              </div>
              <div className={`text-sm font-medium ${statsLabelClass}`}>
                Internships
              </div>
            </div>

            <div
              className={`${statsBoxClass} text-center p-6 rounded-xl hover:scale-105 transition`}
            >
              <div className={`text-4xl font-bold mb-2 ${statsNumberClass}`}>
                2+
              </div>
              <div className={`text-sm font-medium ${statsLabelClass}`}>
                Placements
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Sections */}
      {isAboutPage && (
        <>
          {/* Programs Card */}
          <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-6 sm:px-8 lg:px-12 py-8 sm:py-10">
                  <div className="flex items-center justify-start gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                      <Sparkles className="w-8 h-8 text-accent" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                      Odyssey Academy offers a wide range of academic and
                      professional programs, including:
                    </h1>
                  </div>
                </div>

                {/* Programs Grid */}
                <div className="px-6 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {programs.map((program, index) => (
                      <div
                        key={index}
                        className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="absolute -top-4 -left-4 bg-gradient-to-br from-blue-900 to-indigo-800 rounded-2xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <div className="text-white">{program.icon}</div>
                        </div>

                        <div className="ml-8 mt-2">
                          <div className="flex items-start gap-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                              {program.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 leading-relaxed ml-8">
                            {program.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Commitment */}
                  <div className="mt-8 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white">
                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                        <GraduationCap className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-3 text-accent">
                          Our Commitment
                        </h3>
                        <p className="text-blue-100 leading-relaxed">
                          At Odyssey Academy, we are committed to transforming
                          lives through education, technology, and skill
                          development. Our dedicated instructors, modern
                          facilities, and career-focused approach make us a
                          trusted choice for students seeking a better and
                          brighter future.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ServicesPage />
          <ContactSection />

          <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
            <ExpertTrainers />
          </div>
        </>
      )}
    </>
  );
};

export default AboutUs;
