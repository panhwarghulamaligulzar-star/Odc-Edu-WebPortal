import * as XLSX from "xlsx";
import Course from "../modules/courseModule.js";
import Batch from "../modules/batchModule.js";
import Enrollment from "../modules/enrollmentModule.js";
import EmployeeCourse from "../modules/employeeCourseModule.js";
import {
  QuestionBank,
  Test,
  TestAttempt,
  TestAuditLog,
} from "../modules/testStudioModule.js";

const QUESTION_TYPES = new Set([
  "mcq_single",
  "mcq_multiple",
  "true_false",
  "short_answer",
  "long_answer",
  "fill_blank",
]);

const stripUnsafeHtml = (value = "") =>
  String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .trim();

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const getUserId = (req) => req.user?._id || req.user?.id;

const getAssignedCourseIds = async (req) => {
  if (req.currentUser?.isSuperAdmin || req.user?.isSuperAdmin) {
    return Course.distinct("_id", {});
  }

  const assignments = await EmployeeCourse.find({ employee: getUserId(req) }).lean();
  return assignments.map((item) => String(item.course));
};

const assertCourseAccess = async (req, courseId) => {
  const assignedCourseIds = await getAssignedCourseIds(req);
  if (!assignedCourseIds.map(String).includes(String(courseId))) {
    const error = new Error("You can only manage tests for assigned courses.");
    error.statusCode = 403;
    throw error;
  }
  return assignedCourseIds;
};

const assertBatchAccess = async (req, courseId, batchIds = []) => {
  await assertCourseAccess(req, courseId);
  const uniqueBatchIds = [...new Set(batchIds.map(String))];
  if (!uniqueBatchIds.length) return [];

  const batches = await Batch.find({
    _id: { $in: uniqueBatchIds },
    course: courseId,
  }).lean();

  if (batches.length !== uniqueBatchIds.length) {
    const error = new Error("One or more selected batches are not linked to the selected course.");
    error.statusCode = 403;
    throw error;
  }

  return batches;
};

const computeLifecycleStatus = (test, now = new Date()) => {
  if (test.status === "cancelled" || test.status === "draft") return test.status;
  const startAt = test.schedule?.startAt ? new Date(test.schedule.startAt) : null;
  const endAt = test.schedule?.endAt ? new Date(test.schedule.endAt) : null;
  if (endAt && now >= endAt) return "completed";
  if (startAt && now >= startAt) return "live";
  return "scheduled";
};

const normalizeQuestion = (question = {}, index = 0, defaults = {}) => {
  const questionType = question.questionType || defaults.questionType || "mcq_single";
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) => ({
          _id: option._id,
          text: stripUnsafeHtml(option.text),
          isCorrect: Boolean(option.isCorrect),
        }))
        .filter((option) => option.text)
    : [];

  return {
    bankQuestion: question.bankQuestion || null,
    sectionId: question.sectionId || null,
    order: Number(question.order ?? index),
    questionType,
    difficulty: ["easy", "medium", "hard"].includes(question.difficulty)
      ? question.difficulty
      : "medium",
    questionText: stripUnsafeHtml(question.questionText),
    imageUrl: stripUnsafeHtml(question.imageUrl),
    options,
    correctAnswers: normalizeArray(question.correctAnswers).map(String),
    modelAnswer: stripUnsafeHtml(question.modelAnswer),
    explanation: stripUnsafeHtml(question.explanation),
    marks: Number(question.marks ?? defaults.marksPerQuestion ?? 1),
    negativeMarks: Number(question.negativeMarks ?? 0),
    tags: normalizeArray(question.tags),
  };
};

const normalizeSections = (sections = []) =>
  (Array.isArray(sections) ? sections : []).map((section) => ({
    _id: section._id,
    title: stripUnsafeHtml(section.title || "Section"),
    questionType: section.questionType || "mcq_single",
    numberOfQuestions: Number(section.numberOfQuestions || 0),
    marksPerQuestion: Number(section.marksPerQuestion || 1),
    attemptAny:
      section.attemptAny === null || section.attemptAny === undefined || section.attemptAny === ""
        ? null
        : Number(section.attemptAny),
  }));

