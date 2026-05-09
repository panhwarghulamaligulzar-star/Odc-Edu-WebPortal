import UserAuth from "../modules/userAuthModal.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const createUser = async (req, res) => {
  try {
    const { name, role, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    // console.log(name, email,role, password)
    // Check if user already exists
    const existingUser = await UserAuth.findOne({ email });
    if (existingUser) {
      return res.status(400).send({
        status: "error",
        message: "User already exists with this email!",
      });
    }

    // hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const image = req.file ? req.file.buffer.toString("base64") : null;

    const createUser = new UserAuth({
      name,
      email,
      role,
      password: hashedPassword,
      profile: image,
    });

    // console.log("createUser", createUser)
    await createUser.save();
    res.send({
      status: "success",
      message: "User created successfully!",
      user: createUser,
    });
  } catch (error) {
    res.status(500).send({
      status: "error",
      message: "Failed to create user",
      error: error.message,
    });
  }
};

//===user login=====//

const userLogin = async (req, res) => {
  try {
    const password = req.body.password;
    const email = req.body.email?.trim().toLowerCase();
    console.log("🔐 Login attempt received");
    console.log("📋 Request body:", req.body);

    // Validate input
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    console.log(`🔎 Searching for user with email: ${email}`);

    // check email
    const user = await UserAuth.findOne({ email });
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return res.status(400).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    console.log(`✅ User found: ${user.email} (Role: ${user.role})`);
    console.log("🔑 Comparing passwords...");

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(400).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    console.log("✅ Password matched!");
    console.log("🎟️  Generating JWT token...");

    // generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    console.log("✅ Token generated successfully");
    console.log(`🎉 Login successful for ${email}`);

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      details: user.details,
    };

    res.status(200).json({
      status: "success",
      message: "Login successful",
      userId: user._id,
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    console.error("📍 Error details:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

export { createUser, userLogin };
