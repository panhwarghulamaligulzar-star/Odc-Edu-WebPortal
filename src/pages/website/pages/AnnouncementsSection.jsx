import React, { useState, useEffect } from 'react';
import { Megaphone, X, Calendar, Image as ImageIcon } from 'lucide-react';
import { getAllAnnouncement } from '../../../services/announcement';

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch announcements on component mount
  useEffect(() => {
    getAnnouncement();
  }, []);

  const getAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await getAllAnnouncement();

      // Assuming API returns array of announcements
      setAnnouncements(response?.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert base64 to image URL
  const getImageUrl = (base64String) => {
    if (!base64String) return null;
    // If it's already a complete data URL, return it
    if (base64String.startsWith('data:image')) {
      return base64String;
    }
    // If it's just the base64 string, add the data URL prefix
    return `data:image/jpeg;base64,${base64String}`;
  };

  const openModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedAnnouncement(null);
    setIsModalOpen(false);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Only show announcement section if there's at least one announcement
  if (loading) {
    return null; // Or show a loading spinner
  }

  if (!announcements || announcements.length === 0) {
    return null; // Don't show section if no announcements
  }

  return (
    <>
      <div className="w-full h-full mt-[-50px] absolute">
        <div className="w-full">
          {/* Scrolling Announcements Marquee */}
          <div className="w-full flex justify-start items-center bg-primary shadow-xl overflow-hidden mb-8">
            <div className="flex items-center gap-4 px-6 py-4 border-b border-blue-500/30">
              <div className="bg-primary z-10 px-[12px] flex gap-[20px] justify-center items-center ml-[-30px]">
                <Megaphone className="w-6 h-6 text-yellow-300 animate-pulse" />
                <h2 className="text-[12px] font-bold text-white">ANNOUNCEMENTS</h2>
              </div>
              <div className="relative">
                <div className="animate-marquee whitespace-nowrap">
                  <span className="text-blue-200 text-[14px]">
                    {announcements?.map((announcement, index) => (
                      <span
                        key={announcement._id || index}
                        className="cursor-pointer hover:text-white transition-colors"
                        onClick={() => openModal(announcement)}
                      >
                        <strong>{announcement.title}:</strong> {announcement.text}
                        {index < announcements.length - 1 && ' • '}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedAnnouncement && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-primary">
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Announcement Details</h2>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Banner Image */}
              {selectedAnnouncement.bannerImage && (
                <div className="w-full h-64 md:h-96 overflow-hidden bg-gray-100 relative">
                  <img
                    src={getImageUrl(selectedAnnouncement.bannerImage)}
                    alt={selectedAnnouncement.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/800x400?text=Image+Not+Available';
                    }}
                  />
                  {/* Image Overlay Badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-700">Event Banner</span>
                  </div>
                </div>
              )}

              {/* Details Section */}
              <div className="p-6 md:p-8">
                {/* Title */}
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                  {selectedAnnouncement.title}
                </h3>

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  {/* Date */}
                  <div className="flex items-center text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="text-sm font-medium">
                      {formatDate(selectedAnnouncement.date || selectedAnnouncement.createdAt)}
                    </span>
                  </div>

                  {/* Active Status */}
                  {selectedAnnouncement.isActive && (
                    <div className="flex items-center bg-green-50 px-4 py-2 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Active</span>
                    </div>
                  )}
                </div>

                {/* Description/Text */}
                <div className="prose prose-lg max-w-none">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h4 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-blue-600" />
                      Description
                    </h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                      {selectedAnnouncement.text}
                    </p>
                  </div>
                </div>

                {/* Additional Info Section */}
                {(selectedAnnouncement.updatedAt || selectedAnnouncement.createdAt) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      {selectedAnnouncement.createdAt && (
                        <div>
                          <span className="font-semibold text-gray-700">Posted:</span>{' '}
                          {formatDate(selectedAnnouncement.createdAt)}
                        </div>
                      )}
                      {selectedAnnouncement.updatedAt && selectedAnnouncement.updatedAt !== selectedAnnouncement.createdAt && (
                        <div>
                          <span className="font-semibold text-gray-700">Last Updated:</span>{' '}
                          {formatDate(selectedAnnouncement.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={closeModal}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }

        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}