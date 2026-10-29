// SafeRoute API Configuration
// Reads VITE_API_BASE_URL from environment when deployed, or falls back to local Flask server
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
