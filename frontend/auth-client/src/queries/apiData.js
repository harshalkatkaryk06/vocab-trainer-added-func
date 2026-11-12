export async function fetchApiData(request) {
  const response = await request();
  if (!response.data.success) {
    throw new Error(response.data.message || "Could not load data.");
  }
  return response.data;
}
