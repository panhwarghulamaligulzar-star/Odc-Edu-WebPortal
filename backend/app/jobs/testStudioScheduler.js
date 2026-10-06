import { Test, TestAttempt, TestAuditLog } from "../modules/testStudioModule.js";

const computeStatus = (test, now) => {
  if (["draft", "cancelled"].includes(test.status)) return test.status;
  if (test.status === "live" && test.schedule?.isPaused) return "live";
  if (test.schedule?.endAt && now >= new Date(test.schedule.endAt)) return "completed";
  if (test.schedule?.startAt && now >= new Date(test.schedule.startAt)) return "live";
  return "scheduled";
};

export const runTestStudioScheduler = async () => {
  const now = new Date();

  const tests = await Test.find({
    isDeleted: false,
    status: { $in: ["scheduled", "live"] },
  });

  for (const test of tests) {
    const nextStatus = computeStatus(test, now);
    if (nextStatus !== test.status) {
      const before = test.status;
      test.status = nextStatus;
      await test.save();
      await TestAuditLog.create({
        test: test._id,
        action: "status_auto_updated",
        before,
        after: nextStatus,
        note: "System lifecycle scheduler",
      });
    }
  }

  const expiredAttempts = await TestAttempt.find({
    status: "in_progress",
    expiresAt: { $lte: now },
  });
  const pausedTestIds = new Set(
    tests
      .filter((test) => test.status === "live" && test.schedule?.isPaused)
      .map((test) => String(test._id)),
  );

  for (const attempt of expiredAttempts) {
    if (pausedTestIds.has(String(attempt.test))) continue;
    attempt.status = "auto_submitted";
    attempt.submittedAt = now;
    await attempt.save();
  }
};

export const startTestStudioScheduler = () => {
  setInterval(() => {
    runTestStudioScheduler().catch((error) => {
      console.error("Test Studio scheduler failed:", error.message);
    });
  }, 60 * 1000);
};
