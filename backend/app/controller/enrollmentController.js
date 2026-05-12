// controllers/enrollmentController.js
import EnrollmentSchema from "../modules/enrollmentModule.js";
import FeeStructureSchema from "../modules/feeStructureModule.js";
import AdmissionSchema from "../modules/AdmissionModule.js";
import CourseSchema from "../modules/courseModule.js";
import BatchSchema from "../modules/batchModule.js";
import { calculateInstallmentPlan } from "../utils/installmentCalculator.js";
import { syncStudentRegistrationNo } from "../utils/registrationNumberSync.js";
import { generateRegistrationNo } from "../utils/admissionUtils.js";

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || min));

const addMonths = (dateValue, monthsToAdd) => {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

const normalizeAdditionalFees = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const amount = round2(row?.amount);
      const feeType = ["exam", "registration", "practical", "other"].includes(
        row?.feeType,
      )
        ? row.feeType
        : "other";
      const title = (row?.title || "").trim() || "Additional Fee";
      const paymentMode =
        row?.paymentMode === "two_installments"
          ? "two_installments"
          : "one_time";

      return {
        feeType,
        title,
        amount,
        paymentMode,
        numberOfInstallments: paymentMode === "two_installments" ? 2 : 1,
      };
    })
    .filter((row) => row.amount > 0);

const splitAcrossInstallments = (amount, count, includeInInstallments = false) => {
  const safeAmount = round2(amount);
  const safeCount = clamp(count, 1, 24);
  if (safeAmount <= 0) {
    return Array.from({ length: safeCount }, () => 0);
  }

  if (!includeInInstallments) {
    return [safeAmount, ...Array.from({ length: safeCount - 1 }, () => 0)];
  }

  const base = Math.floor((safeAmount / safeCount) * 100) / 100;
  let assigned = 0;
  const chunks = [];
  for (let i = 0; i < safeCount; i++) {
    const isLast = i === safeCount - 1;
    const value = isLast ? round2(safeAmount - assigned) : round2(base);
    chunks.push(value);
    assigned = round2(assigned + value);
  }
  return chunks;
};

const rebalanceInstallmentsToTarget = (installments = [], targetTotal = 0) => {
  const normalized = installments.map((item) => ({
    ...item,
    amount: round2(Math.max(0, item.amount || 0)),
  }));

  if (normalized.length === 0) return normalized;

  const target = round2(Math.max(0, targetTotal || 0));
  const current = round2(
    normalized.reduce((sum, item) => sum + (item.amount || 0), 0),
  );
  const diff = round2(target - current);

  if (diff === 0) return normalized;

  if (diff > 0) {
    const lastIndex = normalized.length - 1;
    normalized[lastIndex].amount = round2(normalized[lastIndex].amount + diff);
    return normalized;
  }

  let remainingToReduce = round2(Math.abs(diff));
  for (let i = normalized.length - 1; i >= 0 && remainingToReduce > 0; i--) {
    const available = round2(normalized[i].amount || 0);
    const reduceBy = Math.min(available, remainingToReduce);
    normalized[i].amount = round2(available - reduceBy);
    remainingToReduce = round2(remainingToReduce - reduceBy);
  }

  return normalized;
};

