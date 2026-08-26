import re
from typing import Dict, List, Any, Optional
from app.services.skill_taxonomy import extract_categorized_skills, get_all_extracted_skills_flat, normalize_skill_name

# Canonical Sections Mapping
SECTION_PATTERNS = {
    "summary": [
        r"^summary$", r"^professional summary$", r"^profile$", r"^career profile$",
        r"^objective$", r"^career objective$", r"^about me$", r"^executive summary$"
    ],
    "education": [
        r"^education$", r"^academic background$", r"^academic qualifications$",
        r"^educational qualification$", r"^academics$", r"^education background$"
    ],
    "experience": [
        r"^experience$", r"^work experience$", r"^professional experience$",
        r"^employment history$", r"^work history$", r"^career history$", r"^internships?$"
    ],
    "projects": [
        r"^projects$", r"^academic projects$", r"^personal projects$",
        r"^key projects$", r"^technical projects$", r"^featured projects$"
    ],
    "skills": [
        r"^skills$", r"^technical skills$", r"^technologies$", r"^core competencies$",
        r"^skills & expertise$", r"^tech stack$", r"^key skills$", r"^skills & abilities$"
    ],
    "certifications": [
        r"^certifications$", r"^certificates$", r"^licenses & certifications$",
        r"^professional certifications$", r"^courses & certifications$"
    ],
    "achievements": [
        r"^achievements$", r"^honors & awards$", r"^awards$", r"^accomplishments$",
        r"^key achievements$", r"^recognitions$"
    ],
    "languages": [
        r"^languages$", r"^languages known$", r"^language proficiency$"
    ]
}

def detect_sections(text: str) -> Dict[str, str]:
    """
    Split resume text into normalized section headings and their respective body text.
    """
    lines = text.split("\n")
    sections: Dict[str, List[str]] = {}
    current_section = "header"
    sections[current_section] = []

    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue

        is_heading = False
        matched_canonical = None

        if len(cleaned_line) < 45:
            normalized_line = re.sub(r"[:\-_#\*]", "", cleaned_line).strip().lower()
            for canonical, regexes in SECTION_PATTERNS.items():
                for pattern in regexes:
                    if re.match(pattern, normalized_line):
                        is_heading = True
                        matched_canonical = canonical
                        break
                if is_heading:
                    break

        if is_heading and matched_canonical:
            current_section = matched_canonical
            if current_section not in sections:
                sections[current_section] = []
        else:
            sections[current_section].append(cleaned_line)

    return {sec: "\n".join(body_lines) for sec, body_lines in sections.items()}

def extract_contact_info(text: str) -> Dict[str, Any]:
    """
    Deterministic extraction for Email, Phone (Indian + International), LinkedIn, GitHub, Portfolio, Name.
    """
    # 1. Email
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    email_match = re.search(email_pattern, text)
    email = email_match.group(0) if email_match else None

    # 2. Phone
    phone_pattern = r"(?:(?:\+?91[\-\s]?)?\(?\d{3,5}\)?[\-\s]?\d{3,5}[\-\s]?\d{3,5}|\+?\d{1,3}[\-\s]?\(?\d{2,4}\)?[\-\s]?\d{3,4}[\-\s]?\d{3,4})"
    phone_matches = re.findall(phone_pattern, text)
    phone = None
    for p in phone_matches:
        digits = re.sub(r"\D", "", p)
        if 10 <= len(digits) <= 13:
            phone = p.strip()
            break

    # 3. LinkedIn
    linkedin_pattern = r"(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+/??"
    linkedin_match = re.search(linkedin_pattern, text, re.IGNORECASE)
    linkedin = linkedin_match.group(0) if linkedin_match else None

    # 4. GitHub
    github_pattern = r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_-]+/??"
    github_match = re.search(github_pattern, text, re.IGNORECASE)
    github = github_match.group(0) if github_match else None

    # 5. Portfolio / General Links
    url_pattern = r"https?://(?:www\.)?[a-zA-Z0-9./_-]+"
    all_urls = re.findall(url_pattern, text, re.IGNORECASE)
    portfolio = None
    for url in all_urls:
        if "linkedin.com" not in url.lower() and "github.com" not in url.lower():
            portfolio = url
            break

    # 6. Name Extraction
    name = None
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    header_lines = lines[:5] if len(lines) >= 5 else lines

    for line in header_lines:
        if re.search(r"(@|http|www|phone|resume|curriculum|cv|\+?\d{10})", line, re.IGNORECASE):
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(re.match(r"^[A-Za-z.\s'-]+$", w) for w in words):
            name = line.title()
            break

    if not name and email:
        username = email.split("@")[0]
        cleaned_uname = re.sub(r"\d+", "", username).replace(".", " ").replace("_", " ").strip()
        if len(cleaned_uname) >= 3:
            name = cleaned_uname.title()

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "portfolio": portfolio
    }

