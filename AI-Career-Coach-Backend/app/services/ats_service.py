import re
from typing import Dict, List, Any
from app.services.skill_taxonomy import extract_categorized_skills, SKILL_TAXONOMY, normalize_skill_name
from app.services.job_match_service import match_resume_job

ACTION_VERBS_GOOD = [
    "developed", "designed", "implemented", "created", "built", "managed",
    "optimized", "improved", "deployed", "integrated", "led", "architected",
    "automated", "engineered", "spearheaded", "orchestrated", "accelerated"
]

WEAK_ACTION_PHRASES = [
    "worked on", "responsible for", "helped with", "participated in",
    "assisted in", "handled", "involved in"
]

def calculate_ats_score(parsed_profile: Dict[str, Any], resume_text: str = "") -> Dict[str, Any]:
    """
    Deterministic transparent ATS scoring engine (Without JD):
    Contact Info:        10% (Email, Phone, LinkedIn, GitHub/Portfolio)
    Skills Coverage:     15% (Categorized diversity, skill count)
    Section Complete:    15% (Summary, Experience, Education, Projects, Skills, Certs)
    Experience Quality:  15% (Position titles, dates, descriptions, action verbs)
    Education:           10% (Degree, Institution)
    Projects:            10% (Count, descriptions, GitHub links)
    Achievements:        10% (Quantifiable metrics regex e.g. 'improved by 40%')
    Readability:         15% (Word count 200-800, action verbs, no weak phrases)
    Total: 100%
    """
    text_lower = resume_text.lower() if resume_text else ""

    # 1. Contact Info (10%)
    contact_score = 0
    if parsed_profile.get("email"): contact_score += 40
    if parsed_profile.get("phone"): contact_score += 30
    if parsed_profile.get("linkedin"): contact_score += 15
    if parsed_profile.get("github") or parsed_profile.get("portfolio"): contact_score += 15
    contact_score = min(contact_score, 100)

    # 2. Skills Coverage (15%)
    skills = parsed_profile.get("skills", [])
    cat_skills = parsed_profile.get("categorized_skills", {})
    non_empty_cats = sum(1 for c, s_list in cat_skills.items() if len(s_list) > 0)
    skills_score = min(len(skills) * 8 + non_empty_cats * 10, 100)

    # 3. Section Completeness (15%)
    sections_found = 0
    if parsed_profile.get("summary"): sections_found += 1
    if parsed_profile.get("experience"): sections_found += 1
    if parsed_profile.get("education"): sections_found += 1
    if parsed_profile.get("projects"): sections_found += 1
    if parsed_profile.get("skills"): sections_found += 1
    if parsed_profile.get("certifications") or parsed_profile.get("achievements"): sections_found += 1
    section_score = min(round((sections_found / 6.0) * 100), 100)

    # 4. Experience Quality (15%)
    exps = parsed_profile.get("experience", [])
    if exps:
        exp_score = min(len(exps) * 35 + (30 if any(e.get("description") for e in exps) else 0), 100)
    else:
        exp_score = 40

    # 5. Education (10%)
    edus = parsed_profile.get("education", [])
    edu_score = min(len(edus) * 50, 100) if edus else 40

    # 6. Projects (10%)
    projs = parsed_profile.get("projects", [])
    proj_score = min(len(projs) * 35 + (30 if any(p.get("github_url") for p in projs) else 0), 100) if projs else 30

    # 7. Achievements (10%)
    achievements = parsed_profile.get("achievements", [])
    has_quantifiable = bool(re.search(r"\b(?:\d+%\s*|\d+\+\s*|\$\d+|by\s+\d+%|reduced by|improved by)\b", text_lower))
    ach_score = min(len(achievements) * 25 + (35 if has_quantifiable else 0), 100)

    # 8. Readability & Formatting (15%)
    words = text_lower.split()
    word_count = len(words)
    length_score = 100 if 150 <= word_count <= 900 else (60 if word_count > 900 else 40)
    verb_matches = sum(1 for verb in ACTION_VERBS_GOOD if verb in text_lower)
    readability_score = min(round(length_score * 0.5 + verb_matches * 5), 100)

    # Weighted Sum
    weighted_ats = round(
        (contact_score * 0.10) +
        (skills_score * 0.15) +
        (section_score * 0.15) +
        (exp_score * 0.15) +
        (edu_score * 0.10) +
        (proj_score * 0.10) +
        (ach_score * 0.10) +
        (readability_score * 0.15)
    )

    ats_score = min(max(weighted_ats, 20), 100)

    score_breakdown = {
        "overall": ats_score,
        "contact_information": contact_score,
        "skills_coverage": skills_score,
        "section_completeness": section_score,
        "experience": exp_score,
        "education": edu_score,
        "projects": proj_score,
        "achievements": ach_score,
        "readability": readability_score
    }

    found_weak = [phrase for phrase in WEAK_ACTION_PHRASES if phrase in text_lower]
    simulator = simulate_ats_improvements(score_breakdown, parsed_profile, found_weak)

    return {
        "ats_score": ats_score,
        "score_breakdown": score_breakdown,
        "weak_phrases_found": found_weak,
        "action_verb_suggestions": [f"Replace '{w}' with stronger verbs like Developed, Implemented, Engineered, or Optimized." for w in found_weak[:4]],
        "ats_simulator": simulator
    }

