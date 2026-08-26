import re
from app.services.skill_taxonomy import get_all_extracted_skills_flat, normalize_skill_name

def extract_skills(text: str):
    """Extract and normalize all skills using the 200+ skill taxonomy."""
    return get_all_extracted_skills_flat(text)

def match_resume_job(
    resume_text: str,
    job_description: str
):
    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_description)

    resume_skills_set = set(resume_skills)
    job_skills_set = set(job_skills)

    matched_skills = sorted(list(resume_skills_set.intersection(job_skills_set)))
    missing_skills = sorted(list(job_skills_set.difference(resume_skills_set)))

    if len(job_skills_set) == 0:
        match_percentage = 0
    else:
        match_percentage = round(
            len(matched_skills) / len(job_skills_set) * 100
        )

    recommendations = [f"Add experience with {skill}." for skill in missing_skills]

    return {
        "match_percentage": match_percentage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "recommendations": recommendations
    }