const generateEqualInstallments = ({
  feeConfig,
  count,
  startDate,
  targetTotal,
}) => {
  const safeCount = clamp(count, 1, 24);
  const installments = [];
  const admissionPlan = [
    round2(feeConfig.admissionFee),
    ...Array.from({ length: safeCount - 1 }, () => 0),
  ];
  const coursePlan = splitAcrossInstallments(
    feeConfig.courseFee,
    safeCount,
    true,
  );
  const certificatePlan = [
    ...Array.from({ length: safeCount - 1 }, () => 0),
    round2(feeConfig.certificateFee),
  ];
  const examPlan = splitAcrossInstallments(
    feeConfig.examFee,
    safeCount,
    feeConfig.includeExamFeeInInstallments,
  );
  const registrationPlan = splitAcrossInstallments(
    feeConfig.registrationFee,
    safeCount,
    feeConfig.includeRegistrationFeeInInstallments,
  );
  const practicalPlan = splitAcrossInstallments(
    feeConfig.practicalFee,
    safeCount,
    feeConfig.includePracticalFeeInInstallments,
  );
  const otherPlan = splitAcrossInstallments(
    feeConfig.otherFee,
    safeCount,
    feeConfig.includeOtherFeeInInstallments,
  );

  for (let i = 0; i < safeCount; i++) {
    const feeComponents = {
      admissionFee: admissionPlan[i],
      courseFee: coursePlan[i],
      certificateFee: certificatePlan[i],
      examFee: examPlan[i],
      registrationFee: registrationPlan[i],
      practicalFee: practicalPlan[i],
      otherFee: otherPlan[i],
    };
    const amount = round2(
      feeComponents.admissionFee +
        feeComponents.courseFee +
        feeComponents.certificateFee +
        feeComponents.examFee +
        feeComponents.registrationFee +
        feeComponents.practicalFee +
        feeComponents.otherFee,
    );

    installments.push({
      installmentNumber: i + 1,
      description:
        safeCount === 1
          ? "Full Payment"
          : i === 0
            ? "Admission Fee + Course Fee"
            : i === safeCount - 1
              ? "Course Fee + Certificate Fee"
              : `Course Fee Installment ${i + 1}`,
      feeComponents,
      amount,
      dueDate: addMonths(startDate, i),
      status: "Pending",
      paidAmount: 0,
    });
  }

  const currentTotal = round2(
    installments.reduce((sum, item) => sum + (item.amount || 0), 0),
  );
  const finalTarget = round2(targetTotal ?? currentTotal);
  return rebalanceInstallmentsToTarget(installments, finalTarget);
};

const normalizeInstallments = ({ installments, totalAmount, startDate }) => {
  if (!Array.isArray(installments) || installments.length === 0) {
    return [];
  }

  const normalized = installments.map((item, index) => ({
    installmentNumber: index + 1,
    description:
      item?.description?.trim() || `Installment ${index + 1}`,
    feeComponents: {
      admissionFee: round2(item?.feeComponents?.admissionFee || 0),
      courseFee: round2(
        item?.feeComponents?.courseFee ??
          item?.amount ??
          0,
      ),
      certificateFee: round2(item?.feeComponents?.certificateFee || 0),
      examFee: round2(item?.feeComponents?.examFee || 0),
      registrationFee: round2(item?.feeComponents?.registrationFee || 0),
      practicalFee: round2(item?.feeComponents?.practicalFee || 0),
      otherFee: round2(item?.feeComponents?.otherFee || 0),
    },
    amount: round2(item?.amount),
    dueDate: item?.dueDate
      ? new Date(item.dueDate)
      : addMonths(startDate, index),
    status: item?.status || "Pending",
    paidAmount: round2(item?.paidAmount || 0),
  }));

  const targetTotal = round2(totalAmount);
  return rebalanceInstallmentsToTarget(normalized, targetTotal);
};

