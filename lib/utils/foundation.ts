export interface FoundationData {
  role: string;
  focus: string;
  differentiator?: string;
  jobDescription: string;
  primaryTopics: string[];
  avoidTopics: string[];
  postingGoals: string[];
}

export function buildJobDescription(roleValue: string, focusValue: string, differentiatorValue?: string) {
  const cleanRole = roleValue.trim();
  const cleanFocus = focusValue.trim();
  const cleanDifferentiator = differentiatorValue?.trim();

  if (!cleanRole || !cleanFocus) {
    return '';
  }

  const base = `I'm ${cleanRole}, focused on ${cleanFocus}.`;
  return cleanDifferentiator
    ? `${base} My perspective is shaped by ${cleanDifferentiator}.`
    : base;
}
