import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import BannerSection from './BannerSection';

export default function ContactSection() {
  const { pathname } = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Determine if it's the standalone Contact page
  const isContactPage = pathname === "/contact" || pathname === "/contact-us";
  const pageTitle = isContactPage ? "Contact" : "Home";
  const isHome = pageTitle === "Home";

  // Theme classes
  const bgClass = isHome
    ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
    : "bg-white";

  const headingText = isHome ? "text-white" : "text-gray-900";
  const paragraphText = isHome ? "text-blue-200 " : "text-gray-600";
  const cardTheme = isHome
    ? "bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20"
    : "bg-gray-100 border border-gray-300 hover:bg-gray-200";

  const iconBg = isHome
    ? "bg-blue-500/20 group-hover:bg-blue-500/30"
    : "bg-blue-100 group-hover:bg-blue-200";

  const iconColor = isHome ? "text-blue-300" : "text-blue-700";

  const inputText = isHome ? "text-white" : "text-gray-800";
  const inputBorder = isHome
    ? "border-blue-300/30 focus:border-blue-400"
    : "border-gray-400/50 focus:border-blue-600";

  const buttonTheme = isHome
    ? "bg-white text-blue-900 hover:bg-blue-50"
    : "bg-blue-700 text-white hover:bg-blue-800";

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = () => {
    if (formData.name && formData.phone && formData.email && formData.message) {
      alert('Thank you for contacting us! We will get back to you soon.');
      setFormData({ name: '', phone: '', email: '', message: '' });
    } else {
      alert('Please fill in all fields');
    }
  };

  return (
    <>
      {/* Banner Only for Contact Page */}
      {isContactPage && (
        <BannerSection
          tag="Contact"
          title="Get In Touch With Us"
          description="Have questions about our courses, certifications, or services? Reach out to us and we'll be happy to help you."
          highlightText="Touch"
        />
      )}

      <div className={`w-full min-h-full py-12 md:py-16 px-4 sm:px-6 lg:px-8 ${bgClass}`}>
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-3 ${headingText}`}>
              Get In Touch
            </h2>
            <p className={`text-base md:text-lg max-w-2xl mx-auto px-4 ${paragraphText}`}>
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">

            {/* Left - Contact Info */}
            <div className="space-y-8">

              <div className={`rounded-2xl p-8 transition-all duration-300 ${cardTheme}`}>
                <h3 className={`text-2xl font-bold mb-8 ${headingText}`}>
                  Contact Information
                </h3>

                {/* Email */}
                <div className="flex items-start space-x-4 mb-6 group">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Mail className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${headingText}`}>Email Address</h4>
                    <p className={`${paragraphText} text-wrap`}>askodysseyacademy@gmail.com</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-4 mb-6 group">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Phone className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${headingText}`}>Phone Number</h4>
                    <p className={paragraphText}>(+92) 349-2425428</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-4 group">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <MapPin className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${headingText}`}>Location</h4>
                    <p className={paragraphText}>
                      Yaseen Khan Street, Near Kanji Kapra Market, Khipro
                    </p>
                  </div>
                </div>
              </div>

              {/* Office Hours */}
              <div className={`rounded-2xl p-8 transition-all duration-300 ${cardTheme}`}>
                <h3 className={`text-xl font-bold mb-4 ${headingText}`}>Office Hours</h3>
                <div className={`space-y-2 ${paragraphText}`}>
                  <p><span className={`${headingText} font-semibold`}>Monday - Saturday Morning Shift:</span> 9:00 AM  - 1:00 PM</p>
                  <p><span className={`${headingText} font-semibold`}>Monday - Saturday Evening Shift:</span> 3:00 PM - 7:00 PM</p>
                  <p><span className={`${headingText} font-semibold`}>Sunday:</span> Closed</p>
                </div>
              </div>
            </div>

            {/* Right - Contact Form */}
            <div className={`rounded-2xl p-8 lg:p-10 transition-all duration-300 ${cardTheme}`}>
              <h3 className={`text-2xl font-bold mb-2 ${headingText}`}>Send us a Message</h3>
              <p className={`${paragraphText} mb-8`}>
                Fill out the form below and we'll get back to you shortly
              </p>

              <div className="space-y-6">

                {/* Name */}
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  className={`w-full bg-transparent border-b-2 py-3 px-1 placeholder-blue-300/50 outline-none transition ${inputText} ${inputBorder}`}
                />

                {/* Phone */}
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Your Phone Number"
                  className={`w-full bg-transparent border-b-2 py-3 px-1 placeholder-blue-300/50 outline-none transition ${inputText} ${inputBorder}`}
                />

                {/* Email */}
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your Email Address"
                  className={`w-full bg-transparent border-b-2 py-3 px-1 placeholder-blue-300/50 outline-none transition ${inputText} ${inputBorder}`}
                />

                {/* Message */}
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your Message"
                  rows="4"
                  className={`w-full bg-transparent border-b-2 py-3 px-1 placeholder-blue-300/50 outline-none transition resize-none ${inputText} ${inputBorder}`}
                />

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  className={`w-full font-bold py-4 rounded-lg transform hover:scale-105 transition-all duration-300 shadow-lg ${buttonTheme}`}
                >
                  SUBMIT
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}