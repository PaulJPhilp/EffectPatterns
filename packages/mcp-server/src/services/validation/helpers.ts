/**
 * Legacy validation functions (for backward compatibility)
 */
export function validatePatternId(id: string): boolean {
  const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return idPattern.test(id) && id.length >= 3 && id.length <= 100;
}

export function validateSkillLevel(
  level: string
): level is "beginner" | "intermediate" | "advanced" {
  return ["beginner", "intermediate", "advanced"].includes(level);
}