const buildTestPayload = (body = {}, currentTest = null) => {
  const schedule = body.schedule || {};
  const sections = normalizeSections(body.sections || currentTest?.sections || []);
  const questions = (Array.isArray(body.questions) ? body.questions : currentTest?.questions || []).map(
    (question, index) => normalizeQuestion(question, index),
  );
  const computedTotalMarks = questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);

  return {
    title: stripUnsafeHtml(body.title || currentTest?.title || ""),
    description: stripUnsafeHtml(body.description || ""),
    instructions: stripUnsafeHtml(body.instructions || ""),
    course: body.course || currentTest?.course,
    topic: stripUnsafeHtml(body.topic || ""),
    allowedQuestionTypes: normalizeArray(body.allowedQuestionTypes).filter((type) =>
      QUESTION_TYPES.has(type),
    ),
    sections,
    questions,
    totalMarks: Number(body.totalMarks || computedTotalMarks || 0),
    passingMarks: Number(body.passingMarks || 0),
    passingPercentage:
      body.passingPercentage === "" || body.passingPercentage === undefined
        ? null
        : Number(body.passingPercentage),
    negativeMarking: {
      enabled: Boolean(body.negativeMarking?.enabled),
      value: Number(body.negativeMarking?.value || 0),
    },
    schedule: {
      timezone: schedule.timezone || "Asia/Karachi",
      startAt: schedule.startAt ? new Date(schedule.startAt) : null,
      endAt: schedule.endAt ? new Date(schedule.endAt) : null,
      durationMinutes: Number(schedule.durationMinutes || 60),
      allowLateEntry: schedule.allowLateEntry !== false,
      graceMinutes: Number(schedule.graceMinutes || 0),
      publishAt: schedule.publishAt ? new Date(schedule.publishAt) : null,
    },
    assignedBatches: normalizeArray(body.batchIds).map((batchId) => ({
      batch: batchId,
      course: body.course || currentTest?.course,
    })),
    excludedStudents: normalizeArray(body.excludedStudentIds).map((studentId) => ({
      student: studentId,
    })),
    settings: {
      shuffleQuestions: Boolean(body.settings?.shuffleQuestions),
      shuffleOptions: Boolean(body.settings?.shuffleOptions),
      resultVisibility: body.settings?.resultVisibility || "after_publish",
      allowReview: Boolean(body.settings?.allowReview),
      attemptsAllowed: Number(body.settings?.attemptsAllowed || 1),
      layout: body.settings?.layout || "all_questions",
      allowBackNavigation: body.settings?.allowBackNavigation !== false,
      antiCheating: {
        requireFullScreen: Boolean(body.settings?.antiCheating?.requireFullScreen),
        trackTabSwitch: body.settings?.antiCheating?.trackTabSwitch !== false,
        maxWarnings: Number(body.settings?.antiCheating?.maxWarnings || 3),
        autoSubmitOnViolation: body.settings?.antiCheating?.autoSubmitOnViolation !== false,
        disableCopyPaste: body.settings?.antiCheating?.disableCopyPaste !== false,
        disableRightClick: body.settings?.antiCheating?.disableRightClick !== false,
      },
    },
  };
};

const validatePublishable = (payload) => {
  const errors = [];
  const now = new Date();
  const questionMarks = payload.questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);
  if (!payload.title) errors.push("Test title is required.");
  if (!payload.course) errors.push("Course is required.");
  if (!payload.questions.length) errors.push("At least one question is required.");
  if (!payload.assignedBatches.length) errors.push("At least one batch is required.");
  if (!payload.schedule.startAt || !payload.schedule.endAt) errors.push("Start and end time are required.");
  if (payload.schedule.startAt && payload.schedule.startAt <= now) errors.push("Schedule start time must be in the future.");
  if (payload.schedule.startAt && payload.schedule.endAt && payload.schedule.endAt <= payload.schedule.startAt) {
    errors.push("End time must be after start time.");
  }
  if (Number(payload.totalMarks || 0) !== Number(questionMarks || 0)) {
    errors.push("Total marks must match the sum of question marks.");
  }
  return errors;
};

const createAudit = (test, req, action, before = null, after = null, note = "") =>
  TestAuditLog.create({
    test: test._id || test,
    actor: getUserId(req),
    action,
    before,
    after,
    note,
  });

const syncQuestionBank = async (test, req) => {
  const writes = test.questions.map((question) => ({
    updateOne: {
      filter: {
        owner: getUserId(req),
        course: test.course,
        questionText: question.questionText,
        questionType: question.questionType,
      },
      update: {
        $set: {
          topic: test.topic || "",
          difficulty: question.difficulty,
          imageUrl: question.imageUrl,
          options: question.options,
          correctAnswers: question.correctAnswers,
          modelAnswer: question.modelAnswer,
          explanation: question.explanation,
          defaultMarks: question.marks,
          tags: question.tags,
          isDeleted: false,
        },
        $setOnInsert: {
          owner: getUserId(req),
          course: test.course,
          questionText: question.questionText,
          questionType: question.questionType,
        },
      },
      upsert: true,
    },
  }));

  if (writes.length) {
    await QuestionBank.bulkWrite(writes);
  }
};

