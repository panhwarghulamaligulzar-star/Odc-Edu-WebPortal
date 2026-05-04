import certificationModule from "../modules/certificationModule.js";

const createStudentCertificate = async (req, res) => {
  try {
    const certificateInfo = req.body || {};
    console.log('ali',req.body)
    const newCertificate = await certificationModule.create(certificateInfo);
    return res.status(201).json({
      success: true,
      message: "Certificate created successfully",
      data: newCertificate,
    });

  } catch (error) {
    console.error("Certificate creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating certificate",
      error: error.message,
    });
  }
};

const getAllCertificates = async (req, res) => {
  try {
    const certificates = await certificationModule.find();
    return res.status(200).json({
      success: true,
      message: "Certificates retrieved successfully",
      data: certificates,
    });
  } catch (error) {
    console.error("Error retrieving certificates:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving certificates",
      error: error.message,
    });
  }
};

// const getCertificateById = async (req, res) => {

//   try {
//     const { id: studentId } = req.params;
//       console.log("id", studentId)
//     const certificate = await certificationModule.find({ studentId: studentId.toString()});
//     if (!certificate) {
//       return res.status(404).json({
//         success: false,
//         message: "Certificate not found",
//       });
//     }
//     return res.status(200).json({
//       success: true,
//       message: "Certificate retrieved successfully",
//       data: certificate,
//     });
//   } catch (error) {
//     console.error("Error retrieving certificate:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while retrieving certificate",
//       error: error.message,
//     });
//   }
// };


const getCertificates = async (req, res) => {
  try {
    const { id } = req.params;
      const certificates = await certificationModule.find({
      registrationNo: String(id).trim(),
    });

    // if (certificates.length > 0) {
    //   certificates.forEach((cert, index) => {
    //     console.log(`Certificate ${index + 1}:`, {
    //       _id: cert._id,
    //       courseId: cert.courseId,
    //       studentName: cert.studentName,
    //       course: cert.course
    //     });
    //   });
    // }

    // Check if any certificates were found
    if (certificates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No certificates found for this Registration No",
        data: [],
      });
    }

    // Return ALL certificates found (always as array)
    const message = certificates.length === 1
      ? "Certificate retrieved successfully"
      : `Found ${certificates.length} certificates`;

    return res.status(200).json({
      success: true,
      message: message,
      count: certificates.length, // Add count for clarity
      data: certificates, 
    });

  } catch (error) {
    console.error("Error retrieving certificate(s):", error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving certificates",
      error: error.message,
    });
  }
};

const updateCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};

    // Handle image update similar to create
    // if (req.file && req.file.buffer) {
    //   const base64 = req.file.buffer.toString("base64");
    //   const mime = req.file.mimetype || "application/octet-stream";
    //   updateData.imageUrl = `data:${mime};base64,${base64}`;
    // } else if (updateData.image) {
    //   if (typeof updateData.image === "string") {
    //     updateData.imageUrl = updateData.image;
    //   } else if (updateData.image.data) {
    //     const buffer = Buffer.isBuffer(updateData.image.data)
    //       ? updateData.image.data
    //       : Buffer.from(updateData.image.data);
    //     const mime = updateData.image.mimetype || "application/octet-stream";
    //     updateData.imageUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    //   }
    // }
    // if (updateData.image) delete updateData.image;

    const updatedCertificate = await certificationModule.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedCertificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Certificate updated successfully",
      data: updatedCertificate,
    });
  } catch (error) {
    console.error("Error updating certificate:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating certificate",
      error: error.message,
    });
  }
};

const deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCertificate = await certificationModule.findByIdAndDelete(id);
    if (!deletedCertificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting certificate",
      error: error.message,
    });
  }
};


// Backend validation (in your bulkUploadCertifications controller)
export const bulkUploadCertifications = async (req, res) => {
  try {
    const certificates = req.body;
    
    const results = {
      total: certificates.length,
      inserted: 0,
      duplicates: 0,
      failed: 0,
      successRecords: [],
      duplicateRecords: [],
      failedRecords: []
    };

    for (const cert of certificates) {
      try {
        // Validate required fields
        const requiredFields = {
          registrationNo: cert.registrationNo,
          studentName: cert.studentName,
          fatherName: cert.fatherName,
          course: cert.course,
          duration: cert.duration,
          startingDate: cert.startingDate,
          endingDate: cert.endingDate
        };

        const missingFields = Object.keys(requiredFields).filter(
          key => !requiredFields[key] || requiredFields[key] === ""
        );

        if (missingFields.length > 0) {
          results.failed++;
          results.failedRecords.push({
            data: cert,
            reason: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Try to save
        const newCert = new certificationModule(cert);
        await newCert.save();
        
        results.inserted++;
        results.successRecords.push(cert);
        
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          results.duplicates++;
          results.duplicateRecords.push({
            data: cert,
            reason: 'Duplicate certificate number'
          });
        } else {
          results.failed++;
          results.failedRecords.push({
            data: cert,
            reason: error.message
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Upload complete.',
      stats: {
        total: results.total,
        inserted: results.inserted,
        duplicates: results.duplicates,
        failed: results.failed
      },
      successRecords: results.successRecords,
      duplicateRecords: results.duplicateRecords,
      failedRecords: results.failedRecords
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};





export default { createStudentCertificate, getAllCertificates, getCertificates, updateCertificate, deleteCertificate,bulkUploadCertifications };
