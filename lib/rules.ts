const DAY_MS = 86400000;

export function clickAgeMs(createdAt: string, now = Date.now()) {
  const parsed = Date.parse(createdAt.includes("T") ? createdAt : `${createdAt.replace(" ", "T")}Z`);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, now - parsed);
}

export function attributionOpen(createdAt: string, hours: number | null | undefined, now = Date.now()) {
  const windowHours = hours == null || hours <= 0 ? 720 : hours;
  return clickAgeMs(createdAt, now) <= windowHours * 3600000;
}

export function istParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value || "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return { day: day < 0 ? 0 : day, hour };
}

export function scheduleOpen(input: { days: string; startHour: number | null; endHour: number | null }, now = new Date()) {
  const { day, hour } = istParts(now);
  const days = input.days.split(",").map((part) => part.trim()).filter(Boolean);
  if (days.length && !days.includes(String(day))) return false;
  if (input.startHour == null || input.endHour == null) return true;
  const start = input.startHour;
  const end = input.endHour;
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

const actionRank: Record<string, number> = { flag: 1, reject: 2, pause: 3 };

export function stricterAction(current: string, next: string) {
  return (actionRank[next] || 0) > (actionRank[current] || 0) ? next : current;
}

export function cleanScheduleDays(value: string) {
  const days = new Set<string>();
  for (const part of value.split(/[^0-9]+/)) {
    if (part !== "" && Number(part) >= 0 && Number(part) <= 6) days.add(String(Number(part)));
  }
  return [...days].sort().join(",");
}

export const DAY_MS_FOR_TESTS = DAY_MS;
