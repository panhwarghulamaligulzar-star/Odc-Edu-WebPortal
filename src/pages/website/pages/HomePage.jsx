import WebHeader from "../layout/WebHeader";
import HeroSection from "../components/HeroSection";
import ServicesPage from "./ServicesPage";
import AboutUs from "./AboutUs";
import OurCourse from "./OurCourse";
import ServicesSection from "./ServicesSection";
import ExpertTrainers from "./ExpertTrainers";
import ContactSection from "./ContactSection";
import ModernGallery from "./ModernGallery";
import OdysseyFooter from "../layout/OdysseyFooter";
import AnnouncementsSection from "./AnnouncementsSection";
const HomePage = () => {
  return (
        <div className="min-h-screen bg-gray-50">
        <HeroSection />
      <AnnouncementsSection />
      <ServicesPage />
      <AboutUs />
      <OurCourse />
      <ServicesSection />
      <ExpertTrainers />
      <ContactSection />
      <ModernGallery />
    </div>
  );
};

export default HomePage;