// Create enrollment for a student
export const createEnrollment = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      batchId,
      enrollmentDate,
      notes,
      admissionFee,
      courseFee,
      certificateFee,
      examFee,
      registrationFee,
      practicalFee,
      otherFee,
      includeExamFeeInInstallments,
      includeRegistrationFeeInInstallments,
      includePracticalFeeInInstallments,
      includeOtherFeeInInstallments,
      additionalFees,
      discount,
      discountType,
      discountOnAdmission,
      discountOnCourseFee,
      totalDiscount,
      discountPercentage,
      paymentPlanType,
      numberOfInstallments,
      installments,
    } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Check if student exists
    const student = await AdmissionSchema.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if course exists
    const course = await CourseSchema.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if batch exists and belongs to the course
    if (batchId) {
      const batch = await BatchSchema.findById(batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }
      if (batch.course.toString() !== courseId) {
        return res.status(400).json({
          success: false,
          message: "Batch does not belong to the selected course",
        });
      }
      // Check batch capacity
      if (batch.currentStudents >= batch.maxStudents) {
        return res.status(400).json({
          success: false,
          message: "Batch is full. Cannot enroll more students.",
        });
      }
    }

    // Create enrollment
    const newEnrollment = new EnrollmentSchema({
      student: studentId,
      course: courseId,
      batch: batchId || null,
      enrollmentDate: enrollmentDate || new Date(),
      notes,
    });

    const savedEnrollment = await newEnrollment.save();

    // Update batch student count if batch is assigned
    if (batchId) {
      await BatchSchema.findByIdAndUpdate(batchId, {
        $inc: { currentStudents: 1 },
      });
    }

    // Assign registration number ONLY for IT & Vocational courses.
    // The number is globally sequential across all IT & Vocational students.
    // Students enrolled in Coaching courses never receive a number.
    let systemGrantedNumber = null;

    if (course.courseCategory === "IT & Vocational") {
      const hasValidRegNo = student.registrationNo &&
                            student.registrationNo !== "null" &&
                            String(student.registrationNo).trim() !== "";

      if (hasValidRegNo) {
        // Student already has a number from a previous IT & Vocational enrollment — reuse it
        systemGrantedNumber = student.registrationNo;
        await AdmissionSchema.findByIdAndUpdate(
          studentId,
          { $addToSet: { enrolledCourses: courseId } }
        );
      } else {
        // First IT & Vocational course for this student — generate the next global number.
        // Retry up to 10 times to handle concurrent request race conditions (E11000).
        let assigned = false;
        for (let attempt = 0; attempt < 10 && !assigned; attempt++) {
          const newRegNo = await generateRegistrationNo();
          try {
            await AdmissionSchema.findByIdAndUpdate(
              studentId,
              { registrationNo: newRegNo, $addToSet: { enrolledCourses: courseId } },
              { new: true }
            );
            systemGrantedNumber = newRegNo;
            assigned = true;
          } catch (dupErr) {
            // E11000 means another concurrent request claimed this exact number.
            // generateRegistrationNo() will now read the newly saved number as max
            // and return the next one on the following iteration.
            if (dupErr.code !== 11000 || !dupErr.keyPattern?.registrationNo) {
              throw dupErr;
            }
          }
        }
        if (!assigned) {
          throw new Error("Failed to assign a unique registration number after 10 attempts");
        }
      }
    } else {
      // Coaching or other category — no number assigned, just record the course
      await AdmissionSchema.findByIdAndUpdate(
        studentId,
        { $addToSet: { enrolledCourses: courseId } }
      );
    }

    systemGrantedNumber = await syncStudentRegistrationNo(studentId);

    // Calculate flexible fee + installment plan
    const selectedAdmissionFee = round2(admissionFee ?? course.admissionFee ?? 0);
    const selectedCourseFee = round2(courseFee ?? course.courseFee ?? 0);
    const selectedCertificateFee = round2(
      certificateFee ?? course.certificateFee ?? 0,
    );
    const selectedExamFee = round2(examFee ?? course.examFee ?? 0);
    const selectedRegistrationFee = round2(
      registrationFee ?? course.registrationFee ?? 0,
    );
    const selectedPracticalFee = round2(practicalFee ?? course.practicalFee ?? 0);
    const selectedOtherFee = round2(otherFee ?? course.otherFee ?? 0);
    const resolvedIncludeExamFeeInInstallments =
      includeExamFeeInInstallments ??
      course.includeExamFeeInInstallments ??
      false;
    const resolvedIncludeRegistrationFeeInInstallments =
      includeRegistrationFeeInInstallments ??
      course.includeRegistrationFeeInInstallments ??
      false;
    const resolvedIncludePracticalFeeInInstallments =
      includePracticalFeeInInstallments ??
      course.includePracticalFeeInInstallments ??
      false;
    const resolvedIncludeOtherFeeInInstallments =
      includeOtherFeeInInstallments ??
      course.includeOtherFeeInInstallments ??
      false;
    const resolvedAdditionalFees = normalizeAdditionalFees(additionalFees);
    const additionalFeesTotal = round2(
      resolvedAdditionalFees.reduce((sum, item) => sum + item.amount, 0),
    );
    const effectiveDiscountPercentage = clamp(discountPercentage, 0, 100);
    const requestedCourseDiscount = round2(
      discountOnCourseFee ?? totalDiscount ?? discount ?? 0,
    );
    const percentageCourseDiscount = round2(
      (selectedCourseFee * effectiveDiscountPercentage) / 100,
    );
    const amountDiscount = round2(
      Math.min(
        selectedCourseFee,
        discountOnCourseFee != null
          ? requestedCourseDiscount
          : effectiveDiscountPercentage > 0
            ? percentageCourseDiscount
            : requestedCourseDiscount,
      ),
    );
    const discountedCourseFee = round2(
      Math.max(0, selectedCourseFee - amountDiscount),
    );
    const resolvedFinalFee = round2(
      selectedAdmissionFee +
        discountedCourseFee +
        selectedCertificateFee +
        selectedExamFee +
        selectedRegistrationFee +
        selectedPracticalFee +
        selectedOtherFee +
        additionalFeesTotal,
    );
    const enrollmentStartDate = enrollmentDate || new Date();

    let resolvedInstallments = normalizeInstallments({
      installments,
      totalAmount: resolvedFinalFee,
      startDate: enrollmentStartDate,
    });

    if (resolvedInstallments.length === 0) {
      const fallbackCount = clamp(
        numberOfInstallments ||
          (paymentPlanType === "full_payment"
            ? 1
            : paymentPlanType === "three_installments"
              ? 3
              : paymentPlanType === "monthly"
                ? course.duration || 1
                : 1),
        1,
        24,
      );

      if (paymentPlanType === "custom") {
        resolvedInstallments = generateEqualInstallments({
          feeConfig: {
            admissionFee: selectedAdmissionFee,
            courseFee: discountedCourseFee,
            certificateFee: selectedCertificateFee,
            examFee: selectedExamFee,
            registrationFee: selectedRegistrationFee,
            practicalFee: selectedPracticalFee,
            otherFee: selectedOtherFee,
            includeExamFeeInInstallments: resolvedIncludeExamFeeInInstallments,
            includeRegistrationFeeInInstallments:
              resolvedIncludeRegistrationFeeInInstallments,
            includePracticalFeeInInstallments:
              resolvedIncludePracticalFeeInInstallments,
            includeOtherFeeInInstallments:
              resolvedIncludeOtherFeeInInstallments,
          },
          count: fallbackCount,
          startDate: enrollmentStartDate,
          targetTotal: resolvedFinalFee,
        });
      } else {
        const plan = calculateInstallmentPlan({
          admissionFee: selectedAdmissionFee,
          courseFee: selectedCourseFee,
          certificateFee: selectedCertificateFee,
          courseDuration: fallbackCount,
          discountOnAdmission: 0,
          discountOnCourseFee: amountDiscount,
          discountType: "courseFee",
          startDate: enrollmentStartDate,
        });
        resolvedInstallments = normalizeInstallments({
          installments: plan.installments,
          totalAmount: resolvedFinalFee,
          startDate: enrollmentStartDate,
        });
      }
    }

    const finalAmount = resolvedFinalFee;

    const feeStructure = new FeeStructureSchema({
      student: studentId,
      course: courseId,
      enrollment: savedEnrollment._id,
      admissionFee: selectedAdmissionFee,
      courseFee: selectedCourseFee,
      certificateFee: selectedCertificateFee,
      examFee: selectedExamFee,
      registrationFee: selectedRegistrationFee,
      practicalFee: selectedPracticalFee,
      otherFee: selectedOtherFee,
      additionalFees: resolvedAdditionalFees,
      totalFee: finalAmount,
      discount: amountDiscount,
      discountPercentage: effectiveDiscountPercentage,
      paymentPlanType: paymentPlanType || "custom",
      discountType: amountDiscount > 0 ? "courseFee" : discountType || "none",
      discountOnAdmission: Math.round(discountOnAdmission || 0),
      discountOnCourseFee: Math.round(amountDiscount),
      remainingAmount: finalAmount,
      installmentEnabled: resolvedInstallments.length > 1,
      numberOfInstallments: resolvedInstallments.length,
      installments: resolvedInstallments,
      feeStatus: "Unpaid",
      systemGrantedNumber: systemGrantedNumber,
    });

    await feeStructure.save();

    // Refetch the student to get the updated registrationNo if it was just assigned
    const updatedStudent = await AdmissionSchema.findById(studentId).lean();

    const populatedEnrollment = await EnrollmentSchema.findById(
      savedEnrollment._id,
    )
      .populate("student", "registrationNo studentName")
      .populate(
        "course",
        "courseName courseId courseCategory admissionFee courseFee certificateFee examFee registrationFee practicalFee otherFee totalFee",
      )
      .populate(
        "batch",
        "batchName batchCode shift days hoursPerDay startDate",
      );

    // Override student data with the latest from database
    const enrollmentObj = populatedEnrollment.toObject();
    if (updatedStudent) {
      enrollmentObj.student = {
        _id: updatedStudent._id,
        registrationNo: updatedStudent.registrationNo,
        studentName: updatedStudent.studentName,
      };
    }

    res.status(201).json({
      success: true,
      message: "Enrollment created successfully",
      data: {
        ...enrollmentObj,
        feeStructure,
      },
    });
  } catch (error) {
    console.error("Enrollment creation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating enrollment",
      error: error.message,
    });
  }
};

