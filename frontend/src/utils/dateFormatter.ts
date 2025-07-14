// Formats an ISO date string into European date format (DD.MM.YYYY) with optional time (HH:mm)
// The time zone is set to "Europe/Berlin" and time is shown in 24-hour format if included
export function formatDateEU(isoDate: string, includeTime = true): string {
  const date = new Date(isoDate);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime && {
      hour: "2-digit",
      minute: "2-digit",
    }),
    hour12: false,
  };

  return new Intl.DateTimeFormat("en", options).format(date);
}
