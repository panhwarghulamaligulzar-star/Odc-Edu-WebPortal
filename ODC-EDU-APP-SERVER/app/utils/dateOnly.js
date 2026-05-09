export const normalizeDateOnly = (value) => {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        12,
        0,
        0,
        0,
      ),
    );
  }

  const text = String(value).trim();

  const isoDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  const localDateMatch = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})(?:$|\s|T)/);
  if (localDateMatch) {
    const [, day, month, year] = localDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
};
