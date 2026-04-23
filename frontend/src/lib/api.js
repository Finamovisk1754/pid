import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const apiClient = axios.create({
  baseURL: API,
  timeout: 60000,
});

export async function fetchDefaultDataset() {
  const { data } = await apiClient.get("/dataset/default");
  return data;
}

export async function uploadDataset(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await apiClient.post("/dataset/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function identifySystem(payload) {
  const { data } = await apiClient.post("/identify", payload);
  return data;
}

export async function tuneController(payload) {
  const { data } = await apiClient.post("/tune", payload);
  return data;
}

export async function simulateSystem(payload) {
  const { data } = await apiClient.post("/simulate", payload);
  return data;
}
