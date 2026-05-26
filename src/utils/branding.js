import defaultLogo from "../assets/images/logos/new logo.png";
import defaultSidebarLogo from "../assets/images/logos/ODC-PNG.jpg";
import defaultPdfLogo from "../assets/images/logos/LOGO.png";

export const getBrandLogo = (appSettings, fallback = defaultLogo) =>
  appSettings?.logo || fallback;

export const getSidebarLogo = (appSettings) =>
  appSettings?.logo || defaultSidebarLogo;

export const getPdfBrandLogo = (appSettings) =>
  appSettings?.pdfLogo || appSettings?.logo || defaultPdfLogo;

export const getSchoolName = (appSettings) =>
  appSettings?.schoolName || "School Management System";

export const getSchoolTagline = (appSettings) =>
  appSettings?.tagline || "Control branding, report styling, and school metadata";
