// Admission utilities
import AdmissionSchema from "../modules/AdmissionModule.js";

// Generate sequential registration number for IT & Vocational students
// Returns only the 4-digit number (e.g., "0120"), not the REG- prefix
export const generateRegistrationNo = async () => {
  try {
    // Pipeline to find the student with the highest registrationNo
    const result = await AdmissionSchema.aggregate([
      { $match: { registrationNo: { $exists: true, $nin: [null, "null", ""] } } },
      {
        $project: {
          registrationNo: 1,
          // Extract numeric part from "REG-0119" or "0119"
          numericPart: {
            $toInt: {
              $cond: [
                { $regexMatch: { input: "$registrationNo", regex: "^REG-" } },
                { $substr: ["$registrationNo", 4, -1] },
                "$registrationNo"
              ]
            }
          }
        }
      },
      { $sort: { numericPart: -1 } },
      { $limit: 1 }
    ]);

    if (!result || result.length === 0) {
      return "0001";
    }

    const lastNumber = result[0].numericPart || 0;
    const nextNumber = lastNumber + 1;
    
    // Return only the numeric part, padded to 4 digits
    return String(nextNumber).padStart(4, "0");
  } catch (error) {
    console.error("Error generating registration number:", error);
    return "0001";
  }
};
