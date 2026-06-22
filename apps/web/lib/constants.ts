export const DEPARTMENTS = [
  "Mechanical Engineering",
  "Computer Engineering",
  "Information Technology",
  "Electrical Engineering",
  "Civil Engineering",
  "Electronics & Telecommunication",
  "Other",
] as const;

export const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export const REPORT_TYPES = [
  { value: "seminar", label: "Seminar Report" },
  { value: "mini-project", label: "Mini Project Report" },
  { value: "internship", label: "Internship Report" },
  { value: "lab", label: "Lab Report" },
  { value: "research", label: "Research Report" },
] as const;
