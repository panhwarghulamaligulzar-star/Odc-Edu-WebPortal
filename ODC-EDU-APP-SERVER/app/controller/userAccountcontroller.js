import UserAuth from "../modules/userAuthModal.js";
import bcrypt from "bcrypt";
import cloudinary from "cloudinary";

const cloudinaryV2 = cloudinary.v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getUserAccount = async (req, res) => {
  try {
    console.log("Fetching user account info", req.params);
    const userId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized: User ID not found in token",
      });
    }

    console.log("Searching for user with ID:", userId);
    const userData = await UserAuth.findById(userId);
    console.log("Query result:", userData);

    if (!userData) {
      return res.status(404).json({ status: 404, message: "User not found!" });
    }

    console.log("User account fetched:", userData);

    res.status(200).json({
      status: 200,
      message: "User account information",
      userData,
    });
  } catch (error) {
    console.error("Get User Account Error:", error);

    res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user account info

const updateUserAccount = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res
        .status(404)
        .json({ status: "error", message: "User ID missing" });
    }

    const user = await UserAuth.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found!" });
    }

    let updatedData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };

    // Handle password update
    if (req.body.password) {
      const isSamePassword = await bcrypt.compare(
        req.body.password,
        user.password,
      );
      if (!isSamePassword) {
        const salt = await bcrypt.genSalt(10);
        updatedData.password = await bcrypt.hash(req.body.password, salt);
      } else {
        updatedData.password = user.password;
      }
    }

    // Handle profile image (convert to base64 like signup)
    if (req.file) {
      updatedData.profile = req.file.buffer.toString("base64");
    }

    const updatedUser = await UserAuth.findByIdAndUpdate(
      userId,
      { $set: updatedData },
      { new: true },
    );

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete user account
const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res
        .status(400)
        .json({ status: 400, message: "User ID is required" });
    }

    const deletedUser = await UserAuth.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ status: 404, message: "User not found!" });
    }

    return res.status(200).json({
      status: 200,
      message: "User account deleted successfully",
      deletedUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllProfileData = async (req, res) => {
  try {
    const users = await UserAuth.find();

    return res.status(200).json({
      success: true,
      message: "All profile data fetched",
      data: users,
    });
  } catch (error) {
    console.error("Get Profiles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Complete user profile (additional fields)
const completeUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res
        .status(400)
        .json({ status: 400, message: "User ID is required" });
    }
    const updatedUser = await UserAuth.findByIdAndUpdate(
      userId,
      { details: req.body },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ status: 404, message: "User not found!" });
    }

    console.log(updatedUser);

    res.status(200).json({
      status: 200,
      message: "Profile completed successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  getUserAccount,
  updateUserAccount,
  deleteUserAccount,
  completeUserProfile,
  getAllProfileData,
};
