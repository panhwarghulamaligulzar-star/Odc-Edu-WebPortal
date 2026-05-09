import BatchSchema from "../modules/batchModule.js";
import CourseSchema from "../modules/courseModule.js";
import EnrollmentSchema from "../modules/enrollmentModule.js";

// Create a new batch
const createBatch = async (req, res) => {
  try {
    const {
      batchName,
      batchCode,
      course,
      shift,
      days,
      hoursPerDay,
      startDate,
      endDate,
      maxStudents,
      description,
      status,
    } = req.body;

    // Validate required fields
    if (
      !batchName ||
      !batchCode ||
      !course ||
      !startDate ||
      !shift ||
      !days ||
      !hoursPerDay
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields (batchName, batchCode, course, startDate, shift, days, hoursPerDay)",
      });
    }

    // Check if course exists
    const courseExists = await CourseSchema.findById(course);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if batch code already exists for this course
    const existingBatch = await BatchSchema.findOne({ batchCode, course });
    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: "Batch code already exists for this course",
      });
    }

    // Create new batch
    const newBatch = new BatchSchema({
      batchName,
      batchCode,
      course,
      shift,
      days,
      hoursPerDay,
      startDate,
      endDate,
      maxStudents: maxStudents || 30,
      description,
      status: status || "Active",
    });

    const savedBatch = await newBatch.save();

    // Populate course details
    const populatedBatch = await BatchSchema.findById(savedBatch._id).populate(
      "course",
      "courseName courseId",
    );

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: populatedBatch,
    });
  } catch (error) {
    console.error("Error creating batch:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create batch",
      error: error.message,
    });
  }
};

// Get all batches
const getAllBatches = async (req, res) => {
  try {
    const { courseId, status, isActive } = req.query;

    let filter = {};
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const batches = await BatchSchema.find(filter)
      .populate("course", "courseName courseId")
      .sort({ createdAt: -1 });

    // Get enrolled students count for each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (batch) => {
        const enrolledCount = await EnrollmentSchema.countDocuments({
          batch: batch._id,
        });
        return { ...batch.toObject(), currentStudents: enrolledCount };
      }),
    );

    res.status(200).json({
      success: true,
      count: batchesWithCount.length,
      data: batchesWithCount,
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch batches",
      error: error.message,
    });
  }
};

// Get batch by ID
const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await BatchSchema.findById(id).populate(
      "course",
      "courseName courseId",
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Get enrolled students count
    const enrolledCount = await EnrollmentSchema.countDocuments({
      course: batch.course._id,
      batch: id,
    });

    res.status(200).json({
      success: true,
      data: { ...batch.toObject(), currentStudents: enrolledCount },
    });
  } catch (error) {
    console.error("Error fetching batch:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch batch",
      error: error.message,
    });
  }
};

// Get batches by course ID
const getBatchesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const batches = await BatchSchema.find({ course: courseId, isActive: true })
      .populate("course", "courseName courseId")
      .sort({ startDate: -1 });

    // Get enrolled students count for each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (batch) => {
        const enrolledCount = await EnrollmentSchema.countDocuments({
          batch: batch._id,
        });
        return { ...batch.toObject(), currentStudents: enrolledCount };
      }),
    );

    res.status(200).json({
      success: true,
      count: batchesWithCount.length,
      data: batchesWithCount,
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch batches",
      error: error.message,
    });
  }
};

// Update batch
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating course or batchCode
    delete updates.course;
    delete updates.batchCode;

    const batch = await BatchSchema.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const updatedBatch = await BatchSchema.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("course", "courseName courseId");

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: updatedBatch,
    });
  } catch (error) {
    console.error("Error updating batch:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update batch",
      error: error.message,
    });
  }
};

// Delete batch
const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if batch has enrolled students
    const enrolledStudents = await EnrollmentSchema.countDocuments({
      batch: id,
    });

    if (enrolledStudents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch. It has ${enrolledStudents} enrolled student(s)`,
      });
    }

    const batch = await BatchSchema.findByIdAndDelete(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting batch:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete batch",
      error: error.message,
    });
  }
};

// Soft delete batch (deactivate)
const deactivateBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await BatchSchema.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).populate("course", "courseName courseId");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Batch deactivated successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Error deactivating batch:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate batch",
      error: error.message,
    });
  }
};

export {
  createBatch,
  getAllBatches,
  getBatchById,
  getBatchesByCourse,
  updateBatch,
  deleteBatch,
  deactivateBatch,
};
