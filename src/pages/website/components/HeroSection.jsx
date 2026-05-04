import React, { useState } from 'react';

const HeroSection = () => {
  // State management for slider
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Slide data configuration
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=600&fit=crop",
      title: "ODYSSEY ACADEMY",
      subtitle: "INSTITUTE OF TECHNICAL & VOCATIONAL EDUCATION"
    },
    {
      image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&h=600&fit=crop",
      title: "EMPOWERING FUTURES",
      subtitle: "THROUGH SKILL-BASED LEARNING"
    },
    {
      image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&h=600&fit=crop",
      title: "TRANSFORMING POTENTIAL",
      subtitle: "INTO PROFESSIONAL EXCELLENCE"
    }
  ];

  // Navigation functions
  // Move to next slide (loops back to first slide after last)
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // Move to previous slide (loops to last slide when at first)
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Slider Container */}
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {/* Map through slides array to render each slide */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className="min-w-full h-[500px] relative bg-cover bg-center py-24 lg:py-32"
            style={{
              backgroundImage: `url('${slide.image}')`,
            }}
          >
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black opacity-60"></div>
            
            
            {/* <div className="relative max-w-7xl mx-auto px-4">
              
              <div className="max-w-xl bg-primary p-[25px] rounded-md backdrop-blur-md bg-opacity-70 flex flex-col gap-[12px]">
           
                <h2 className=" text-[20px] lg:text-[30px] font-bold text-white font-Arial">
                  {slide.title}
                </h2>
                
              
                <p className="text-white text-[14px] lg:text-[16px] opacity-40 mt-[-10px]">
                  {slide.subtitle}
                </p>
                
               
                <button className="w-[160px] bg-primary border-accent hover:bg-blue-900 text-white px-8 py-3 rounded font-semibold transition-colors border">
                  READ MORE
                </button>
              </div>
            </div> */}
          </div>
        ))}
      </div>
      
      {/* Previous Slide Button */}
      <button 
        onClick={prevSlide}
        className="w-[40px] h-[40px] flex justify-center items-center absolute left-2 lg:left-4 top-1/2 transform -translate-y-1/2 bg-primary bg-opacity-70 backdrop-blur-md hover:bg-opacity-80 text-white rounded-full transition-all z-10 border border-accent"
        aria-label="Previous slide"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2.5} 
          stroke="currentColor" 
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      
      {/* Next Slide Button */}
      <button 
        onClick={nextSlide}
        className="w-[40px] h-[40px] flex justify-center items-center absolute right-2 lg:right-4 top-1/2 transform -translate-y-1/2 bg-primary bg-opacity-70 backdrop-blur-md hover:bg-opacity-80 text-white rounded-full transition-all z-10 border border-accent"
        aria-label="Next slide"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2.5} 
          stroke="currentColor" 
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Slide Indicator Dots */}
      {/* <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full transition-all ${
              currentSlide === index ? 'bg-white w-6 lg:w-8' : 'bg-white bg-opacity-50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div> */}
    </div>
  );
};

export default HeroSection;