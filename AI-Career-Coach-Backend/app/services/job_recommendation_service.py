"""
job_recommendation_service.py

Comprehensive Job Recommendation & Intelligent Matching Engine.

Implements:
1. extract_resume_profile()
2. extract_job_requirements()
3. calculate_resume_job_match() with real evidence extraction
4. calculate_assessment_job_match() with skill discrepancy & confidence analysis
5. calculate_combined_match()
6. filter_recommended_jobs() (Strictly >= 60%)
7. rank_recommended_jobs()
8. validate_url() / application status checks
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.company import Company
from app.models.resume import Resume
from app.models.job_application import JobApplication
from app.models.adaptive_assessment import AdaptiveAssessment
from app.providers.base import validate_url, strip_html
from app.recommendation.job_matcher import JOB_DATABASE
from app.services.job_search_service import search_jobs
from app.services.skill_taxonomy import (
    SKILL_TAXONOMY,
    SKILL_ALIASES,
    extract_categorized_skills,
    get_all_extracted_skills_flat,
    normalize_skill_name
)
from app.services.resume_parser import parse_resume_structure

logger = logging.getLogger(__name__)

# Standard comprehensive job catalogue with rich requirements
EXPANDED_JOB_CATALOGUE = [
    {
        "job_title": "Senior Backend Engineer",
        "company": "ImagineArt",
        "companies": ["ImagineArt"],
        "location": "Bengaluru, India / Remote",
        "work_mode": "Remote",
        "salary_range": "₹24-35 LPA",
        "experience": "3-6 Years",
        "employment_type": "Full-Time",
        "description": "Design, build, and maintain high-throughput backend services, microservices APIs, and data processing pipelines. Collaborate with ML teams to serve low-latency AI inference endpoints.",
        "responsibilities": [
            "Architect and develop scalable RESTful and gRPC APIs using Python and FastAPI.",
            "Design database schemas, optimize queries, and manage migrations with PostgreSQL and Redis.",
            "Containerize microservices using Docker and deploy with Kubernetes on AWS.",
            "Implement CI/CD pipelines, automated testing, and observability monitoring.",
            "Collaborate with frontend engineers and product leads on feature execution."
        ],
        "required_skills": ["python", "fastapi", "postgresql", "rest api", "docker", "git"],
        "preferred_skills": ["kubernetes", "aws", "redis", "microservices", "celery"],
        "critical_skills": ["python", "fastapi", "postgresql", "rest api"],
        "education": "Bachelor's degree in Computer Science, Engineering, or related technical field.",
        "certifications": ["AWS Certified Solutions Architect", "CKA (Certified Kubernetes Administrator)"],
        "domain": "AI & Media Generation",
        "status": "Open",
        "deadline": "2026-09-30",
        "apply_url": "https://imagineart.ai/careers/senior-backend-engineer",
        "source": "local_catalogue"
    },
    {
        "job_title": "Python Backend Developer",
        "company": "Infosys",
        "companies": ["Infosys", "TCS", "Cognizant"],
        "location": "Bangalore, India",
        "work_mode": "Hybrid",
        "salary_range": "₹8-14 LPA",
        "experience": "1-3 Years",
        "employment_type": "Full-Time",
        "description": "Develop and maintain core enterprise backend APIs, implement business logic, write automated tests, and collaborate with database administrators.",
        "responsibilities": [
            "Build secure, performant REST APIs using Python and FastAPI or Django.",
            "Write efficient SQL queries, stored procedures, and ORM models for PostgreSQL.",
            "Write comprehensive unit and integration tests using Pytest.",
            "Participate in Agile sprint planning, daily standups, and peer code reviews."
        ],
        "required_skills": ["python", "fastapi", "sql", "postgresql", "git", "rest api"],
        "preferred_skills": ["docker", "django", "redis", "linux"],
        "critical_skills": ["python", "fastapi", "sql", "postgresql"],
        "education": "B.E. / B.Tech / MCA in Computer Science, IT, or related discipline.",
        "certifications": [],
        "domain": "Enterprise Software & Cloud Services",
        "status": "Open",
        "deadline": "2026-09-15",
        "apply_url": "https://career.infosys.com/jobs/python-backend-dev",
        "source": "local_catalogue"
    },
    {
        "job_title": "Full Stack Developer",
        "company": "Zoho",
        "companies": ["Zoho", "Freshworks", "Oracle"],
        "location": "Chennai, India",
        "work_mode": "On-site",
        "salary_range": "₹10-18 LPA",
        "experience": "1-4 Years",
        "employment_type": "Full-Time",
        "description": "Develop modern, responsive single-page web applications from front to back. Build reusable UI components in React and clean, performant backend endpoints.",
        "responsibilities": [
            "Develop modern, accessible web interfaces using React, TypeScript, and Tailwind CSS.",
            "Build backend REST APIs with Python/FastAPI or Node.js.",
            "Integrate third-party APIs and implement secure JWT authentication.",
            "Optimize frontend asset bundle size and web vitals performance."
        ],
        "required_skills": ["react", "javascript", "typescript", "python", "sql", "html", "css", "git"],
        "preferred_skills": ["fastapi", "tailwind", "next.js", "docker", "redux"],
        "critical_skills": ["react", "javascript", "python", "sql"],
        "education": "Bachelor's in Computer Science, Information Technology, or relevant degree.",
        "certifications": [],
        "domain": "SaaS & Productivity Tools",
        "status": "Open",
        "deadline": "2026-10-01",
        "apply_url": "https://www.zoho.com/careers/full-stack-engineer.html",
        "source": "local_catalogue"
    },
    {
        "job_title": "AI / Machine Learning Engineer",
        "company": "Google",
        "companies": ["Google", "Microsoft", "OpenAI"],
        "location": "Hyderabad, India / Remote",
        "work_mode": "Hybrid",
        "salary_range": "₹28-45 LPA",
        "experience": "2-5 Years",
        "employment_type": "Full-Time",
        "description": "Develop, fine-tune, and deploy state-of-the-art machine learning and deep learning models. Build high-performance inference pipelines and evaluation benchmarks.",
        "responsibilities": [
            "Build ML/DL models using PyTorch, TensorFlow, Scikit-learn, and Hugging Face.",
            "Design vector search retrieval (RAG) and embedding pipelines with ChromaDB or Pinecone.",
            "Deploy models as containerized microservices with Docker and Triton inference server.",
            "Benchmark and optimize model inference latency, accuracy, and memory consumption."
        ],
        "required_skills": ["python", "machine learning", "pytorch", "deep learning", "pandas", "numpy", "git"],
        "preferred_skills": ["tensorflow", "transformers", "rag", "docker", "fastapi", "aws"],
        "critical_skills": ["python", "machine learning", "pytorch", "deep learning"],
        "education": "Master's or Bachelor's in Computer Science, Artificial Intelligence, Data Science, or Mathematics.",
        "certifications": ["TensorFlow Developer Certificate", "AWS Certified Machine Learning - Specialty"],
        "domain": "Artificial Intelligence & Search",
        "status": "Open",
        "deadline": "2026-10-15",
        "apply_url": "https://careers.google.com/jobs/results/ai-engineer",
        "source": "local_catalogue"
    },
    {
        "job_title": "Frontend Engineer",
        "company": "Flipkart",
        "companies": ["Flipkart", "Swiggy", "Myntra"],
        "location": "Bengaluru, India",
        "work_mode": "Hybrid",
        "salary_range": "₹14-22 LPA",
        "experience": "2-4 Years",
        "employment_type": "Full-Time",
        "description": "Craft high-performance e-commerce user experiences with modern React, TypeScript, and state management. Deliver lightning-fast mobile-first interfaces.",
        "responsibilities": [
            "Build pixel-perfect, responsive UI components using React, TypeScript, and CSS modules.",
            "Manage global application state efficiently using Redux Toolkit or Zustand.",
            "Implement automated end-to-end and component tests using Jest and Cypress.",
            "Collaborate closely with UI/UX designers and product managers on iterative rollouts."
        ],
        "required_skills": ["react", "typescript", "javascript", "html", "css", "redux", "git"],
        "preferred_skills": ["next.js", "tailwind", "jest", "webpack", "webgl"],
        "critical_skills": ["react", "typescript", "javascript"],
        "education": "B.Tech/B.E. in Computer Science or equivalent practical experience.",
        "certifications": [],
        "domain": "E-commerce & Consumer Tech",
        "status": "Open",
        "deadline": "2026-09-25",
        "apply_url": "https://www.flipkartcareers.com/jobs/frontend-engineer",
        "source": "local_catalogue"
    },
    {
        "job_title": "Cloud & DevOps Engineer",
        "company": "Amazon Web Services",
        "companies": ["Amazon", "Microsoft", "Capgemini"],
        "location": "Bengaluru, India",
        "work_mode": "Hybrid",
        "salary_range": "₹20-32 LPA",
        "experience": "2-5 Years",
        "employment_type": "Full-Time",
        "description": "Design and manage resilient cloud infrastructure, automate deployment pipelines, implement security guardrails, and maintain 99.99% system availability.",
        "responsibilities": [
            "Manage container orchestration platforms using Kubernetes (EKS) and Docker.",
            "Author Infrastructure as Code (IaC) with Terraform and AWS CloudFormation.",
            "Configure CI/CD pipelines with GitHub Actions, GitLab CI, or Jenkins.",
            "Set up observability, log aggregation, and real-time alerting with Prometheus and Grafana."
        ],
        "required_skills": ["aws", "docker", "kubernetes", "linux", "ci/cd", "git", "bash"],
        "preferred_skills": ["terraform", "python", "prometheus", "grafana", "ansible"],
        "critical_skills": ["aws", "docker", "kubernetes", "linux"],
        "education": "Bachelor's in Computer Science, Information Systems, or equivalent experience.",
        "certifications": ["AWS Certified Solutions Architect", "CKA (Certified Kubernetes Administrator)"],
        "domain": "Cloud Infrastructure & Platform Engineering",
        "status": "Open",
        "deadline": "2026-10-31",
        "apply_url": "https://amazon.jobs/en/jobs/cloud-devops-engineer",
        "source": "local_catalogue"
    },
    {
        "job_title": "Java Enterprise Developer",
        "company": "TCS",
        "companies": ["TCS", "Wipro", "IBM"],
        "location": "Chennai, India",
        "work_mode": "On-site",
        "salary_range": "₹6-11 LPA",
        "experience": "1-3 Years",
        "employment_type": "Full-Time",
        "description": "Design and implement robust enterprise banking and financial services applications using Java, Spring Boot, and relational databases.",
        "responsibilities": [
            "Build secure microservices and REST APIs with Java and Spring Boot.",
            "Write database models and queries with Hibernate / Spring Data JPA and MySQL.",
            "Ensure code compliance with financial industry security standards.",
            "Debug production issues and write automated unit tests with JUnit and Mockito."
        ],
        "required_skills": ["java", "spring boot", "mysql", "git", "rest api", "sql"],
        "preferred_skills": ["docker", "microservices", "hibernate", "kafka", "maven"],
        "critical_skills": ["java", "spring boot", "mysql", "sql"],
        "education": "B.E./B.Tech/MCA/M.Sc in Computer Science or related engineering branch.",
        "certifications": ["Oracle Certified Professional: Java SE"],
        "domain": "Banking & Financial Services",
        "status": "Open",
        "deadline": "2026-09-20",
        "apply_url": "https://www.tcs.com/careers/java-developer",
        "source": "local_catalogue"
    },
    {
        "job_title": "Data Analyst / BI Specialist",
        "company": "Deloitte",
        "companies": ["Deloitte", "PwC", "EY"],
        "location": "Gurgaon, India",
        "work_mode": "Hybrid",
        "salary_range": "₹9-15 LPA",
        "experience": "1-3 Years",
        "employment_type": "Full-Time",
        "description": "Transform raw business data into actionable executive insights, dashboards, and predictive models using SQL, Python, and modern BI tools.",
        "responsibilities": [
            "Extract, clean, and transform multi-source datasets with SQL and Python (Pandas).",
            "Design interactive executive reports and KPI dashboards.",
            "Conduct statistical hypothesis testing and cohort analysis.",
            "Present analytical findings to senior stakeholders and business directors."
        ],
        "required_skills": ["sql", "python", "pandas", "numpy", "excel"],
        "preferred_skills": ["tableau", "power bi", "machine learning", "git"],
        "critical_skills": ["sql", "python", "pandas"],
        "education": "Bachelor's or Master's in Statistics, Mathematics, Computer Science, Economics, or Business Analytics.",
        "certifications": [],
        "domain": "Business Intelligence & Analytics",
        "status": "Open",
        "deadline": "2026-09-28",
        "apply_url": "https://jobs2.deloitte.com/careers/data-analyst",
        "source": "local_catalogue"
    }
]


class JobRecommendationService:
    """
    Intelligent Job Recommendation Service.
    Compares candidate profile (resume or assessment) against complete job requirements.
    Enforces strict >= 60% threshold, weighted scoring, and real resume evidence extraction.
    """

    def extract_resume_profile(self, resume: Any) -> Dict[str, Any]:
        """
        Extract structured technical profile, experience, projects, and education
        from a Resume model instance or raw text / analysis dict.
        """
        if not resume:
            return {
                "skills": [],
                "categorized_skills": {},
                "experience": [],
                "projects": [],
                "education": [],
                "certifications": [],
                "raw_text": "",
                "years_of_experience": 0,
                "summary": ""
            }

        # If it's a SQLAlchemy model instance
        if hasattr(resume, "raw_text"):
            raw_text = resume.raw_text or ""
            analysis_data = getattr(resume, "analysis_data", {}) or {}
            extracted_skills = getattr(resume, "extracted_skills", []) or []
            categorized = getattr(resume, "categorized_skills", {}) or {}
        elif isinstance(resume, dict):
            raw_text = resume.get("raw_text", "")
            analysis_data = resume.get("analysis_data", resume)
            extracted_skills = resume.get("skills", [])
            categorized = resume.get("categorized_skills", {})
        else:
            raw_text = str(resume)
            analysis_data = {}
            extracted_skills = []
            categorized = {}

        # If analysis data is missing, parse using deterministic parser
        if not categorized or not extracted_skills:
            parsed = parse_resume_structure(raw_text)
            extracted_skills = list(dict.fromkeys(extracted_skills + parsed.get("skills", [])))
            categorized = parsed.get("categorized_skills", {})
            experience = parsed.get("experience", [])
            projects = parsed.get("projects", [])
            education = parsed.get("education", [])
            certifications = parsed.get("certifications", [])
            summary = parsed.get("summary", "")
        else:
            experience = analysis_data.get("experience", [])
            projects = analysis_data.get("projects", [])
            education = analysis_data.get("education", [])
            certifications = analysis_data.get("certifications", [])
            summary = analysis_data.get("professional_summary", "")

        # Estimate years of experience
        years_exp = 0
        exp_count = len(experience)
        if exp_count > 0:
            years_exp = max(1, exp_count * 1.5)
        # Check text for patterns like "3+ years", "4 years of experience"
        match_years = re.search(r"(\d+)\+?\s*years?\s*(?:of)?\s*experience", raw_text, re.IGNORECASE)
        if match_years:
            try:
                years_exp = max(years_exp, float(match_years.group(1)))
            except ValueError:
                pass

        # Normalize all skills
        normalized_skills = [normalize_skill_name(s).lower() for s in extracted_skills if s]

        return {
            "skills": sorted(list(set(normalized_skills))),
            "categorized_skills": categorized,
            "experience": experience,
            "projects": projects,
            "education": education,
            "certifications": certifications,
            "raw_text": raw_text,
            "years_of_experience": years_exp,
            "summary": summary
        }

    def _find_resume_evidence(self, skill: str, resume_profile: Dict[str, Any]) -> str:
        """
        Locates genuine resume evidence for a matched skill from candidate's projects,
        work experience descriptions, or summary. Never fabricates evidence.
        """
        skill_norm = normalize_skill_name(skill).lower()
        raw_text = resume_profile.get("raw_text", "")
        projects = resume_profile.get("projects", [])
        experience = resume_profile.get("experience", [])

        # 1. Search in Projects
        for p in projects:
            title = p.get("title", "Project")
            desc = p.get("description", "")
            tech = p.get("technologies", "")
            if skill_norm in desc.lower() or skill_norm in tech.lower() or skill_norm in title.lower():
                # Extract snippet
                for sentence in desc.split("."):
                    if skill_norm in sentence.lower() and len(sentence.strip()) > 10:
                        return f"From project '{title}': \"{sentence.strip()}\""
                if tech and skill_norm in tech.lower():
                    return f"Utilized in project '{title}' ({tech})."
                return f"Implemented in project '{title}'."

        # 2. Search in Experience
        for exp in experience:
            pos = exp.get("position", "Role")
            comp = exp.get("company", "Company")
            desc = exp.get("description", "")
            if skill_norm in desc.lower() or skill_norm in pos.lower():
                for sentence in desc.split("."):
                    if skill_norm in sentence.lower() and len(sentence.strip()) > 10:
                        return f"From {pos} at {comp}: \"{sentence.strip()}\""
                return f"Applied during tenure as {pos} at {comp}."

        # 3. Search raw sentences in text
        if raw_text:
            sentences = re.split(r"[.\n•·-]", raw_text)
            for s in sentences:
                s_clean = s.strip()
                if skill_norm in s_clean.lower() and 15 <= len(s_clean) <= 140:
                    return f"Documented in resume: \"{s_clean}\""

        # 4. Fallback if explicitly listed in skills section
        return f"Verified technical skill detected in candidate profile."

    def extract_job_requirements(self, job_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize complete requirements from a job posting dictionary.
        """
        title = job_dict.get("job_title", "")
        desc = job_dict.get("description", "")
        raw_skills = job_dict.get("required_skills", [])
        if isinstance(raw_skills, str):
            raw_skills = [s.strip() for s in raw_skills.split(",") if s.strip()]

        normalized_req = [normalize_skill_name(s).lower() for s in raw_skills if s]
        if not normalized_req:
            # Extract from title and description using taxonomy
            normalized_req = [normalize_skill_name(s).lower() for s in get_all_extracted_skills_flat(f"{title} {desc}")]

        # Preferred skills
        preferred = job_dict.get("preferred_skills", [])
        if isinstance(preferred, str):
            preferred = [s.strip() for s in preferred.split(",") if s.strip()]
        normalized_pref = [normalize_skill_name(s).lower() for s in preferred if s]

        # Critical skills are the primary core skills (first 3-4 or explicitly marked)
        critical = job_dict.get("critical_skills", [])
        if not critical:
            critical = normalized_req[:4]
        normalized_crit = [normalize_skill_name(s).lower() for s in critical if s]

        # Experience parsing (e.g., "3-6 Years", "0-2 Years")
        exp_str = job_dict.get("experience", "0-2 Years")
        min_exp = 0.0
        exp_match = re.search(r"(\d+)(?:\s*-\s*(\d+))?", exp_str)
        if exp_match:
            try:
                min_exp = float(exp_match.group(1))
            except ValueError:
                min_exp = 0.0

        # Seniority level
        title_lower = title.lower()
        if "senior" in title_lower or "lead" in title_lower or "principal" in title_lower or min_exp >= 4:
            seniority = "Senior"
        elif "mid" in title_lower or min_exp >= 2:
            seniority = "Mid"
        else:
            seniority = "Entry / Junior"

        return {
            "title": title,
            "company": job_dict.get("company", "Company"),
            "location": job_dict.get("location", "Remote"),
            "work_mode": job_dict.get("work_mode", "Remote" if "remote" in job_dict.get("location", "").lower() else "Hybrid"),
            "salary_range": job_dict.get("salary_range", "Competitive"),
            "employment_type": job_dict.get("employment_type", "Full-Time"),
            "description": desc,
            "responsibilities": job_dict.get("responsibilities", []),
            "required_skills": normalized_req,
            "preferred_skills": normalized_pref,
            "critical_skills": normalized_crit,
            "experience_str": exp_str,
            "min_experience_years": min_exp,
            "seniority": seniority,
            "education": job_dict.get("education", "Bachelor's in Computer Science or related degree"),
            "certifications": job_dict.get("certifications", []),
            "domain": job_dict.get("domain", "Technology"),
            "status": job_dict.get("status", "Open"),
            "deadline": job_dict.get("deadline"),
            "apply_url": validate_url(job_dict.get("apply_url")),
            "job_url": validate_url(job_dict.get("job_url")),
            "source": job_dict.get("source", "catalogue")
        }

    def calculate_resume_job_match(
        self,
        resume_profile: Dict[str, Any],
        job_req: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates explainable, multi-dimensional match score between resume and job.
        Weights:
          - Technical Skills: 30% (Critical requirements weighted 2x)
          - Experience: 20%
          - Responsibilities: 15%
          - Seniority: 10%
          - Projects: 10%
          - Domain: 5%
          - Education/Certifications: 5%
          - Preferred Skills: 5%
        Returns exact status (MATCHED, PARTIAL, MISSING) and genuine resume evidence.
        """
        resume_skills_set = set(resume_profile.get("skills", []))
        raw_text_lower = resume_profile.get("raw_text", "").lower()
        req_skills = job_req.get("required_skills", [])
        crit_skills = set(job_req.get("critical_skills", []))
        pref_skills = job_req.get("preferred_skills", [])

        # 1. Technical Skills Analysis
        matched_items = []
        partial_items = []
        missing_items = []

        tech_points = 0.0
        max_tech_points = 0.0

        for skill in req_skills:
            weight = 2.0 if skill in crit_skills else 1.0
            max_tech_points += weight

            # Check direct match
            if skill in resume_skills_set or skill in raw_text_lower:
                evidence = self._find_resume_evidence(skill, resume_profile)
                matched_items.append({
                    "skill": normalize_skill_name(skill),
                    "status": "MATCHED",
                    "evidence": evidence
                })
                tech_points += weight
            else:
                # Check partial / related alias
                alias = SKILL_ALIASES.get(skill, "").lower()
                if alias and (alias in resume_skills_set or alias in raw_text_lower):
                    evidence = self._find_resume_evidence(alias, resume_profile)
                    partial_items.append({
                        "skill": normalize_skill_name(skill),
                        "status": "PARTIAL",
                        "evidence": f"Related skill detected ({alias}): \"{evidence}\""
                    })
                    tech_points += weight * 0.5
                else:
                    missing_items.append({
                        "skill": normalize_skill_name(skill),
                        "status": "MISSING",
                        "evidence": f"No {normalize_skill_name(skill)} experience detected in the active resume."
                    })

        # Preferred Skills coverage
        pref_matched_count = 0
        for p_skill in pref_skills:
            if p_skill in resume_skills_set or p_skill in raw_text_lower:
                pref_matched_count += 1
                matched_items.append({
                    "skill": normalize_skill_name(p_skill) + " (Preferred)",
                    "status": "MATCHED",
                    "evidence": self._find_resume_evidence(p_skill, resume_profile)
                })

        tech_score = round((tech_points / max_tech_points * 100), 1) if max_tech_points > 0 else 75.0
        preferred_score = round((pref_matched_count / max(len(pref_skills), 1) * 100), 1) if pref_skills else 80.0

        # 2. Experience Match
        candidate_years = resume_profile.get("years_of_experience", 0)
        req_years = job_req.get("min_experience_years", 0)
        if candidate_years >= req_years:
            exp_score = min(100.0, 85.0 + (candidate_years - req_years) * 5.0)
        elif candidate_years >= req_years * 0.6:
            exp_score = 75.0
        else:
            exp_score = max(50.0, 50.0 + (candidate_years / max(req_years, 1)) * 30.0)

        # 3. Responsibilities Match
        job_resps = job_req.get("responsibilities", [])
        resp_points = 0
        if job_resps:
            for resp in job_resps:
                resp_words = [w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", resp)]
                matches = sum(1 for w in resp_words if w in raw_text_lower)
                if matches >= 2:
                    resp_points += 1
            resp_score = round((resp_points / len(job_resps)) * 100, 1)
            resp_score = max(60.0, resp_score)  # baseline
        else:
            resp_score = tech_score

        # 4. Seniority Compatibility
        candidate_seniority = "Senior" if candidate_years >= 4 else "Mid" if candidate_years >= 1.5 else "Entry / Junior"
        job_seniority = job_req.get("seniority", "Mid")
        if candidate_seniority == job_seniority:
            seniority_score = 95.0
        elif (candidate_seniority == "Senior" and job_seniority == "Mid") or (candidate_seniority == "Mid" and job_seniority == "Entry / Junior"):
            seniority_score = 90.0
        elif candidate_seniority == "Mid" and job_seniority == "Senior":
            seniority_score = 72.0
        else:
            seniority_score = 60.0

        # 5. Project Depth Score
        projects = resume_profile.get("projects", [])
        proj_score = min(100.0, len(projects) * 35.0 + (30.0 if any(p.get("github_url") for p in projects) else 0.0)) if projects else 65.0

        # 6. Domain Experience
        domain = job_req.get("domain", "").lower()
        domain_score = 88.0 if any(w in raw_text_lower for w in domain.split()) else 72.0

        # 7. Education & Certifications
        edu_items = resume_profile.get("education", [])
        certs = resume_profile.get("certifications", [])
        edu_score = 95.0 if edu_items else 75.0
        if certs:
            edu_score = min(100.0, edu_score + 5.0)

        # Final Weighted Score
        weighted_score = (
            (tech_score * 0.30) +
            (exp_score * 0.20) +
            (resp_score * 0.15) +
            (seniority_score * 0.10) +
            (proj_score * 0.10) +
            (domain_score * 0.05) +
            (edu_score * 0.05) +
            (preferred_score * 0.05)
        )
        final_match_score = round(min(100.0, max(0.0, weighted_score)))

        # Categorize
        if final_match_score >= 90:
            category = "Exceptional Match"
        elif final_match_score >= 80:
            category = "Strong Match"
        elif final_match_score >= 70:
            category = "Good Match"
        else:
            category = "Moderate Match"

        critical_gaps = [m["skill"] for m in missing_items if m["skill"].lower() in crit_skills]

        # Determine application status
        app_status = "APPLICATION OPEN" if job_req.get("status", "Open").lower() == "open" else "APPLICATION CLOSED"

        return {
            "match_score": final_match_score,
            "match_category": category,
            "technical_match": round(tech_score),
            "experience_match": round(exp_score),
            "responsibility_match": round(resp_score),
            "seniority_match": round(seniority_score),
            "projects_match": round(proj_score),
            "domain_match": round(domain_score),
            "matched_skills_with_evidence": matched_items,
            "partial_skills": [p["skill"] for p in partial_items],
            "missing_skills": [m["skill"] for m in missing_items],
            "critical_gaps": critical_gaps,
            "application_status": app_status,
            "closing_date": job_req.get("deadline"),
            "application_url": job_req.get("apply_url"),
            "explanation": f"Overall match is {final_match_score}% based on {round(tech_score)}% technical coverage and {round(exp_score)}% experience alignment."
        }

    def calculate_assessment_job_match(
        self,
        assessment_report: Dict[str, Any],
        job_req: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates candidate's actual demonstrated knowledge in completed assessment
        against job requirements.
        Identifies verified capabilities and skill gaps.
        """
        strong_topics = [t.lower() for t in assessment_report.get("skill_analysis", {}).get("strong_areas", [])]
        weak_topics = [t.lower() for t in assessment_report.get("skill_analysis", {}).get("weak_areas", [])]
        overall_assessment_score = float(assessment_report.get("overall_career_score", 75.0))

        req_skills = job_req.get("required_skills", [])
        crit_skills = set(job_req.get("critical_skills", []))

        assessed_verified = []
        assessed_gaps = []

        for skill in req_skills:
            norm = skill.lower()
            if any(st in norm or norm in st for st in strong_topics):
                assessed_verified.append(normalize_skill_name(skill))
            elif any(wt in norm or norm in wt for wt in weak_topics):
                assessed_gaps.append(normalize_skill_name(skill))

        # Assessment alignment score
        if req_skills:
            align_pct = (len(assessed_verified) / len(req_skills)) * 100
        else:
            align_pct = overall_assessment_score

        assessment_match_score = round(align_pct * 0.5 + overall_assessment_score * 0.5)

        return {
            "assessment_score": overall_assessment_score,
            "assessment_match_score": assessment_match_score,
            "assessed_verified": assessed_verified,
            "assessed_gaps": assessed_gaps
        }

    def calculate_combined_match(
        self,
        resume_profile: Dict[str, Any],
        assessment_report: Dict[str, Any],
        job_req: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Combines resume evidence + self-assessment performance to validate
        whether candidate actually understands skills claimed on resume.
        """
        resume_match = self.calculate_resume_job_match(resume_profile, job_req)
        assess_match = self.calculate_assessment_job_match(assessment_report, job_req)

        strong_topics = set(t.lower() for t in assessment_report.get("skill_analysis", {}).get("strong_areas", []))
        weak_topics = set(t.lower() for t in assessment_report.get("skill_analysis", {}).get("weak_areas", []))
        resume_skills = set(resume_profile.get("skills", []))

        validations = []
        for item in resume_match["matched_skills_with_evidence"]:
            skill_clean = item["skill"].replace(" (Preferred)", "").lower()
            if any(st in skill_clean or skill_clean in st for st in strong_topics):
                validations.append({
                    "skill": item["skill"],
                    "resume_status": "MATCHED",
                    "assessment_status": "STRONG",
                    "final_confidence": "VERIFIED",
                    "detail": "Candidate demonstrated verified production-level competence in self-assessment."
                })
            elif any(wt in skill_clean or skill_clean in wt for wt in weak_topics):
                validations.append({
                    "skill": item["skill"],
                    "resume_status": "MATCHED",
                    "assessment_status": "WEAK",
                    "final_confidence": "RESUME EVIDENCE BUT KNOWLEDGE GAP",
                    "detail": "Appears on resume, but assessment identified current knowledge gaps. Recommend refresher."
                })
            else:
                validations.append({
                    "skill": item["skill"],
                    "resume_status": "MATCHED",
                    "assessment_status": "NOT DIRECTLY TESTED",
                    "final_confidence": "SUPPORTED BY RESUME",
                    "detail": "Verified from resume projects and experience history."
                })

        # Check for skills proven in assessment but absent on resume
        for st in strong_topics:
            if st not in resume_skills and any(st in req for req in job_req.get("required_skills", [])):
                validations.append({
                    "skill": normalize_skill_name(st),
                    "resume_status": "NOT FOUND ON RESUME",
                    "assessment_status": "STRONG",
                    "final_confidence": "CLAIMED/VERIFIED BY ASSESSMENT BUT NOT PRESENT ON RESUME",
                    "detail": "Demonstrated strong knowledge in assessment. Adding to resume is strongly recommended."
                })

        # Blended Score: 60% Resume Match + 40% Assessment Performance
        blended = round(resume_match["match_score"] * 0.60 + assess_match["assessment_match_score"] * 0.40)
        final_score = min(100, max(0, blended))

        # Re-categorize
        if final_score >= 90:
            category = "Exceptional Match"
        elif final_score >= 80:
            category = "Strong Match"
        elif final_score >= 70:
            category = "Good Match"
        else:
            category = "Moderate Match"

        result = dict(resume_match)
        result["match_score"] = final_score
        result["match_category"] = category
        result["assessment_validation"] = validations
        result["explanation"] = f"Combined match score of {final_score}% validates resume evidence against assessment accuracy ({assess_match['assessment_score']:.0f}% career readiness)."

        return result

    def filter_recommended_jobs(
        self,
        jobs: List[Dict[str, Any]],
        min_score: float = 60.0
    ) -> List[Dict[str, Any]]:
        """
        STRICT RECOMMENDATION FILTER:
        Only display jobs with match score >= 60%.
        Never display jobs below 60% in the main recommendation list.
        """
        return [j for j in jobs if j.get("match_score", 0) >= min_score]

    def rank_recommended_jobs(
        self,
        jobs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Sort jobs by:
        1. Highest match score
        2. Critical requirement coverage
        3. Experience compatibility
        4. Technical stack compatibility
        """
        def rank_key(j: Dict[str, Any]):
            match_score = j.get("match_score", 0)
            crit_gaps_count = len(j.get("critical_gaps", []))
            exp_match = j.get("experience_match", 0)
            tech_match = j.get("technical_match", 0)
            # higher match, fewer gaps, higher exp, higher tech
            return (match_score, -crit_gaps_count, exp_match, tech_match)

        return sorted(jobs, key=rank_key, reverse=True)

    def recommend_for_user(
        self,
        db: Session,
        user_id: int,
        mode: str = "resume",
        assessment_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Main recommendation entrypoint for authenticated user.
        Supports both paths:
          - mode='resume': Active resume extraction and matching
          - mode='assessment': Active resume + latest/specific assessment validation
        """
        # 1. Fetch Active Resume
        active_resume = db.query(Resume).filter(
            Resume.user_id == user_id,
            Resume.is_active == True
        ).order_by(Resume.upload_date.desc()).first()

        if not active_resume:
            # Fallback to latest resume
            active_resume = db.query(Resume).filter(
                Resume.user_id == user_id
            ).order_by(Resume.upload_date.desc()).first()

        if not active_resume:
            logger.info("No resume found for user %d in recommend_for_user.", user_id)
            return []

        resume_profile = self.extract_resume_profile(active_resume)

        # 2. Fetch Assessment if in assessment mode
        assessment_report = None
        if mode == "assessment":
            if assessment_id:
                adaptive = db.query(AdaptiveAssessment).filter(
                    AdaptiveAssessment.id == assessment_id,
                    AdaptiveAssessment.user_id == user_id
                ).first()
            else:
                adaptive = db.query(AdaptiveAssessment).filter(
                    AdaptiveAssessment.user_id == user_id,
                    AdaptiveAssessment.report.isnot(None)
                ).order_by(AdaptiveAssessment.created_at.desc()).first()

            if adaptive and adaptive.report:
                assessment_report = adaptive.report

        # 3. Gather Available Jobs from Database & Expanded Catalogue
        aggregated_jobs: List[Dict[str, Any]] = []
        try:
            db_jobs = db.query(Job).filter(Job.status != "Archived").all()
            for dj in db_jobs:
                company_name = dj.company.name if dj.company else "Tech Company"
                aggregated_jobs.append({
                    "job_title": dj.title,
                    "company": company_name,
                    "companies": [company_name],
                    "location": dj.location or "Bengaluru, India",
                    "work_mode": "Remote" if "remote" in (dj.location or "").lower() else "Hybrid",
                    "salary_range": dj.salary or "Competitive",
                    "experience": dj.experience or "0-2 Years",
                    "employment_type": dj.employment_type or "Full-Time",
                    "description": dj.description or "",
                    "required_skills": dj.required_skills or "",
                    "status": dj.status or "Open",
                    "apply_url": dj.apply_link,
                    "source": "database"
                })
        except Exception as e:
            logger.warning("Could not query Job table from database: %s. Using catalogue.", e)
            db.rollback()

        # Add rich catalogue jobs
        for cat_job in EXPANDED_JOB_CATALOGUE:
            # Deduplicate if title & company already present
            if not any(j["job_title"].lower() == cat_job["job_title"].lower() and j["company"].lower() == cat_job["company"].lower() for j in aggregated_jobs):
                aggregated_jobs.append(dict(cat_job))

        # 4. Compare and Score Each Job
        candidate_recommendations = []
        for job_raw in aggregated_jobs:
            job_req = self.extract_job_requirements(job_raw)

            if assessment_report and mode == "assessment":
                match_res = self.calculate_combined_match(resume_profile, assessment_report, job_req)
            else:
                match_res = self.calculate_resume_job_match(resume_profile, job_req)

            # Build full recommendation object
            job_key = f"{job_req['company']}_{job_req['title']}".replace(" ", "_").lower()
            rec_obj = {
                "job_key": job_key,
                "job_title": job_req["title"],
                "company": job_req["company"],
                "companies": [job_req["company"]],
                "location": job_req["location"],
                "work_mode": job_req["work_mode"],
                "salary_range": job_req["salary_range"],
                "employment_type": job_req["employment_type"],
                "experience": job_req["experience_str"],
                "description": job_req["description"],
                "skills": job_req["required_skills"],
                "full_responsibilities": job_req["responsibilities"],
                "required_tech_stack": [normalize_skill_name(s) for s in job_req["required_skills"]],
                "preferred_tech_stack": [normalize_skill_name(s) for s in job_req["preferred_skills"]],
                "education_required": job_req["education"],
                "certifications_preferred": job_req["certifications"],
                "domain": job_req["domain"],
                "apply_url": job_req["apply_url"],
                "job_url": job_req["job_url"],
                "company_logo": None,
                "source": job_raw.get("source", "catalogue"),
                "posted_date": datetime.utcnow().strftime("%Y-%m-%d"),
                "deadline": job_req["deadline"],
                "closing_date": job_req["deadline"],
                "application_status": match_res["application_status"],
                "match_percentage": match_res["match_score"],
                "match_score": match_res["match_score"],
                "match_category": match_res["match_category"],
                "matched_skills": [m["skill"] for m in match_res["matched_skills_with_evidence"]],
                "matched_skills_with_evidence": match_res["matched_skills_with_evidence"],
                "partial_skills": match_res["partial_skills"],
                "missing_skills": match_res["missing_skills"],
                "critical_gaps": match_res["critical_gaps"],
                "technical_match": match_res["technical_match"],
                "experience_match": match_res["experience_match"],
                "responsibility_match": match_res["responsibility_match"],
                "seniority_match": match_res["seniority_match"],
                "projects_match": match_res["projects_match"],
                "domain_match": match_res["domain_match"],
                "explanation": match_res["explanation"],
                "assessment_validation": match_res.get("assessment_validation", [])
            }
            candidate_recommendations.append(rec_obj)

        # 5. Filter strictly >= 60%
        filtered = self.filter_recommended_jobs(candidate_recommendations, min_score=60.0)

        # 6. Rank jobs by match score and critical requirement coverage
        ranked = self.rank_recommended_jobs(filtered)

        # 7. Merge application tracking state
        apps = db.query(JobApplication).filter(JobApplication.user_id == user_id).all()
        app_map = {a.job_key: a for a in apps}

        for r in ranked:
            k = r["job_key"]
            if k in app_map:
                r["status"] = app_map[k].status
                r["application_date"] = app_map[k].application_date.strftime("%d/%m/%Y") if app_map[k].application_date else None
            else:
                r["status"] = "Recommended"
                r["application_date"] = None

        return ranked

    def recommend(self, parsed_resume: dict) -> list[dict]:
        """
        Backward compatibility wrapper for legacy callers.
        """
        technical = parsed_resume.get("technical_skills", [])
        soft = parsed_resume.get("soft_skills", [])
        skills = technical + soft

        recommended_jobs = parsed_resume.get("recommended_jobs", [])
        query = recommended_jobs[0] if recommended_jobs else ""

        results = search_jobs(skills=skills, query=query)
        # Ensure only >= 60%
        return [r for r in results if r.get("match_percentage", 70) >= 60]


job_recommendation_service = JobRecommendationService()
