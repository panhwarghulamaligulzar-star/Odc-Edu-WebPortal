import React, { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import dayjs from "dayjs";
import odc_logo from "../../assets/images/logos/new logo.png";
import sindh_logo from "../../assets/images/logos/sindh-logo.png";
import c_pattran_svg from "../../assets/images/svgs/bg-svgs/PATTERN.png";

const ViewCertification = ({ selectedRecord }) => {

  // console.log("selectedRecord", selectedRecord)
  const certificateRef = useRef();
// ==================== PDF DOWNLOAD HANDLER ====================
const downloadPDF = async () => {
  const element = certificateRef.current;

  // Capture certificate as canvas with optimized quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    allowTaint: false,
    removeContainer: true,
    imageTimeout: 0,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.querySelector('[data-certificate]');
      if (clonedElement) {
        clonedElement.style.transform = 'scale(1)';
      }
    }
  });

  // Convert to JPEG with compression for smaller file size
  const imgData = canvas.toDataURL("image/jpeg", 0.85);

  // Certificate exact dimensions in millimeters
  const certWidth = 297;
  const certHeight = 210;
  const outerMargin = 0; // 16px converted to mm (approx)
  const borderThickness = 4; // 12px converted to mm (approx)
  const stripeSize = 4; // 20px converted to mm (approx)

  // Create PDF matching the certificate dimensions (A4 landscape)
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [certWidth, certHeight],
    compress: true
  });

  // Navy blue color for stripes
  const navyBlue = [0, 61, 130]; // #003d82

  // Draw diagonal striped border frame
  const drawStripedBorder = () => {
    // Calculate border area
    const outerX = outerMargin;
    const outerY = outerMargin;
    const outerWidth = certWidth - (outerMargin * 2);
    const outerHeight = certHeight - (outerMargin * 2);
    
    const innerX = outerX + borderThickness;
    const innerY = outerY + borderThickness;
    const innerWidth = outerWidth - (borderThickness * 2);
    const innerHeight = outerHeight - (borderThickness * 2);

    // Calculate number of stripes needed (diagonal distance)
    const diagonal = Math.sqrt(
      Math.pow(outerWidth + outerHeight, 2)
    );
    const numStripes = Math.ceil(diagonal / stripeSize);

    // Draw diagonal stripes across entire border area
    for (let i = -numStripes; i < numStripes * 2; i++) {
      const isNavy = i % 2 === 0;
      pdf.setFillColor(isNavy ? navyBlue[0] : 255, isNavy ? navyBlue[1] : 255, isNavy ? navyBlue[2] : 255);
      
      const offset = i * stripeSize;
      
      // Create diagonal stripe parallelogram
      const x1 = outerX + offset;
      const y1 = outerY;
      const x2 = x1 + stripeSize;
      const y2 = y1;
      const x3 = x2 + outerHeight;
      const y3 = outerY + outerHeight;
      const x4 = x1 + outerHeight;
      const y4 = y3;
      
      // Draw stripe as two triangles
      pdf.triangle(x1, y1, x2, y2, x3, y3, 'F');
      pdf.triangle(x1, y1, x3, y3, x4, y4, 'F');
    }

    // Cut out inner white rectangle (certificate area)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(innerX, innerY, innerWidth, innerHeight, 'F');
  };

  // Draw the striped border
  drawStripedBorder();

  // Add certificate image in the center (white area)
  const imgX = outerMargin + borderThickness;
  const imgY = outerMargin + borderThickness;
  const imgWidth = certWidth - (outerMargin * 2) - (borderThickness * 2);
  const imgHeight = certHeight - (outerMargin * 2) - (borderThickness * 2);

  pdf.addImage(
    imgData, 
    "JPEG", 
    imgX, 
    imgY, 
    imgWidth, 
    imgHeight, 
    undefined, 
    'FAST'
  );
  
  pdf.save(
    `${selectedRecord?.studentName || selectedRecord?.name || "certificate"}.pdf`
  );
};
  // ==================== FORMAT DATE HELPER ====================
  const formatDate = (date) => {
    if (!date) return "";
    return dayjs(date).format("Do MMMM YYYY");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 py-8">
      {/* ==================== CERTIFICATE CONTAINER ==================== */}
      <div
        ref={certificateRef}
        data-certificate
        className="w-[297mm] h-[210mm] bg-white relative overflow-hidden"
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          boxSizing: 'border-box',
        }}
      >
        {/* ==================== BACKGROUND PATTERN ==================== */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20" 
          style={{
            backgroundImage: `url(${c_pattran_svg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* ==================== DECORATIVE BORDER FRAME (STRIPED PATTERN) ==================== */}
        <div 
          className="absolute pointer-events-none"
          style={{
            top: '16px',
            left: '16px',
            right: '16px',
            bottom: '16px',
            background: `
              repeating-linear-gradient(
                45deg,
                #003d82 0px,
                #003d82 20px,
                white 20px,
                white 40px
              )
            `,
            padding: '12px',
          }}
        >
          {/* Inner white space */}
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
          }} />
        </div>

        {/* Inner solid border */}
        <div 
          className="absolute pointer-events-none"
          style={{
            top: '32px',
            left: '32px',
            right: '32px',
            bottom: '32px',
            border: '3px solid #003d82',
          }}
        />

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="relative z-10 h-full flex flex-col" style={{ padding: '50px 60px' }}>
          
          {/* ==================== TOP LOGO SECTION ==================== */}
          <div className="flex justify-between items-start" style={{ marginBottom: '16px' }}>
            {/* Left Logo - ODC */}
            <div className="flex-shrink-0">
              <img 
                src={odc_logo} 
                alt="ODC Logo" 
                style={{ width: '100px', height: '100px', objectFit: 'contain' }}
              />
            </div>

            {/* Center - Header */}
            <div className="flex-1 text-center" style={{ padding: '0 32px' }}>
              <h1 
                className="text-[#003d82]" 
                style={{ 
                  fontFamily: 'Arial Black, sans-serif',
                  fontSize: '32px',
                  fontWeight: '900',
                  letterSpacing: '0.05em',
                  lineHeight: '1.2',
                  marginBottom: '4px',
                }}
              >
                ODYSSEY ACADEMY KHIPRO
              </h1>
              <p style={{ 
                color: '#003d82',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.05em',
                marginBottom: '2px',
              }}>
                INSTITUTE OF TECHNICAL & VOCATIONAL EDUCATION
              </p>
              <p style={{ 
                color: '#003d82',
                fontSize: '11px',
                fontWeight: '500',
                letterSpacing: '0.05em',
              }}>
                REGISTERED WITH SINDH BOARD OF TECHNICAL EDUCATION KARACHI
              </p>
            </div>

            {/* Right Logo - Sindh */}
            <div className="flex-shrink-0">
              <img 
                src={sindh_logo} 
                alt="SBTE Logo" 
                style={{ 
                  width: '140px', 
                  height: '140px', 
                  objectFit: 'contain',
                  marginTop: '-20px',
                }}
              />
            </div>
          </div>

          {/* ==================== CERTIFICATE TITLE ==================== */}
          <div className="text-center" style={{ marginTop: '-20px' }}>
            <h2 
              className="text-[#003d82]"
              style={{ 
                fontFamily: 'Old English Text MT, Blackletter, serif',
                fontSize: '72px',
                fontWeight: 'bold',
                lineHeight: '1',
                marginBottom: '-8px',
              }}
            >
              Certificate
            </h2>
            <h4 
              className="text-[#003d82]"
              style={{ 
                fontFamily: 'Brush Script MT, cursive',
                fontSize: '36px',
                fontWeight: 'normal',
                fontStyle: 'italic',
              }}
            >
              Of Completion
            </h4>
          </div>

          {/* Registration and Certificate Numbers */}
          <div className="flex justify-between items-center" style={{ marginBottom: '16px', padding: '0 32px', marginTop: '-40px' }}>
            <p style={{ color: '#003d82', fontSize: '13px', fontWeight: 'bold' }}>
              Registration No. <span style={{ textDecoration: 'underline', color: 'black', fontSize: '15px', fontWeight: 'bold', fontFamily: 'Arial' }}>{selectedRecord?. registrationNo || "IT-0017"}</span>
            </p>
            <p style={{ color: '#003d82', fontSize: '13px', fontWeight: 'bold' }}>
              Certificate No. <span style={{ textDecoration: 'underline', color: 'black', fontSize: '15px', fontWeight: 'bold', fontFamily: 'Arial' }}>{selectedRecord?.certificateNo || "0017"}</span>
            </p>
          </div>

          {/* ==================== CERTIFICATE CONTENT ==================== */}
          <div className="flex-1" style={{ padding: '0 48px', marginTop: '20px' }}>
            {/* Student Name Line */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
                This is to certify that Mr. / Miss
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '400px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {selectedRecord?.studentName || "RAHEEL KHAN"}
              </span>
            </div>

            {/* Father Name Line */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
                S / D / W of
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '530px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {selectedRecord?.fatherName || "MOULA BAKHSH"}
              </span>
            </div>

            {/* Completion Statement */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
                Has successfully completed
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '430px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {selectedRecord?.duration || "SIX MONTHS"}
              </span>
            </div>

            {/* Course Name */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
                Course in
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '550px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {selectedRecord?.course || "CERTIFICATE IN INFORMATION TECHNOLOGY (CIT)"}
              </span>
            </div>

            {/* Performance Score */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
                at Odyssey Academy Khipro with a performance score of
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '230px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {selectedRecord?.grade || "90%"}
              </span>
            </div>

            {/* Course Duration */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
                Duration of course from
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '260px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {formatDate(selectedRecord?.startingDate) || "2ND MAY 2025"}
              </span>
              <span style={{ color: '#003d82', fontSize: '15px', fontStyle: 'italic', fontWeight: '500' }}>
               {" "}to{" "}
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '180px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
                {formatDate(selectedRecord?.endingDate) || "31ST OCTOBER 2025"}
              </span>
            </div>

             {/* Technical skills */}
            <div style={{ marginBottom: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}>
              <span style={{ 
                color: '#003d82', 
                fontSize: '15px', 
                fontStyle: 'italic', 
                fontWeight: '500',
                width: '620px',
                textAlign: 'left',
              }}>
                The candidate has demonstrated proficiency in the following tools: 
              </span>
              <span style={{ 
                color: 'black', 
                fontSize: '15px', 
                fontWeight: 'bold', 
                borderBottom: '2px solid #9ca3af',
                display: 'inline-block',
                minWidth: '620px',
                textAlign: 'center',
                paddingBottom: '4px',
                fontFamily: 'Arial',
              }}>
               {selectedRecord?.skills || "MS Office, Adobe Photoshop, Web Development"}
              </span>
            </div>
          </div>

          {/* ==================== SIGNATURES SECTION ==================== */}
          <div className="flex justify-between items-end" style={{ padding: '0 48px', marginTop: '16px' }}>
            {/* Left Signature - Issue Date */}
            <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'black', fontFamily: 'Arial' }}>
                {selectedRecord?.issueDate ? dayjs(selectedRecord.issueDate).format("DD-MM-YYYY") : "10-11-2025"}
              </p>
              <div style={{ borderTop: '2px solid black', width: '80px' }}></div>
              <p style={{ fontSize: '12px', color: 'black', fontWeight: '600' }}>Issue Date</p>
            </div>

            {/* Right Signature - Principal */}
            <div className="text-center">
              <div style={{ borderTop: '2px solid black', width: '160px', marginBottom: '4px' }}></div>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'black' }}>Principal</p>
              <p style={{ fontSize: '12px', color: 'black', fontWeight: '600' }}>(Signature & Stamp)</p>
            </div>
          </div>

          {/* ==================== VERIFICATION FOOTER ==================== */}
          <div className="text-center" style={{ marginTop: '-10px' }}>
            <p style={{ fontSize: '11px', color: 'black' }}>
              <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>For Verification</span> Visit: www.odysseyacademy.education
            </p>
          </div>
        </div>
      </div>

      {/* ==================== DOWNLOAD BUTTON ==================== */}
      <button
        onClick={downloadPDF}
        className="mt-8 bg-[#003d82] hover:bg-[#002050] text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
      >
        Download PDF Certificate
      </button>

      {/* ==================== GOOGLE FONTS ==================== */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default ViewCertification;