export const DEFAULT_TOPICS = ["ai", "startups", "engineering", "devops"] as const;

export const AVAILABLE_TOPICS = [
  "ai",
  "startups",
  "engineering",
  "devops",
  "security",
  "frontend",
  "backend",
  "data-science",
  "mobile",
  "cloud",
] as const;

export const DEFAULT_DELIVERY_HOUR = 7; // 7:00 AM local time
export const DEFAULT_TIMEZONE = "UTC";

export const PERSONA_OPTIONS = [
  "Founder / CEO",
  "CTO",
  "Tech Lead",
  "Senior Developer",
  "Software Engineer",
  "Product Manager",
  "Engineering Student",
  "Indie Hacker",
] as const;

export const AUTH_COOKIE_NAME = "firstcup_session";
export const COOKIE_DOMAIN = ".firstcup.tech";