// Get all enrollments for a student
export const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;

    const enrollments = await EnrollmentSchema.find({ student: studentId })
      .populate({
        path: "course",
        select:
          "courseName courseId courseCategory duration admissionFee courseFee certificateFee examFee registrationFee practicalFee otherFee totalFee",
        populate: {
          path: "teacherId",
          select: "fullName gender email",
        },
      })
      .populate("student", "registrationNo studentName")
      .populate(
        "batch",
        "batchName batchCode shift days hoursPerDay startDate status",
      )
      .sort({ enrollmentDate: -1 });

    // Fetch fee structure for each enrollment
    const enrollmentsWithFees = await Promise.all(
      enrollments.map(async (enrollment) => {
        const feeStructure = await FeeStructureSchema.findOne({
          enrollment: enrollment._id,
        });

        return {
          ...enrollment.toObject(),
          feeStructure: feeStructure || null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Enrollments retrieved successfully",
      data: enrollmentsWithFees,
    });
  } catch (error) {
    console.error("Error retrieving enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving enrollments",
      error: error.message,
    });
  }
};

// Get all students enrolled in a course
export const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status } = req.query;

    const filter = { course: courseId };
    if (status) {
      filter.status = status;
    }

    const enrollments = await EnrollmentSchema.find(filter)
      .populate(
        "student",
        "registrationNo studentName gender mobileNumber emailAddress",
      )
      .populate("course", "courseName courseId courseCategory")
      .populate(
        "batch",
        "batchName batchCode shift days hoursPerDay startDate status",
      )
      .sort({ enrollmentDate: -1 });

    res.status(200).json({
      success: true,
      message: "Course enrollments retrieved successfully",
      data: enrollments,
    });
  } catch (error) {
    console.error("Error retrieving course enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving course enrollments",
      error: error.message,
    });
  }
};

