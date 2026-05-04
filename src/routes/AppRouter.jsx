import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import Certification from "../pages/dashboard/Certification";
import Settings from "../pages/dashboard/Settings";
import ProtectedRoute from "../pages/auth/ProtectedRoute";
import Login from "../pages/auth/Login";
import useZustandStore from "../stores/zustandStore";
import Announcement from "../pages/dashboard/Announcement";
import HomePage from "../pages/website/pages/HomePage";
import Certifications from "../pages/website/pages/Certifications";
import AboutUs from "../pages/website/pages/AboutUs";
import Layout from "../pages/website/pages/Layout/Layout";
import ServicesSection from "../pages/website/pages/ServicesSection";
import AnnouncementsSection from "../pages/website/pages/AnnouncementsSection";
import ContactSection from "../pages/website/pages/ContactSection";
import ModernGallery from "../pages/website/pages/ModernGallery";
import OurCourse from "../pages/website/pages/OurCourse";
import ExpertTrainers from "../pages/website/pages/ExpertTrainers";
import CompCourse from "../pages/website/pages/CompCourse";
import VocationalCourses from "../pages/website/pages/VocationalCourses";
import EnglishCourses from "../pages/website/pages/englishCourses";
import CoachingClasses from "../pages/website/pages/CoachingClasses";
import CareerOpportunities from "../pages/website/pages/CareerOpportunities";
import Courses from "../pages/dashboard/Courses";
import Teachers from "../pages/dashboard/Teachers";
import Students from "../pages/dashboard/Students";
import StudentProfile from "../pages/dashboard/StudentProfile";
import HeadsOfAccount from "../pages/dashboard/accounting/HeadsOfAccount";
import Banks from "../pages/dashboard/accounting/Banks";
import Transactions from "../pages/dashboard/accounting/Transactions";
import FundTransfer from "../pages/dashboard/accounting/FundTransfer";
import Ledger from "../pages/dashboard/accounting/Ledger";
import ProfitLoss from "../pages/dashboard/accounting/ProfitLoss";
import Receipt from "../pages/dashboard/accounting/Receipt";
import Attendance from "../pages/dashboard/Attendance";
import HolidayManagement from "../pages/dashboard/HolidayManagement";

function AppRouter() {
  const { token } = useZustandStore();
  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE */}

        {/* Wrap all routes with Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/services" element={<ServicesSection />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/computer-courses" element={<CompCourse />} />
          <Route path="/vocation-course" element={<VocationalCourses />} />
          <Route path="/english-course" element={<EnglishCourses />} />
          <Route path="/coaching-course" element={<CoachingClasses />} />
          <Route
            path="/career-opportunities"
            element={<CareerOpportunities />}
          />
          <Route path="/gallery" element={<ModernGallery />} />
          <Route path="/contact" element={<ContactSection />} />

          <Route path="/login" element={<Login />} />
        </Route>

        {/* PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="certification" element={<Certification />} />
          <Route path="settings" element={<Settings />} />
          <Route path="announcements" element={<Announcement />} />
          {/* Accounting Module */}
          <Route path="accounting/heads" element={<HeadsOfAccount />} />
          <Route path="accounting/banks" element={<Banks />} />
          <Route path="accounting/transactions" element={<Transactions />} />
          <Route path="accounting/receipt" element={<Receipt />} />
          <Route path="accounting/fund-transfer" element={<FundTransfer />} />
          <Route path="accounting/ledger" element={<Ledger />} />
          <Route path="accounting/profit-loss" element={<ProfitLoss />} />
          {/* Attendance Module */}
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance/holidays" element={<HolidayManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRouter;
