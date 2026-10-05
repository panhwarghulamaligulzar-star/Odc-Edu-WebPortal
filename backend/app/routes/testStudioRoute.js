import express from "express";
import multer from "multer";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
import {
  deleteTest,
  duplicateTest,
  getQuestionBank,
  getTeacherTestStudioOptions,
  getTestById,
  getTests,
  importQuestionBank,
  previewTestAssignment,
  publishTest,
  saveTest,
  updateTest,
} from "../controller/testStudioController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get("/options", authorize("test_studio", "view"), getTeacherTestStudioOptions);
router.post("/assignments/preview", authorize("test_studio", "view"), previewTestAssignment);
router.get("/tests", authorize("test_studio", "view"), getTests);
router.post("/tests", authorize("test_studio", "create"), saveTest);
router.get("/tests/:id", authorize("test_studio", "view"), getTestById);
router.put("/tests/:id", authorize("test_studio", "update"), updateTest);
router.post("/tests/:id/publish", authorize("test_studio", "approve"), publishTest);
router.post("/tests/:id/duplicate", authorize("test_studio", "create"), duplicateTest);
router.delete("/tests/:id", authorize("test_studio", "delete"), deleteTest);
router.get("/question-bank", authorize("test_studio", "view"), getQuestionBank);
router.post(
  "/question-bank/import",
  authorize("test_studio", "import"),
  upload.single("file"),
  importQuestionBank,
);

export default router;