const attachAssignmentStats = async (test) => {
  const plain = test.toObject ? test.toObject() : test;
  const batchIds = (plain.assignedBatches || []).map((item) => item.batch?._id || item.batch);
  const excluded = new Set((plain.excludedStudents || []).map((item) => String(item.student?._id || item.student)));
  const enrollments = batchIds.length
    ? await Enrollment.find({ batch: { $in: batchIds }, status: { $in: ["Active", "Completed", "On Hold"] } })
        .populate("student", "studentName registrationNo emailAddress isActive")
        .lean()
    : [];
  const students = enrollments.filter((enrollment) => !excluded.has(String(enrollment.student?._id || enrollment.student)));
  const attempts = await TestAttempt.find({ test: plain._id }).lean();
  const attemptCounts = attempts.reduce(
    (acc, attempt) => {
      acc[attempt.status] = (acc[attempt.status] || 0) + 1;
      return acc;
    },
    { not_started: Math.max(0, students.length - attempts.length) },
  );
  return {
    ...plain,
    studentCount: students.length,
    attemptCounts,
  };
};

export const getTeacherTestStudioOptions = async (req, res) => {
  try {
    const courseIds = await getAssignedCourseIds(req);
    const [courses, batches] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }, "courseId courseName courseCategory duration").sort({ courseName: 1 }).lean(),
      Batch.find({ course: { $in: courseIds } }, "batchName batchCode course shift status startDate isActive").sort({ startDate: -1 }).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: courses.map((course) => ({
        ...course,
        batches: batches.filter((batch) => String(batch.course) === String(course._id)),
      })),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const previewTestAssignment = async (req, res) => {
  try {
    const { courseId, batchIds = [], excludedStudentIds = [] } = req.body;
    const batches = await assertBatchAccess(req, courseId, batchIds);
    const excluded = new Set(excludedStudentIds.map(String));
    const enrollments = await Enrollment.find({
      batch: { $in: batches.map((batch) => batch._id) },
      status: { $in: ["Active", "Completed", "On Hold"] },
    })
      .populate("student", "studentName registrationNo emailAddress isActive")
      .lean();

    const uniqueStudents = new Map();
    enrollments.forEach((enrollment) => {
      const studentId = String(enrollment.student?._id || enrollment.student);
      if (studentId && !excluded.has(studentId)) uniqueStudents.set(studentId, enrollment.student);
    });

    res.status(200).json({
      success: true,
      data: {
        batches,
        studentCount: uniqueStudents.size,
        students: Array.from(uniqueStudents.values()),
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getTests = async (req, res) => {
  try {
    const { status, search, courseId } = req.query;
    const courseIds = await getAssignedCourseIds(req);
    const filter = {
      isDeleted: false,
      course: { $in: courseId ? [courseId] : courseIds },
    };
    if (!(req.currentUser?.isSuperAdmin || req.user?.isSuperAdmin)) {
      filter.teacherUser = getUserId(req);
    }
    if (status && status !== "all") filter.status = status;
    if (search) filter.title = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const tests = await Test.find(filter)
      .populate("course", "courseId courseName")
      .populate("assignedBatches.batch", "batchName batchCode")
      .sort({ createdAt: -1 });

    const now = new Date();
    const normalized = await Promise.all(
      tests.map(async (test) => {
        const nextStatus = computeLifecycleStatus(test, now);
        if (test.status !== nextStatus) {
          test.status = nextStatus;
          await test.save();
        }
        return attachAssignmentStats(test);
      }),
    );

    res.status(200).json({ success: true, data: normalized });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getTestById = async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, isDeleted: false })
      .populate("course", "courseId courseName")
      .populate("assignedBatches.batch", "batchName batchCode shift status")
      .populate("excludedStudents.student", "studentName registrationNo")
      .lean();
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    await assertCourseAccess(req, test.course?._id || test.course);
    if (!(req.currentUser?.isSuperAdmin || req.user?.isSuperAdmin) && String(test.teacherUser) !== String(getUserId(req))) {
      return res.status(403).json({ success: false, message: "You can only view your own tests." });
    }
    res.status(200).json({ success: true, data: await attachAssignmentStats(test) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const saveTest = async (req, res) => {
  try {
    const payload = buildTestPayload(req.body);
    await assertBatchAccess(req, payload.course, payload.assignedBatches.map((item) => item.batch));
    const test = await Test.create({
      ...payload,
      teacherUser: getUserId(req),
      status: "draft",
    });
    await syncQuestionBank(test, req);
    await createAudit(test, req, "created", null, payload);
    res.status(201).json({ success: true, message: "Test draft saved", data: await attachAssignmentStats(test) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, isDeleted: false });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    await assertCourseAccess(req, test.course);
    if (!(req.currentUser?.isSuperAdmin || req.user?.isSuperAdmin) && String(test.teacherUser) !== String(getUserId(req))) {
      return res.status(403).json({ success: false, message: "You can only edit your own tests." });
    }
    if (["live", "completed"].includes(test.status)) {
      return res.status(400).json({ success: false, message: "Started tests only allow limited edits in a later phase." });
    }

    const before = test.toObject();
    const payload = buildTestPayload(req.body, test);
    await assertBatchAccess(req, payload.course, payload.assignedBatches.map((item) => item.batch));
    Object.assign(test, payload);
    await test.save();
    await syncQuestionBank(test, req);
    await createAudit(test, req, "updated", before, test.toObject());
    res.status(200).json({ success: true, message: "Test updated", data: await attachAssignmentStats(test) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const publishTest = async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, isDeleted: false });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    await assertCourseAccess(req, test.course);
    if (!(req.currentUser?.isSuperAdmin || req.user?.isSuperAdmin) && String(test.teacherUser) !== String(getUserId(req))) {
      return res.status(403).json({ success: false, message: "You can only publish your own tests." });
    }
    const errors = validatePublishable(test.toObject());
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(" ") });
    const before = test.toObject();
    test.status = computeLifecycleStatus({ ...test.toObject(), status: "scheduled" });
    if (test.status === "draft") test.status = "scheduled";
    test.publishedAt = new Date();
    await test.save();
    await createAudit(test, req, "published", before, test.toObject());
    res.status(200).json({ success: true, message: "Test published", data: await attachAssignmentStats(test) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, isDeleted: false });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    if (test.status !== "draft") return res.status(400).json({ success: false, message: "Only draft tests can be deleted." });
    await assertCourseAccess(req, test.course);
    test.isDeleted = true;
    await test.save();
    await createAudit(test, req, "deleted");
    res.status(200).json({ success: true, message: "Draft test deleted" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const duplicateTest = async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    await assertCourseAccess(req, test.course);
    const duplicate = await Test.create({
      ...test,
      _id: undefined,
      title: `${test.title} Copy`,
      status: "draft",
      publishedAt: null,
      createdAt: undefined,
      updatedAt: undefined,
      teacherUser: getUserId(req),
    });
    await createAudit(duplicate, req, "duplicated", { sourceTest: test._id }, duplicate.toObject());
    res.status(201).json({ success: true, message: "Test duplicated", data: await attachAssignmentStats(duplicate) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getQuestionBank = async (req, res) => {
  try {
    const courseIds = await getAssignedCourseIds(req);
    const filter = {
      isDeleted: false,
      course: { $in: req.query.courseId ? [req.query.courseId] : courseIds },
      $or: [{ owner: getUserId(req) }, { isShared: true }],
    };
    if (req.query.questionType) filter.questionType = req.query.questionType;
    const data = await QuestionBank.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const importQuestionBank = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const { courseId } = req.body;
    await assertCourseAccess(req, courseId);
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const rows = workbook.SheetNames[0]
      ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "", raw: false })
      : [];
    const docs = rows
      .map((row) => normalizeQuestion({
        questionText: row.Question || row.questionText,
        questionType: row.Type || row.questionType || "mcq_single",
        difficulty: String(row.Difficulty || "medium").toLowerCase(),
        marks: row.Marks || 1,
        options: ["Option A", "Option B", "Option C", "Option D"]
          .map((key) => row[key])
          .filter(Boolean)
          .map((text, index) => ({
            text,
            isCorrect: String(row["Correct Answer"] || "").split(",").map((item) => item.trim().toUpperCase()).includes(String.fromCharCode(65 + index)),
          })),
        correctAnswers: String(row["Correct Answer"] || "").split(",").map((item) => item.trim()).filter(Boolean),
        modelAnswer: row["Model Answer"] || "",
        explanation: row.Explanation || "",
        tags: row.Tags || "",
      }))
      .filter((question) => question.questionText)
      .map((question) => ({
        owner: getUserId(req),
        course: courseId,
        topic: stripUnsafeHtml(req.body.topic || ""),
        questionType: question.questionType,
        difficulty: question.difficulty,
        questionText: question.questionText,
        options: question.options,
        correctAnswers: question.correctAnswers,
        modelAnswer: question.modelAnswer,
        explanation: question.explanation,
        defaultMarks: question.marks,
        tags: question.tags,
      }));

    if (docs.length) await QuestionBank.insertMany(docs, { ordered: false });
    res.status(200).json({ success: true, message: "Questions imported", data: { imported: docs.length } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
