import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // If no auth header, continue without authentication
  // This allows routes to work without token if they don't require strict auth
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    decoded._id = decoded._id || decoded.id;
    req.user = decoded;
    next();
  } catch (err) {
    // On token error, don't block the request - just continue without user
    // This prevents auto-logout on expired tokens
    console.warn("Token verification failed:", err.message);
    return next();
  }
};

export default authMiddleware;