def extract_experience(text: str) -> List[Dict[str, Any]]:
    """Extract experience items including company, position, dates, duration, achievements."""
    experiences = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Prioritize Month Year patterns over raw 4-digit years
    date_pattern = r"(?i)\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}/\d{4})\s+\d{4}\b\s*(?:-|to|–)\s*(?:\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}/\d{4})\s+\d{4}\b|present|current)|\b(?:19|20)\d{2}\s*(?:-|to|–)\s*(?:(?:19|20)\d{2}|present|current)\b"

    current_item: Optional[Dict[str, Any]] = None

    for line in lines:
        date_match = re.search(date_pattern, line)
        if date_match:
            if current_item:
                experiences.append(current_item)
            dates_str = date_match.group(0)
            parts = re.split(r"-|to|–", dates_str, flags=re.IGNORECASE)
            start_d = parts[0].strip() if len(parts) > 0 else ""
            end_d = parts[1].strip() if len(parts) > 1 else "Present"

            title_part = line.replace(dates_str, "").strip(" -|,")
            title_words = title_part.split(" at ")
            role = title_words[0].strip() if len(title_words) > 0 else "Software Professional"
            company = title_words[1].strip() if len(title_words) > 1 else "Company"

            current_item = {
                "company": company if company else "Company",
                "position": role if role else "Position",
                "description": "",
                "start_date": start_d,
                "end_date": end_d
            }
        elif current_item:
            current_item["description"] += " " + line

    if current_item:
        experiences.append(current_item)

    for exp in experiences:
        exp["description"] = exp["description"].strip()[:300]

    return experiences

def extract_education(text: str) -> List[Dict[str, Any]]:
    """Extract education history including institution, degree, field of study, years, GPA."""
    education_list = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    degree_keywords = ["bachelor", "master", "b.tech", "m.tech", "b.e", "m.e", "b.sc", "m.sc", "phd", "diploma", "bs", "ms"]

    for line in lines:
        line_lower = line.lower()
        if any(deg in line_lower for deg in degree_keywords):
            year_match = re.search(r"\b(19|20)\d{2}\b", line)
            year = int(year_match.group(0)) if year_match else None

            grade_match = re.search(r"(?i)(?:cgpa|gpa|percentage|marks?)\s*:?\s*(\d+(?:\.\d+)?(?:\s*%)?)", line)
            grade = grade_match.group(1) if grade_match else ""

            education_list.append({
                "institution": line[:80],
                "degree": line[:60],
                "field_of_study": "",
                "start_year": None,
                "end_year": year,
                "grade": grade
            })

    return education_list

def extract_projects(text: str) -> List[Dict[str, Any]]:
    """Extract projects with title, description, technologies used, GitHub links."""
    projects = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    for line in lines:
        if len(line) > 10 and not line.startswith("-"):
            techs = get_all_extracted_skills_flat(line)
            github = re.search(r"github\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+|github\.com/[a-zA-Z0-9_-]+", line)
            projects.append({
                "title": line[:60],
                "description": line[:250],
                "technologies": ", ".join(techs),
                "github_url": github.group(0) if github else ""
            })
            if len(projects) >= 5:
                break

    return projects

def extract_certifications(text: str) -> List[Dict[str, Any]]:
    """Extract certifications with name, provider, issue date."""
    certs = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        if any(kw in line.lower() for kw in ["certified", "certification", "aws", "azure", "coursera", "udemy", "cka"]):
            certs.append({
                "name": line[:80],
                "provider": "Online Provider" if any(p in line.lower() for p in ["coursera", "udemy", "nptel"]) else "Issuer",
                "issue_date": "",
                "credential_url": ""
            })
            if len(certs) >= 5:
                break
    return certs

def extract_achievements(text: str) -> List[str]:
    """Detect measurable achievements with metrics e.g. 'Improved performance by 40%'."""
    achievements = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    metric_pattern = r"(?i)(?:\d+%\s*|\d+\+\s*|\$\d+|by\s+\d+%|reduced|improved|increased|built for \d+)"

    for line in lines:
        if re.search(metric_pattern, line):
            achievements.append(line[:150])
            if len(achievements) >= 5:
                break
    return achievements

def parse_resume_structure(text: str) -> Dict[str, Any]:
    """
    Main deterministic parser combining section detection, contact extraction,
    skill taxonomy extraction, experience, education, projects, certs, achievements.
    """
    sections = detect_sections(text)
    contacts = extract_contact_info(text)
    categorized_skills = extract_categorized_skills(text)
    flat_skills = get_all_extracted_skills_flat(text)

    summary_text = sections.get("summary", "") or (text[:300] if text else "")
    exp_text = sections.get("experience", text)
    edu_text = sections.get("education", text)
    proj_text = sections.get("projects", text)
    cert_text = sections.get("certifications", text)

    return {
        "name": contacts["name"],
        "email": contacts["email"],
        "phone": contacts["phone"],
        "linkedin": contacts["linkedin"],
        "github": contacts["github"],
        "portfolio": contacts["portfolio"],
        "summary": summary_text.strip(),
        "skills": flat_skills,
        "categorized_skills": categorized_skills,
        "programming_languages": categorized_skills.get("programming_languages", []),
        "frontend": categorized_skills.get("frontend", []),
        "backend": categorized_skills.get("backend", []),
        "databases": categorized_skills.get("databases", []),
        "cloud": categorized_skills.get("cloud", []),
        "devops": categorized_skills.get("devops", []),
        "ai_ml": categorized_skills.get("ai_ml", []),
        "tools": categorized_skills.get("tools", []),
        "soft_skills": categorized_skills.get("soft_skills", []),
        "experience": extract_experience(exp_text),
        "education": extract_education(edu_text),
        "projects": extract_projects(proj_text),
        "certifications": extract_certifications(cert_text),
        "achievements": extract_achievements(text),
        "languages": [{"language": "English", "proficiency": "Full Professional"}] if "english" in text.lower() else []
    }
