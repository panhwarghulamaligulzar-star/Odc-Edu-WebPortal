import React, { useState, useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';
import BannerSection from './BannerSection';
import { useLocation } from 'react-router-dom';

export default function ModernGallery() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState('all');
  const { pathname } = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Determine if it's the standalone Gallery page
  const isGalleryPage = pathname === "/gallery";

  const images = [
    { id: 1, url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80', category: 'classrooms', title: 'Modern Classroom' },
    { id: 2, url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', category: 'students', title: 'Students Studying' },
    { id: 3, url: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=800&q=80', category: 'campus', title: 'University Campus' },
    { id: 4, url: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&q=80', category: 'classrooms', title: 'Lecture Hall' },
    { id: 5, url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80', category: 'students', title: 'Group Discussion' },
    { id: 6, url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800&q=80', category: 'campus', title: 'Library Building' },
    { id: 7, url: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80', category: 'classrooms', title: 'Science Lab' },
    { id: 8, url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', category: 'students', title: 'Research Session' },
    { id: 9, url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80', category: 'campus', title: 'Academic Plaza' },
  ];

  const categories = ['all', 'classrooms', 'students', 'campus'];

  const filteredImages = filter === 'all'
    ? images
    : images.filter(img => img.category === filter);

  return (
    <>
      {/* Banner Only for Gallery Page */}
      {isGalleryPage && (
        <BannerSection
          tag="Gallery"
          title="Explore Our Campus Gallery"
          description="Take a virtual tour of our modern educational facilities, classrooms, and learning environments at Odyssey Academy Khipro."
          highlightText="Campus Gallery"
        />
      )}

      <div className="w-full h-full bg-gradient-to-br from-gray-50 via-white to-gray-100">

        {/* Header Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center">
              <h1 className="text-4xl font-bold font-Arial text-primary">Our Gallery</h1>
              <p className="text-lg sm:text-xl text-primary opacity-45 max-w-2xl mx-auto">
                Explore our educational facilities and learning environments
              </p>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex flex-wrap justify-center gap-[6px]">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-[20px] py-2.5 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
                  filter === cat ? 'bg-primary text-accent' : 'text-gray-500'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map(image => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm cursor-pointer transform transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30"
                onClick={() => setSelectedImage(image)}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">

                  <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white font-semibold text-xl mb-2">{image.title}</h3>
                    <span className="inline-block px-3 py-1 bg-purple-600/80 text-white text-sm rounded-full backdrop-blur-sm">
                      {image.category}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-6 right-6 text-white hover:text-purple-400 transition-colors p-2 hover:bg-white/10 rounded-full"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>

            <div
              className="max-w-5xl max-h-[90vh] animate-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />

              <div className="mt-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{selectedImage.title}</h2>

                <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full">
                  {selectedImage.category}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}