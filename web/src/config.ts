// Configuration file for API endpoints

// Use environment variables with fallbacks
// REACT_APP_API_URL is used when set (Docker or custom environments)
// Fallback to localhost:5000 for local development
export const API_BASE_URL = process.env.REACT_APP_API_URL || "/api"; 