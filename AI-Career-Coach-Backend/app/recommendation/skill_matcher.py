from typing import List, Dict


class SkillMatcher:
    """
    Compares user skills with required job skills.
    """

    def normalize(self, skills: List[str]) -> List[str]:
        cleaned = []

        for skill in skills:

            if not skill:
                continue

            skill = skill.strip().lower()

            if skill not in cleaned:
                cleaned.append(skill)

        return cleaned

    def calculate_match(
        self,
        user_skills: List[str],
        required_skills: List[str]
    ) -> Dict:

        user = set(self.normalize(user_skills))
        required = set(self.normalize(required_skills))

        matched = sorted(list(user.intersection(required)))
        missing = sorted(list(required.difference(user)))

        score = 0

        if len(required) > 0:
            score = round(
                (len(matched) / len(required)) * 100,
                2
            )

        return {
            "match_percentage": score,
            "matched_skills": matched,
            "missing_skills": missing
        }


skill_matcher = SkillMatcher()