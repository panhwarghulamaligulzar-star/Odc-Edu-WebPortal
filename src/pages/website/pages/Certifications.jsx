import React, { useEffect, useState } from 'react';
import { Search, Award, Calendar, User, FileText, Download, Eye } from 'lucide-react';
import AppHeader from '../../../layouts/AppHeader';
import OdysseyFooter from '../layout/OdysseyFooter';
import WebHeader from '../layout/WebHeader';
import { getCertificationByCourseId } from '../../../services/certificationService';
import { message, Modal } from 'antd';
import dayjs from "dayjs";
import odc_logo from "../../../assets/images/logos/new logo.png";
import sindh_logo from "../../../assets/images/logos/sindh-logo.png";
import c_pattran_svg from "../../../assets/images/svgs/bg-svgs/PATTERN.png";
import { useLocation } from 'react-router-dom';

const Certifications = () => {
    const { pathname } = useLocation();
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [certificateData, setCertificationData] = useState([]);
  const [inValidStudentId, setInValidStudentId] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);


    // Scroll to top when component mounts
    useEffect(() => {
      window.scrollTo(0, 0);
    }, [pathname]);


  const searchStudentCertifications = async () => {
    try {
      setIsSearching(true);
      setInValidStudentId(false);
      let resp = await getCertificationByCourseId(searchId);
      // console.log("resp", resp);
      if (resp?.success === true && resp?.data) {
        const certificates = Array.isArray(resp.data) ? resp.data : [resp.data];
        setCertificationData(certificates);
        setSearchResult(true);
        message.success(resp?.message || `Found ${certificates.length} certificate(s)`);
      } else {
        setInValidStudentId(true);
        setSearchResult(false);
        setCertificationData([]);
        message.error('No certificates found for this Student ID');
      }
    } catch (error) {
      console.log("error", error);
      message.error('Error searching for certificates');
      setInValidStudentId(true);
      setSearchResult(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      searchStudentCertifications();
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return dayjs(date).format("Do MMMM YYYY");
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedCertificate(null);
  };

  // ==================== CERTIFICATE FULL VIEW COMPONENT ====================
  const CertificateFullView = ({ certificate }) => (
    <div
      className="w-full min-h-[550px] lg:h-full p-[22px] lg:p-[0px]  bg-white relative overflow-hidden shadow-2xl"
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        aspectRatio: '297/210',
        minHeight: '',
        padding:"22px"
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{
          backgroundImage: `url(${c_pattran_svg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Decorative Border Frame */}
      <div className="absolute inset-[8px] md:inset-[16px] border-[6px] md:border-[12px] border-[#003d82] pointer-events-none"
           style={{
             borderImage: 'repeating-linear-gradient(45deg, #003d82 0, #003d82 20px, white 20px, white 40px) 12',
             borderImageSlice: 12,
           }}
      />
      <div className="absolute inset-[16px] md:inset-[32px] border-[2px] md:border-[3px] border-[#003d82] pointer-events-none"/>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col px-[3%] md:px-[5%] py-[3%] md:py-[4%]">
        
        {/* Top Logo Section */}
        <div className="flex justify-between items-start mb-2 md:mb-4">
          <div className="flex-shrink-0">
            <img 
              src={odc_logo} 
              alt="ODC Logo" 
              className="w-[50px] md:w-[80px] lg:w-[100px] h-[50px] md:h-[80px] lg:h-[100px] object-contain"
            />
          </div>

          <div className="flex-1 text-center px-2 md:px-8">
            <h1 
              className="text-[#003d82] text-[14px] md:text-[24px] lg:text-[32px] font-black tracking-wide leading-tight mb-0.5 md:mb-1" 
              style={{ fontFamily: 'Arial Black, sans-serif' }}
            >
              ODYSSEY ACADEMY KHIPRO
            </h1>
            <p className="text-[#003d82] text-[6px] md:text-[10px] lg:text-[13px] font-semibold tracking-wide mb-0.5">
              INSTITUTE OF TECHNICAL & VOCATIONAL EDUCATION
            </p>
            <p className="text-[#003d82] text-[5px] md:text-[8px] lg:text-[11px] font-medium tracking-wide">
              REGISTERED WITH SINDH BOARD OF TECHNICAL EDUCATION KARACHI
            </p>
          </div>

          <div className="flex-shrink-0">
            <img 
              src={sindh_logo} 
              alt="SBTE Logo" 
              className="w-[70px] md:w-[110px] lg:w-[140px] h-[70px] md:h-[110px] lg:h-[140px] object-contain mt-[-10px] md:mt-[-20px]"
            />
          </div>
        </div>

        {/* Certificate Title */}
        <div className="text-center mt-[-10px] md:mt-[-20px]">
          <h2 
            className="text-[#003d82] text-[32px] md:text-[56px] lg:text-[72px] font-bold leading-none mb-[-4px] md:mb-[-8px]" 
            style={{ fontFamily: 'Old English Text MT, Blackletter, serif' }}
          >
            Certificate
          </h2>
          <h4 
            className="text-[#003d82] text-[18px] md:text-[28px] lg:text-[36px] font-normal italic" 
            style={{ fontFamily: 'Brush Script MT, cursive' }}
          >
            Of Completion
          </h4>
        </div>

        {/* Registration and Certificate Numbers */}
        <div className="flex justify-between items-center mb-2 md:mb-4 px-2 md:px-8 mt-[-20px] md:mt-[-40px]">
          <p className="text-[#003d82] text-[6px] md:text-[10px] lg:text-[13px] font-bold">
            Registration No. <span className="underline text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold font-Arial">{certificate?.registrationNo || "IT-0017"}</span>
          </p>
          <p className="text-[#003d82] text-[6px] md:text-[10px] lg:text-[13px] font-bold">
            Certificate No. <span className="underline text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold font-Arial">{certificate?.certificateNo || "0017"}</span>
          </p>
        </div>

        {/* Certificate Content */}
        <div className="flex-1 px-4 md:px-12 mt-[10px] md:mt-[20px]">
          <div className="mb-1.5 md:mb-3 text-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
              This is to certify that Mr. / Miss
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[150px] md:min-w-[300px] lg:min-w-[400px] text-center pb-0.5 md:pb-1 font-Arial">
              {certificate?.studentName || "RAHEEL KHAN"}
            </span>
          </div>

          <div className="mb-1.5 md:mb-3 text-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
              S / D / W of
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[180px] md:min-w-[400px] lg:min-w-[530px] text-center pb-0.5 md:pb-1 font-Arial">
              {certificate?.fatherName || "MOULA BAKHSH"}
            </span>
          </div>

          <div className="mb-1.5 md:mb-3 text-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
              Has successfully completed
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[150px] md:min-w-[320px] lg:min-w-[430px] text-center pb-0.5 md:pb-1 font-Arial">
              {certificate?.duration || "SIX MONTHS"}
            </span>
          </div>

          <div className="mb-1.5 md:mb-3 text-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
              Course in
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[200px] md:min-w-[420px] lg:min-w-[550px] text-center pb-0.5 md:pb-1 font-Arial">
              {certificate?.course || "CERTIFICATE IN INFORMATION TECHNOLOGY (CIT)"}
            </span>
          </div>

          <div className="mb-1.5 md:mb-3 text-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
              at Odyssey Academy Khipro with a performance score of
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[80px] md:min-w-[180px] lg:min-w-[230px] text-center pb-0.5 md:pb-1 font-Arial">
              {certificate?.grade || "90%"}
            </span>
          </div>

          <div className="mb-1.5 md:mb-3 text-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
              Duration of course from
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[100px] md:min-w-[200px] lg:min-w-[260px] text-center pb-0.5 md:pb-1 font-Arial">
              {formatDate(certificate?.startingDate) || "2ND MAY 2025"}
            </span>
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
             to
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block min-w-[80px] md:min-w-[140px] lg:min-w-[180px] text-center pb-0.5 md:pb-1 font-Arial">
              {formatDate(certificate?.endingDate) || "31ST OCTOBER 2025"}
            </span>
          </div>

          <div className="mb-1.5 md:mb-3 text-center flex flex-col justify-start items-center">
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium w-full md:w-[450px] lg:w-[620px] text-start">
            The candidate has demonstrated proficiency in the following tools: 
            </span>
            <span className="text-black text-[7px] md:text-[12px] lg:text-[15px] font-bold border-b-2 border-gray-400 inline-block w-full md:w-[450px] lg:w-[620px] text-center pb-0.5 md:pb-1 font-Arial">
             {certificate?.skills}
            </span>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="flex justify-between items-end px-4 md:px-12 mt-2 md:mt-4">
          <div className="text-center flex flex-col gap-1 md:gap-2">
             <p className="text-[8px] md:text-[12px] lg:text-[14px] font-bold text-black font-Arial">
              {certificate?.issueDate ? dayjs(certificate.issueDate).format("DD-MM-YYYY") : "10-11-2025"}
            </p>
            <div className="border-t-2 border-black w-[40px] md:w-[60px] lg:w-[80px]"></div>
            <p className="text-[6px] md:text-[10px] lg:text-[12px] text-black font-semibold">Issue Date</p>
          </div>

          <div className="text-center">
            <div className="border-t-2 border-black w-[80px] md:w-[120px] lg:w-[160px] mb-0.5 md:mb-1"></div>
            <p className="text-[8px] md:text-[12px] lg:text-[14px] font-bold text-black">Principal</p>
            <p className="text-[6px] md:text-[10px] lg:text-[12px] text-black font-semibold">(Signature & Stamp)</p>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="text-center mt-[-5px] md:mt-[-10px]">
          <p className="text-[5px] md:text-[8px] lg:text-[11px] text-black">
            <span className="font-bold underline">For Verification</span> Visit: www.odysseyacademy.education
          </p>
        </div>
      </div>
    </div>
  );

  // ==================== CERTIFICATE CARD PREVIEW COMPONENT ====================
  const CertificateCardPreview = ({ certificate, index }) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      {/* Card Header */}
      <div className="bg-primary px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="text-yellow-300" size={28} />
            <h3 className="text-white font-bold text-lg">Certificate #{index + 1}</h3>
          </div>
          <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold">
            Verified
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 space-y-4">
{/* Certificate Numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">course. Id.</p>
            <p className="text-gray-900 font-bold text-sm">{certificate?.courseId || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Cert. No.</p>
            <p className="text-gray-900 font-bold text-sm">{certificate?.certificateNo || "N/A"}</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="flex items-start gap-3">
          <User className="text-blue-900 mt-1 flex-shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium mb-1">Student Name</p>
            <p className="text-gray-900 font-bold text-base truncate">{certificate?.studentName || "N/A"}</p>
          </div>
        </div>

        {/* Course Info */}
        <div className="flex items-start gap-3">
          <FileText className="text-blue-900 mt-1 flex-shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium mb-1">Course</p>
            <p className="text-gray-900 font-semibold text-sm line-clamp-2">{certificate?.course || "N/A"}</p>
          </div>
        </div>
        {/* Grade/Score */}
        <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
          <Award className="text-blue-900" size={20} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Performance Score</p>
            <p className="text-blue-900 font-bold text-lg">{certificate?.grade || "N/A"}</p>
          </div>
        </div>


        
          <div className="w-full flex justify-between items-center ">
            
            <span className="text-xs text-gray-500   font-bold border-b-2 border-gray-400 inline-block min-w-[120px] font-Arial">
              {formatDate(certificate?.startingDate) || "2ND MAY 2025"}
            </span>
            <span className="text-[#003d82] text-[7px] md:text-[12px] lg:text-[15px] italic font-medium">
             to
            </span>
            <span className="text-xs text-gray-500   font-bold border-b-2 border-gray-400 inline-block min-w-[120px] font-Arial">
              {formatDate(certificate?.endingDate) || "31ST OCTOBER 2025"}
            </span>
          </div>

        {/* Issue Date */}
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-900" size={20} />
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Issue Date</p>
            <p className="text-gray-900 font-semibold text-sm">
              {certificate?.issueDate ? dayjs(certificate.issueDate).format("DD MMM YYYY") : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      {/* <div className="px-6 pb-6">
        <button
          onClick={() => handleViewCertificate(certificate)}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md"
        >
          <Eye size={20} />
          View Full Certificate
        </button>
      </div> */}
    </div>
  );

  return (
    <>
 
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Hero Section */}
        <div className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-block mb-6">
              <span className="bg-white/10 backdrop-blur-sm border border-white/20 text-accent px-4 py-2 rounded-full text-sm font-medium uppercase tracking-wide">
                Certifications
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Verify Your <span className="text-blue-300">Certifications</span>
            </h1>
            <p className="text-blue-200 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Search and verify your certifications by entering your Registration No. Access your achievement records instantly.
            </p>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20 -z-10"></div>
        </div>
      </div>

      <div>
        {/* Search Section */}
        <div className="pb-16 px-4 sm:px-6 lg:px-8 mt-[-50px]">
          <div className="w-full max-w-[600px] mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-[20px] font-bold lg:text-2xl md:text-3xl text-primary mb-4">
                  Search Your Certifications
                </h2>
                <p className="text-primary opacity-50 text-[13px] lg:text-[22px]" >
                  {inValidStudentId ? (
                    <>
                      No certificates found for Registration No
                      <span className="text-red-600 font-bold"> {searchId}</span>
                    </>
                  ) : (
                    "Enter your Registration No  view  certificates"
                  )}
                </p>
              </div>

              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="Enter Registration No"
                    className="form-input"
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchId.trim()}
                  className="btn-xl !my-[20px] !bg-blue-900"
                >
                  {isSearching ? 'Searching...' : 'Search Certifications'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Certificate Cards Display Section */}
        {searchResult && certificateData.length > 0 && (
          <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8  ">
            <div className="w-full  flex flex-col justify-center items-center ">
              {/* Header */}
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Your Certificates
                </h2>
                <p className="text-gray-600 text-lg">
                  Found {certificateData.length} certificate{certificateData.length > 1 ? 's' : ''} for Registration No : <span className="font-bold text-blue-900">{searchId}</span>
                </p>
              </div>

              {/* Cards Grid */}
              <div className="w-[90%]  m-auto flex flex-wrap justify-center items-center gap-[10px] ">
                {certificateData.map((certificate, index) => (
                  <div className='w-[350px]'>
                  <CertificateCardPreview 
                    key={certificate?._id || certificate?.certificateNo || index}
                    certificate={certificate}
                    index={index}
                  />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Full Certificate View */}
      <Modal
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={window.innerWidth < 1024 ? '100%' : '90%'}
        style={{ maxWidth: '1100px' }}
        centered
        styles={{
          body: { padding: '0px', maxHeight: '95vh', overflow: 'auto' }
        }}
        className=''
      >
        {selectedCertificate && (
          <div className='relative'>
            {/* Verification Notice */}
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-900 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    🔒 Official Verification Document
                  </p>
                  <p className="text-xs text-blue-800">
                    This certificate is displayed for verification purposes only. For official use, please contact Odyssey Academy Khipro.
                  </p>
                </div>
              </div>
            </div>
            
            <CertificateFullView certificate={selectedCertificate} />
          </div>
        )}
      </Modal>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;600;700&display=swap');
      `}</style>
    </>
  );
};

export default Certifications;