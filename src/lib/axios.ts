import axios from 'axios';

// Create a global axios instance
const axiosInstance = axios.create({
  baseURL: '/api',
});

// Function to set the Bearer token
export function setAxiosAuthToken(token?: string) {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
}

export default axiosInstance; 