// Update enrollment status and all enrollment information
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const {
      courseId,
      status,
      completionDate,
      notes,
      enrollmentDate,
      batchId,
      admissionFee,
      courseFee,
      certificateFee,
      examFee,
      registrationFee,
      practicalFee,
      otherFee,
      additionalFees,
      discount,
      discountPercentage,
      discountOnCourseFee,
      totalFee,
      finalFee,
      paymentPlanType,
      numberOfInstallments,
      installments,
    } = req.body;

    // ── Update the Enrollment document (only fields that exist in the schema) ──
    const existingEnrollment = await EnrollmentSchema.findById(enrollmentId).lean();
    if (!existingEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    const enrollmentUpdateData = {};
    if (courseId) enrollmentUpdateData.course = courseId;
    if (status) enrollmentUpdateData.status = status;
    if (completionDate) enrollmentUpdateData.completionDate = completionDate;
    if (notes !== undefined) enrollmentUpdateData.notes = notes;
    if (enrollmentDate) enrollmentUpdateData.enrollmentDate = enrollmentDate;
    // The Enrollment schema field is "batch", not "batchId"
    if (batchId !== undefined) enrollmentUpdateData.batch = batchId || null;

    const updatedEnrollment = await EnrollmentSchema.findByIdAndUpdate(
      enrollmentId,
      enrollmentUpdateData,
      { new: true },
    )
      .populate("student", "registrationNo studentName")
      .populate("course", "courseName courseId")
      .populate("batch", "batchName shift days");

    if (courseId && String(existingEnrollment.course) !== String(courseId)) {
      await AdmissionSchema.findByIdAndUpdate(existingEnrollment.student, {
        $pull: { enrolledCourses: existingEnrollment.course },
        $addToSet: { enrolledCourses: courseId },
      });
    }

    // ── Update the FeeStructure document with the new fee/installment data ──
    const feeStructureUpdate = {};
    if (courseId) feeStructureUpdate.course = courseId;
    if (admissionFee !== undefined) feeStructureUpdate.admissionFee = round2(admissionFee);
    if (courseFee !== undefined) feeStructureUpdate.courseFee = round2(courseFee);
    if (certificateFee !== undefined) feeStructureUpdate.certificateFee = round2(certificateFee);
    if (examFee !== undefined) feeStructureUpdate.examFee = round2(examFee);
    if (registrationFee !== undefined) feeStructureUpdate.registrationFee = round2(registrationFee);
    if (practicalFee !== undefined) feeStructureUpdate.practicalFee = round2(practicalFee);
    if (otherFee !== undefined) feeStructureUpdate.otherFee = round2(otherFee);
    if (additionalFees !== undefined) feeStructureUpdate.additionalFees = normalizeAdditionalFees(additionalFees);
    if (discount !== undefined) feeStructureUpdate.discount = round2(discount);
    if (discountPercentage !== undefined) feeStructureUpdate.discountPercentage = clamp(discountPercentage, 0, 100);
    if (discountOnCourseFee !== undefined) feeStructureUpdate.discountOnCourseFee = round2(discountOnCourseFee);

    const resolvedTotal = round2(finalFee ?? totalFee ?? 0);
    if (finalFee !== undefined || totalFee !== undefined) {
      feeStructureUpdate.totalFee = resolvedTotal;
    }
    if (paymentPlanType) feeStructureUpdate.paymentPlanType = paymentPlanType;
    if (numberOfInstallments !== undefined) {
      feeStructureUpdate.numberOfInstallments = numberOfInstallments;
      feeStructureUpdate.installmentEnabled = numberOfInstallments > 1;
    }
    if (installments && installments.length > 0) {
      feeStructureUpdate.installments = normalizeInstallments({
        installments,
        totalAmount: resolvedTotal,
        startDate: enrollmentDate || new Date(),
      });
    }

    if (Object.keys(feeStructureUpdate).length > 0) {
      // Recalculate remainingAmount = totalFee - paidAmount
      if (feeStructureUpdate.totalFee !== undefined) {
        const existingFs = await FeeStructureSchema.findOne({ enrollment: enrollmentId }).lean();
        const paidAmount = round2(existingFs?.paidAmount || 0);
        feeStructureUpdate.remainingAmount = round2(feeStructureUpdate.totalFee - paidAmount);
      }
      await FeeStructureSchema.findOneAndUpdate(
        { enrollment: enrollmentId },
        { $set: feeStructureUpdate },
        { new: true },
      );
    }

    await syncStudentRegistrationNo(updatedEnrollment.student?._id || existingEnrollment.student);

    res.status(200).json({
      success: true,
      message: "Enrollment updated successfully",
      data: updatedEnrollment,
    });
  } catch (error) {
    console.error("Error updating enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating enrollment",
      error: error.message,
    });
  }
};

