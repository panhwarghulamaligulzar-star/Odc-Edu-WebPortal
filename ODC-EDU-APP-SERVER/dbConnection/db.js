import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("MongoDB connected successfully!");

    // Remove legacy unique indexes so same student can enroll in the same course multiple times.
    const dropLegacyUniqueIndex = async (collectionName, indexName, label) => {
      try {
        await mongoose.connection.db.collection(collectionName).dropIndex(indexName);
        console.log(`Dropped legacy unique index (${label}): ${indexName}`);
      } catch (indexError) {
        if (indexError.codeName !== "IndexNotFound") {
          console.warn(
            `Could not drop legacy ${label} index:`,
            indexError.message,
          );
        }
      }
    };

    await dropLegacyUniqueIndex(
      "enrollments",
      "student_1_course_1",
      "enrollment",
    );
    await dropLegacyUniqueIndex(
      "feestructures",
      "student_1_course_1",
      "fee structure",
    );
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
