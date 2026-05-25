function normalizeSkill(raw) {
  return (raw || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function splitSkills(raw) {
  const text = (raw || '').toString();
  if (!text.trim()) return [];

  return text
    .split(/[\n,|/]+/g)
    .map((s) => normalizeSkill(s))
    .filter(Boolean);
}

function isMatch(requiredSkill, seekerSkills) {
  const r = normalizeSkill(requiredSkill);
  if (!r) return false;

  return seekerSkills.some((s) => {
    if (!s) return false;
    return s === r || s.includes(r) || r.includes(s);
  });
}

/**
 * Computes a simple match percentage based on skill overlap.
 *
 * - Uses profile.skills and job.skills_required (comma/line separated)
 * - Returns null when it cannot estimate (missing inputs)
 */
export function computeJobMatchPercent({ profileSkills, hasResume, jobSkillsRequired }) {
  const required = splitSkills(jobSkillsRequired);
  const seeker = splitSkills(profileSkills);

  if (!required.length) return null;
  if (!seeker.length) return 0;

  const matched = required.filter((r) => isMatch(r, seeker)).length;
  const base = Math.round((matched / required.length) * 100);

  const boosted = hasResume ? Math.min(100, base + 5) : base;
  return boosted;
}