def simulate_ats_improvements(breakdown: Dict[str, int], profile: Dict[str, Any], weak_phrases: List[str]) -> List[Dict[str, Any]]:
    simulations = []
    current_score = breakdown.get("overall", 50)

    if breakdown.get("contact_information", 100) < 100:
        missing = []
        if not profile.get("linkedin"): missing.append("LinkedIn URL")
        if not profile.get("github"): missing.append("GitHub / Portfolio")
        simulations.append({
            "action": f"Add missing contact links ({', '.join(missing)})",
            "current_score": current_score,
            "estimated_score": min(current_score + 5, 100),
            "estimated_increase": "+5%"
        })

    if breakdown.get("achievements", 100) < 80:
        simulations.append({
            "action": "Quantify project & role achievements with percentages or metrics (e.g. 'Improved speed by 35%')",
            "current_score": current_score,
            "estimated_score": min(current_score + 8, 100),
            "estimated_increase": "+8%"
        })

    if weak_phrases:
        simulations.append({
            "action": f"Replace weak action phrases ('{weak_phrases[0]}') with high-impact verbs (e.g. 'Spearheaded', 'Architected')",
            "current_score": current_score,
            "estimated_score": min(current_score + 6, 100),
            "estimated_increase": "+6%"
        })

    if breakdown.get("skills_coverage", 100) < 80:
        simulations.append({
            "action": "Add categorized technical skills & relevant certifications",
            "current_score": current_score,
            "estimated_score": min(current_score + 7, 100),
            "estimated_increase": "+7%"
        })

    return simulations

def calculate_job_specific_ats(parsed_profile_or_text: Any, resume_text_or_jd: str, job_description: str = None) -> Dict[str, Any]:
    """
    Calculate ATS & Job Match when Job Description is provided.
    Supports:
    - calculate_job_specific_ats(resume_text, job_description)
    - calculate_job_specific_ats(parsed_profile, resume_text, job_description)
    """
    from app.services.resume_parser import parse_resume_structure

    if job_description is None:
        # Two argument invocation: (resume_text, job_description)
        resume_text = str(parsed_profile_or_text or "")
        job_description = str(resume_text_or_jd or "")
        parsed_profile = parse_resume_structure(resume_text)
    else:
        # Three argument invocation: (parsed_profile, resume_text, job_description)
        if isinstance(parsed_profile_or_text, dict):
            parsed_profile = parsed_profile_or_text
            resume_text = str(resume_text_or_jd or "")
        else:
            resume_text = str(parsed_profile_or_text or "")
            parsed_profile = parse_resume_structure(resume_text)

    general_ats = calculate_ats_score(parsed_profile, resume_text)
    job_match = match_resume_job(resume_text, job_description)

    jd_lower = job_description.lower()
    text_lower = resume_text.lower()

    jd_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", jd_lower))
    stopwords = {"and", "the", "for", "with", "that", "this", "from", "have", "will", "your", "are", "our", "you", "who", "must", "with", "seeking", "looking"}
    jd_keywords = [w for w in jd_words if w not in stopwords]

    matched_keywords = [w for w in jd_keywords if w in text_lower]
    missing_keywords = [w for w in jd_keywords if w not in text_lower][:15]

    keyword_match_pct = round((len(matched_keywords) / max(len(jd_keywords), 1)) * 100)
    skill_match_pct = job_match.get("match_percentage", 0)

    job_match_score = round((skill_match_pct * 0.6) + (min(keyword_match_pct, 100) * 0.4))

    # Normalize skill names
    normalized_matched = [normalize_skill_name(s) for s in job_match.get("matched_skills", [])]
    normalized_missing = [normalize_skill_name(s) for s in job_match.get("missing_skills", [])]

    return {
        "ats_score": general_ats["ats_score"],
        "job_match": job_match_score,
        "job_match_score": job_match_score,
        "keyword_match_pct": min(keyword_match_pct, 100),
        "skill_match_pct": skill_match_pct,
        "matched_skills": sorted(list(set(normalized_matched))),
        "missing_skills": sorted(list(set(normalized_missing))),
        "matched_keywords": matched_keywords[:20],
        "missing_keywords": missing_keywords,
        "recommendations": job_match.get("recommendations", []),
        "score_breakdown": general_ats["score_breakdown"],
        "ats_simulator": general_ats["ats_simulator"]
    }