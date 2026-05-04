/**
 * Academy Configuration
 * Central place for all academy/institution details
 * Used in receipts, PDFs, and other documents
 */

export const academyConfig = {
  name: "ODYSSEY ACADEMY KHIPRO",
  shortName: "ODYSSEY",
  address: "Bin Muqarab Colony Main 7G Road, Khipro",
  city: "Khipro",
  email: "askodysseyacademy@gmail.com",
  phone: "+923492425428",
  website: "www.odysseyacademykhipro.com",
  logo: "/src/assets/images/logos/LOGO.png", // Path to academy logo
  
  // Colors for branding
  colors: {
    primary: "#142D78", // Dark blue
    secondary: "#E8E8E8",
    accent: "#4ECDC4",
  },
  
  // Used in receipts and documents
  receiptHeader: {
    backgroundColor: "#142D78",
    textColor: "#FFFFFF",
  },
  
  // Document footer text
  termsAndConditions: [
    "The fee mentioned above has been paid by the student.",
    "This receipt is the proof of the full payment received."
  ],
};

export default academyConfig;
