import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const v2ApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/mock-interview-v2`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

v2ApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
