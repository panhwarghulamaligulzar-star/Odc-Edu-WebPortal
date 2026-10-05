import mongoose from "mongoose";

const employeeCourseSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    employee: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: String,
      ref: "Course",
      required: true,
      index: true,
    },
    assignedBy: {
      type: String,
      ref: "User",
    },
  },
  { timestamps: true },
);

employeeCourseSchema.index({ employee: 1, course: 1 }, { unique: true });

export default mongoose.model("EmployeeCourse", employeeCourseSchema);
