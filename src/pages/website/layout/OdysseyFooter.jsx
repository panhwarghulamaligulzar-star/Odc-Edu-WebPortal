import React, { useState } from 'react';
import { MapPin, Phone, Mail, Facebook, Linkedin, Youtube, Instagram, Twitter, MessageCircle, X } from 'lucide-react';
import odcLogo from "../../../assets/images/logos/new logo.png"
import navtticLogo from "../../../assets/images/logos/sindh-logo.png"


export default function OdysseyFooter() {
  const [showChat, setShowChat] = useState(false);

  return (
    <footer className="bg-gradient-to-br from-[#0a1e4a] via-[#0d2556] to-[#0a1e4a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Logo and Description Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {/* Left Logo */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                <img src={odcLogo} className='w-[100px] h-100px' alt=''/>
                </div>
                  {/* Right Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <img src={navtticLogo} className='w-[100px] h-100px' alt=''/>
            </div>
              </div>

            

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">ODYSSEY ACADEMY</h2>
              <p className="text-sm sm:text-base text-gray-300 mb-1">Institute of Technical & Vocational Education</p>
            </div>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Odyssey Academy Khipro is proudly registered with the Sindh Board of Technical Education (SBTE) and Federal Board of Revenue (FBR), ensuring transparency, credibility, and quality education under recognized standards.
            </p>
          </div>

          {/* Visit Section */}
          <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-accent">VISIT</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 group">
                <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm sm:text-base">Yaseen Khan Street,</p>
                  <p className="text-sm sm:text-base">Near Kanji Kapra Market, Khipro</p>
                </div>
              </div>

              <div className="flex items-center gap-3 group">
                <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <a href="tel:+923492425428" className="text-sm sm:text-base hover:text-yellow-400 transition-colors">
                  (+92) 349-2425428
                </a>
              </div>

              <div className="flex items-center gap-3 group">
                <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <a href="mailto:askodysseyacademy@gmail.com" className="text-sm sm:text-base hover:text-yellow-400 transition-colors break-all">
                  askodysseyacademy@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Social Links Section */}
          <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-white">FALLOW US</h3>
            
            <div className="space-y-3">
              <a href="https://www.facebook.com/odysseyacad" className="flex items-center gap-3 group hover:translate-x-2 transition-transform">
                <div className="bg-[#1877f2] p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-[#1877f2]/50 transition-all">
                  <Facebook className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base group-hover:text-yellow-400 transition-colors">Facebook</span>
              </a>

              <a href="https://www.youtube.com/@odysseyacad" className="flex items-center gap-3 group hover:translate-x-2 transition-transform" target='_blank'>
                <div className="bg-[#0a66c2] p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-[#0a66c2]/50 transition-all">
                  <Linkedin className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base group-hover:text-yellow-400 transition-colors">Linkedin</span>
              </a>

              <a href="https://www.youtube.com/@odysseyacad" className="flex items-center gap-3 group hover:translate-x-2 transition-transform" target='_blank'>
                <div className="bg-[#ff0000] p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-[#ff0000]/50 transition-all">
                  <Youtube className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base group-hover:text-yellow-400 transition-colors">Youtube</span>
              </a>

              <a href="#" className="flex items-center gap-3 group hover:translate-x-2 transition-transform">
                <div className="bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-pink-500/50 transition-all">
                  <Instagram className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base group-hover:text-yellow-400 transition-colors">Instagram</span>
              </a>

              <a href="#" className="flex items-center gap-3 group hover:translate-x-2 transition-transform">
                <div className="bg-black p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-gray-500/50 transition-all">
                  <Twitter className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base group-hover:text-yellow-400 transition-colors">Twitter</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm sm:text-base text-gray-300">
            Copyright 2025  <span className="text-blue-900 font-semibold">odysseyacademy</span>
          </p>
        </div>
      </div>

      {/* Chat Button */}
      {/* <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 bg-[#25d366] hover:bg-[#20ba5a] text-white p-4 rounded-full shadow-2xl hover:shadow-[#25d366]/50 transition-all transform hover:scale-110 z-50"
        aria-label="Chat with us"
      >
        <MessageCircle className="w-6 h-6" />
      </button> */}

      {/* Chat Widget */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="bg-[#25d366] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <div>
                <h4 className="font-semibold">Chat with us</h4>
                <p className="text-xs text-white/90">We're online!</p>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 bg-gray-50">
            <p className="text-gray-600 text-sm mb-4">Hi there! 👋 How can we help you today?</p>
            <a
              href="https://wa.me/923492425428"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#25d366] hover:bg-[#20ba5a] text-white text-center py-3 rounded-lg font-semibold transition-colors"
            >
              Start WhatsApp Chat
            </a>
          </div>
        </div>
      )}
    </footer>
  );
}