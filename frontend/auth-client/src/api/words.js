import api from "./axios";

export const searchWord = (word) =>
  api.post("/words/search", { word });

export const saveWord = (data) =>
  api.post("/words/save", data);

export const getLibrary = (config) =>
  api.get("/words/library", config);

export const deleteWord = (id) =>
  api.delete(`/words/${id}`);

export const updateWord = (id, data) =>
  api.patch(`/words/${id}`, data);

export const getSpecificWord = (word) =>
  api.get(`/words/lookup/${word}`);

export const bulkImportWords = (data) =>
  api.post("/words/bulk-import", data);