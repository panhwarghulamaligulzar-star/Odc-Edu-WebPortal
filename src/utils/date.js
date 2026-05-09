export const formatDateOnlyForApi = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.format === "function") {
    return value.format("YYYY-MM-DD");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
