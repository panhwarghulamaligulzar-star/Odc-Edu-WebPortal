import React from 'react'

const BannerSection = ({ tag, title, description, highlightText }) => {
  return (
    <div className="relative py-20 md:py-28  px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large Circle Top Right */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Medium Circle Bottom Left */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-700"></div>
        
        {/* Small Circle Top Left */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        
        {/* Gradient Orb Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl"></div>
        
        {/* Geometric Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" 
               style={{
                 backgroundImage: `
                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
                   linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)
                 `,
                 backgroundSize: '50px 50px'
               }}>
          </div>
        </div>
        
        {/* Diagonal Lines */}
        <div className="absolute top-0 right-0 w-full h-full opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diagonal-lines" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="40" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diagonal-lines)"/>
          </svg>
        </div>

        {/* Floating Dots */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-blue-300/30 rounded-full animate-ping delay-500"></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-purple-300/30 rounded-full animate-ping delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        
        {/* Tag Badge */}
        <div className="inline-block mb-6 animate-fade-in">
          <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider shadow-lg hover:bg-white/20 transition-all duration-300">
            {tag}
          </span>
        </div>
        
        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight animate-fade-in-up">
          {title.split(highlightText).map((part, index) => (
            index === 0 ? (
              <span key={index}>{part}</span>
            ) : (
              <React.Fragment key={index}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 animate-gradient">
                  {highlightText}
                </span>
                <span>{part}</span>
              </React.Fragment>
            )
          ))}
        </h1>
        
        {/* Description */}
        <p className="text-blue-100/90 text-base sm:text-lg md:text-xl lg:text-2xl max-w-4xl mx-auto leading-relaxed font-light animate-fade-in-up delay-200">
          {description}
        </p>

        {/* Decorative Bottom Line */}
        <div className="mt-10 flex justify-center items-center gap-2 animate-fade-in-up delay-300">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
          <div className="w-2 h-2 rounded-full bg-blue-300/50"></div>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animate-fade-in-up.delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animate-fade-in-up.delay-300 {
          animation-delay: 0.3s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }

        .delay-500 {
          animation-delay: 0.5s;
        }

        .delay-700 {
          animation-delay: 0.7s;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}

export default BannerSection