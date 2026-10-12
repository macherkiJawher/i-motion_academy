export function safeReturnPath(value: string | undefined) {
  if (!value || !/^\/(sessions|trainings)\/[A-Za-z0-9_-]+$/.test(value)) return null;
  return value;
}