// Get all enrollments with filters
export const getAllEnrollments = async (req, res) => {
  try {
    const { status, courseId, page = 1, limit = 10000 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (courseId) filter.course = courseId;

    const skip = (page - 1) * limit;

    const enrollments = await EnrollmentSchema.find(filter)
      .populate("student", "registrationNo studentName gender mobileNumber")
      .populate({
        path: "course",
        select:
          "courseName courseId courseCategory shift duration admissionFee courseFee certificateFee examFee registrationFee practicalFee otherFee totalFee",
        populate: { path: "teacherId", select: "fullName" },
      })
      .populate(
        "batch",
        "batchName batchCode shift days hoursPerDay startDate status",
      )
      .sort({ enrollmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Attach feeStructure to each enrollment in one server-side batch
    // This avoids N+1 round-trips from the client
    const enrollmentIds = enrollments.map((e) => e._id);
    const feeStructures = await FeeStructureSchema.find({
      enrollment: { $in: enrollmentIds },
    }).lean();

    const feeMap = {};
    feeStructures.forEach((fs) => {
      feeMap[fs.enrollment.toString()] = fs;
    });

    const enriched = enrollments.map((e) => ({
      ...e.toObject(),
      feeStructure: feeMap[e._id.toString()] || null,
    }));

    const total = await EnrollmentSchema.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Enrollments retrieved successfully",
      data: enriched,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error retrieving enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving enrollments",
      error: error.message,
    });
  }
};

// Delete enrollment and associated fee structure
export const deleteEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    // Find the enrollment
    const enrollment = await EnrollmentSchema.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Delete associated fee structure
    await FeeStructureSchema.findOneAndDelete({
      enrollment: enrollmentId,
    });

    // Decrement batch student count if batch is assigned
    if (enrollment.batch) {
      await BatchSchema.findByIdAndUpdate(enrollment.batch, {
        $inc: { currentStudents: -1 },
      });
    }

    // Remove course from student's enrolledCourses array
    await AdmissionSchema.findByIdAndUpdate(enrollment.student, {
      $pull: { enrolledCourses: enrollment.course },
    });

    // Delete the enrollment
    await EnrollmentSchema.findByIdAndDelete(enrollmentId);

    await syncStudentRegistrationNo(enrollment.student);

    res.status(200).json({
      success: true,
      message: "Enrollment and associated fee structure deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting enrollment",
      error: error.message,
    });
  }
};

export default {
  createEnrollment,
  getStudentEnrollments,
  getCourseEnrollments,
  updateEnrollmentStatus,
  getAllEnrollments,
  deleteEnrollment,
};
