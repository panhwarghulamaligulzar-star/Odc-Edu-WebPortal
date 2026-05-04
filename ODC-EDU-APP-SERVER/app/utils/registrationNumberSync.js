import AdmissionSchema from "../modules/AdmissionModule.js";
import EnrollmentSchema from "../modules/enrollmentModule.js";
import { generateRegistrationNo } from "./admissionUtils.js";

const IT_COURSE_CATEGORY = "IT & Vocational";

const hasValidRegistrationNo = (value) =>
  !!value && value !== "null" && String(value).trim() !== "";

const extractRegistrationNumber = (value) => {
  if (!hasValidRegistrationNo(value)) return Number.MAX_SAFE_INTEGER;
  const raw = String(value).trim();
  const normalized = raw.startsWith("REG-") ? raw.slice(4) : raw;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const getStudentItEnrollmentInfo = async (studentId) => {
  const enrollments = await EnrollmentSchema.find({ student: studentId })
    .populate("course", "courseCategory")
    .select("course enrollmentDate createdAt")
    .lean();

  const itEnrollments = enrollments.filter(
    (enrollment) => enrollment.course?.courseCategory === IT_COURSE_CATEGORY,
  );

  if (itEnrollments.length === 0) {
    return { hasItEnrollment: false, firstItEnrollmentDate: null };
  }

  const firstItEnrollmentDate = itEnrollments.reduce((earliest, enrollment) => {
    const candidate = new Date(
      enrollment.enrollmentDate || enrollment.createdAt || Date.now(),
    );
    return !earliest || candidate < earliest ? candidate : earliest;
  }, null);

  return { hasItEnrollment: true, firstItEnrollmentDate };
};

export const syncStudentRegistrationNo = async (studentId) => {
  const student = await AdmissionSchema.findById(studentId).select("registrationNo");
  if (!student) return null;

  const { hasItEnrollment } = await getStudentItEnrollmentInfo(studentId);

  if (!hasItEnrollment) {
    if (hasValidRegistrationNo(student.registrationNo) || student.registrationNo === null) {
      await AdmissionSchema.findByIdAndUpdate(studentId, {
        $unset: { registrationNo: 1 },
      });
    }
    return null;
  }

  if (hasValidRegistrationNo(student.registrationNo)) {
    return String(student.registrationNo).trim();
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nextNumber = await generateRegistrationNo();
    try {
      const updated = await AdmissionSchema.findByIdAndUpdate(
        studentId,
        { registrationNo: nextNumber },
        { new: true, runValidators: true },
      );
      return updated?.registrationNo || nextNumber;
    } catch (error) {
      if (error?.code !== 11000 || !error?.keyPattern?.registrationNo) {
        throw error;
      }
    }
  }

  throw new Error("Failed to assign a unique registration number after 10 attempts");
};

export const resyncItRegistrationNumbers = async () => {
  const students = await AdmissionSchema.find({})
    .select("registrationNo createdAt studentName")
    .lean();

  const enrollments = await EnrollmentSchema.find({})
    .populate("course", "courseCategory")
    .select("student enrollmentDate createdAt")
    .lean();

  const itStudentMap = new Map();

  enrollments.forEach((enrollment) => {
    if (enrollment.course?.courseCategory !== IT_COURSE_CATEGORY || !enrollment.student) {
      return;
    }

    const studentId = String(enrollment.student);
    const candidateDate = new Date(
      enrollment.enrollmentDate || enrollment.createdAt || Date.now(),
    );

    const existing = itStudentMap.get(studentId);
    if (!existing || candidateDate < existing.firstItEnrollmentDate) {
      itStudentMap.set(studentId, { firstItEnrollmentDate: candidateDate });
    }
  });

  const eligibleStudents = students
    .filter((student) => itStudentMap.has(String(student._id)))
    .map((student) => ({
      ...student,
      firstItEnrollmentDate: itStudentMap.get(String(student._id)).firstItEnrollmentDate,
    }))
    .sort((a, b) => {
      const regDiff =
        extractRegistrationNumber(a.registrationNo) -
        extractRegistrationNumber(b.registrationNo);
      if (regDiff !== 0) return regDiff;

      const enrollmentDiff =
        new Date(a.firstItEnrollmentDate).getTime() -
        new Date(b.firstItEnrollmentDate).getTime();
      if (enrollmentDiff !== 0) return enrollmentDiff;

      const createdDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdDiff !== 0) return createdDiff;

      return String(a.studentName || "").localeCompare(String(b.studentName || ""));
    });

  const eligibleIds = new Set(eligibleStudents.map((student) => String(student._id)));
  const bulkOps = [];
  let updatedCount = 0;
  let clearedCount = 0;

  eligibleStudents.forEach((student, index) => {
    const nextValue = String(index + 1).padStart(4, "0");
    if (student.registrationNo !== nextValue) updatedCount += 1;
    bulkOps.push({
      updateOne: {
        filter: { _id: student._id },
        update: { $set: { registrationNo: nextValue } },
      },
    });
  });

  students.forEach((student) => {
    const studentId = String(student._id);
    if (eligibleIds.has(studentId)) return;
    if (student.registrationNo !== null && student.registrationNo !== undefined) {
      clearedCount += 1;
    }
    bulkOps.push({
      updateOne: {
        filter: { _id: student._id },
        update: { $unset: { registrationNo: 1 } },
      },
    });
  });

  if (bulkOps.length > 0) {
    await AdmissionSchema.bulkWrite(bulkOps, { ordered: false });
  }

  return {
    totalStudents: students.length,
    itStudents: eligibleStudents.length,
    updatedCount,
    clearedCount,
  };
};
