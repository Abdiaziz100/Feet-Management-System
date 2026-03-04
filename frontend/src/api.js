import axios from "axios";

const api = axios.create({
  baseURL: "https://feet-management-system-4.onrender.com",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;

