import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import Kishore_Kumar from "../../../assets/images/web-images/teachers/Sir Kishore (1).jpg";
import Sir_Juman from "../../../assets/images/web-images/teachers/Sir Juman.jpg";
import sir_jpg from "../../../assets/images/web-images/teachers/sir.jpg";
import Kanwal from "../../../assets/images/web-images/teachers/Kanwal (1).jpg";
import sir_umer from "../../../assets/images/web-images/teachers/sir umer.jpg";
import sir1 from "../../../assets/images/web-images/teachers/sir1.jpg";
import sir2 from "../../../assets/images/web-images/teachers/sir2.jpg";
import sir3 from "../../../assets/images/web-images/teachers/sir3.jpg";

const ExpertTrainers = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const trainers = [
    { name: "Kishore Kumar", degree: "BS Zoology", image: Kishore_Kumar },
    { name: "Muhammad Juman", degree: "BS Chemistry", image: Sir_Juman },
    { name: "Anwar Ali", degree: "BS Mathematics", image: sir_jpg },
    { name: "Meena Kumari", degree: "Tailor Master", image: Kanwal },
    { name: "Umer Asgher KK", degree: "IT Instructor", image: sir_umer },
    { name: "Kamlesh Kumar", degree: "BS Physics", image: sir1 },
    { name: "Nand Lal", degree: "BS Zoology", image: sir2 },
    { name: "Akhtar Ali", degree: "B.A English", image: sir3 },
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % trainers.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + trainers.length) % trainers.length);
  };

  const getVisibleCards = () => {
    const cards = [];
    for (let i = 0; i < 4; i++) {
      cards.push(trainers[(currentIndex + i) % trainers.length]);
    }
    return cards;
  };

  return (
    <div className="max-w-7xl mx-auto py-[50px]">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold font-Arial text-primary">
          Our Expert Trainers
        </h2>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          Experienced, passionate, and professional educators committed to guiding students toward excellence.
        </p>
      </div>

      {/* Trainers Grid */}
      <div className="relative">
        {/* Desktop View - 4 Cards */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6 mb-8">
          {getVisibleCards().map((trainer, idx) => (
            <TrainerCard key={idx} trainer={trainer} />
          ))}
        </div>

        {/* Tablet View - 2 Cards */}
        <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-6 mb-8">
          {getVisibleCards().slice(0, 2).map((trainer, idx) => (
            <TrainerCard key={idx} trainer={trainer} />
          ))}
        </div>

        {/* Mobile View - 1 Card */}
        <div className="grid md:hidden grid-cols-1 gap-6 mb-8 max-w-sm mx-auto">
          <TrainerCard trainer={getVisibleCards()[0]} />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {/* Previous */}
          <button
            onClick={prevSlide}
            className="group bg-white hover:bg-indigo-600 text-slate-700 hover:text-white rounded-full p-3 shadow-lg transition-all duration-300 transform hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Dot Indicators */}
          <div className="flex gap-2">
            {trainers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "bg-indigo-600 w-8" : "bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={nextSlide}
            className="group bg-white hover:bg-indigo-600 text-slate-700 hover:text-white rounded-full p-3 shadow-lg transition-all duration-300 transform hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const TrainerCard = ({ trainer }) => {
  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      <div className="relative w-full h-[300px] bg-gradient-to-br from-indigo-100 to-blue-100 overflow-hidden">
       <img
  src={trainer.image}
  alt={trainer.name}
  className="w-full h-full object-fill transition-transform duration-500 group-hover:scale-110"
/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors duration-300">
          {trainer.name}
        </h3>
        <p className="text-slate-600 font-medium">{trainer.degree}</p>

        <div className="mt-4 w-16 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 mx-auto rounded-full" />
      </div>
    </div>
  );
};

export default ExpertTrainers;
