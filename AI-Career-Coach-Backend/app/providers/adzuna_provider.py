"""
Adzuna Job Search Provider.

API documentation: https://developer.adzuna.com/docs/search

Endpoint pattern:
  GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
      ?app_id=...&app_key=...&results_per_page=20&what=python+developer&where=bengaluru

Actual response fields (confirmed from official Adzuna docs):
  id              – unique job identifier
  title           – job title (may contain <strong> HTML tags)
  description     – job snippet (may contain HTML)
  company         – { display_name: str }
  location        – { display_name: str, area: [str, ...] }
  salary_min      – float | None
  salary_max      – float | None
  salary_is_predicted – 0 | 1
  contract_type   – "permanent" | "contract" | None
  contract_time   – "full_time" | "part_time" | None
  category        – { label: str, tag: str }
  created         – ISO 8601 datetime string
  redirect_url    – REAL tracked Adzuna listing URL (always present when credentials valid)

URL mapping:
  redirect_url → job_url   (used for "View Job ↗" button)
  apply_url    → None       (Adzuna standard search does NOT return employer apply URLs)

ADZUNA_APP_ID and ADZUNA_APP_KEY MUST be set in .env.
ADZUNA_COUNTRY defaults to "in" (India).
ADZUNA_RESULTS_LIMIT defaults to 20.
"""
from __future__ import annotations

import logging
import os
from typing import Any

import requests

from app.providers.base import JobSearchProvider, validate_url, strip_html
from app.recommendation.skill_matcher import skill_matcher

logger = logging.getLogger(__name__)

_ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"


class AdzunaProvider(JobSearchProvider):
    """Adzuna-backed job search provider (primary)."""

    def search(
        self,
        skills: list[str],
        query: str = "",
        location: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        app_id = os.getenv("ADZUNA_APP_ID", "").strip()
        app_key = os.getenv("ADZUNA_APP_KEY", "").strip()
        if not app_id or not app_key:
            logger.warning("AdzunaProvider: ADZUNA_APP_ID or ADZUNA_APP_KEY is not configured — skipping.")
            return []

        country = os.getenv("ADZUNA_COUNTRY", "in").strip().lower()
        limit = int(os.getenv("ADZUNA_RESULTS_LIMIT", str(limit)))

        # Build a proper job title query from skills — Adzuna needs a role name, not raw skills
        if not query:
            query = _infer_job_title(skills)

        params: dict[str, Any] = {
            "app_id": app_id,
            "app_key": app_key,
            "results_per_page": min(limit, 50),
            "what": query,
            "content-type": "application/json",
            "sort_by": "relevance",
        }
        if location:
            params["where"] = location

        url_page1 = f"{_ADZUNA_BASE}/{country}/search/1"
        url_page2 = f"{_ADZUNA_BASE}/{country}/search/2"
        all_results: list[dict[str, Any]] = []

        try:
            # Page 1 — primary query
            r1 = requests.get(url_page1, params=params, timeout=5)
            r1.raise_for_status()
            page1 = r1.json().get("results", [])
            all_results.extend(page1)
            logger.info(f"AdzunaProvider: page1={len(page1)} results for query='{query}' location='{location}'")

            # Page 2 — more variety from same query
            if len(all_results) < limit:
                try:
                    r2 = requests.get(url_page2, params=params, timeout=5)
                    r2.raise_for_status()
                    page2 = r2.json().get("results", [])
                    all_results.extend(page2)
                    logger.info(f"AdzunaProvider: page2={len(page2)} additional results")
                except Exception:
                    pass  # Page 2 is optional — don't fail if it errors

            # Second query for a related role to add diversity
            if len(all_results) < limit:
                try:
                    related_query = _related_query(query)
                    if related_query != query:
                        params2 = {**params, "what": related_query}
                        r3 = requests.get(url_page1, params=params2, timeout=5)
                        r3.raise_for_status()
                        extra = r3.json().get("results", [])
                        # Only add results with unique IDs
                        existing_ids = {item.get("id") for item in all_results}
                        new_results = [j for j in extra if j.get("id") not in existing_ids]
                        all_results.extend(new_results)
                        logger.info(f"AdzunaProvider: related query '{related_query}' added {len(new_results)} more jobs")
                except Exception:
                    pass

            logger.info(f"AdzunaProvider: total {len(all_results)} results before dedup")
            return [self._normalize(item, skills) for item in all_results[:limit]]

        except requests.RequestException as err:
            logger.warning(f"AdzunaProvider: request failed — {err}")
            return []
        except ValueError as err:
            logger.warning(f"AdzunaProvider: JSON parse error — {err}")
            return []


    def _normalize(self, item: dict[str, Any], user_skills: list[str]) -> dict[str, Any]:
        """Map a single Adzuna API response item to our internal job schema."""

        # ── Title (strip HTML) ───────────────────────────────────────────────
        title = strip_html(item.get("title") or "") or "Untitled Role"

        # ── Company ──────────────────────────────────────────────────────────
        company_obj = item.get("company") or {}
        company = company_obj.get("display_name") or "Unknown Company"

        # ── Location ─────────────────────────────────────────────────────────
        location_obj = item.get("location") or {}
        location = location_obj.get("display_name") or ""

        # ── Salary ───────────────────────────────────────────────────────────
        salary_min = item.get("salary_min")
        salary_max = item.get("salary_max")
        salary_predicted = item.get("salary_is_predicted", 0)
        if salary_min is not None or salary_max is not None:
            parts = []
            if salary_min:
                parts.append(f"₹{int(salary_min):,}")
            if salary_max:
                parts.append(f"₹{int(salary_max):,}")
            salary_range = " – ".join(parts) + (" (est.)" if salary_predicted else "")
        else:
            salary_range = ""

        # ── Employment Type ──────────────────────────────────────────────────
        contract_time = item.get("contract_time") or ""
        contract_type = item.get("contract_type") or ""
        employment_type = _map_contract(contract_time, contract_type)

        # ── Description ──────────────────────────────────────────────────────
        description = strip_html(item.get("description") or "")

        # ── Category / Skills extraction ─────────────────────────────────────
        category_obj = item.get("category") or {}
        category_label = category_obj.get("label") or ""
        # Adzuna does not return structured skill lists; extract from description heuristically
        raw_skills: list[str] = []
        if description:
            raw_skills = _extract_skills_from_text(description, user_skills)

        # ── Match calculation ─────────────────────────────────────────────────
        match = skill_matcher.calculate_match(user_skills, raw_skills)

        # ── URLs ─────────────────────────────────────────────────────────────
        # redirect_url is the ONLY reliable URL Adzuna provides in search results.
        # It is a real, tracked Adzuna link that forwards to the actual job listing.
        # We store it as job_url — NOT as apply_url.
        raw_redirect = item.get("redirect_url") or ""
        job_url = validate_url(raw_redirect)

        # apply_url: Adzuna standard search API does NOT return employer-provided
        # application URLs. Set to None — never invent one.
        apply_url = None

        # ── Provider job ID ───────────────────────────────────────────────────
        provider_job_id = str(item.get("id") or "")

        # ── Posted date ───────────────────────────────────────────────────────
        posted_date = item.get("created") or None

        normalized = {
            "job_title": title,
            "company": company,
            "companies": [company],
            "location": location,
            "salary_range": salary_range,
            "employment_type": employment_type,
            "experience": "Not specified",
            "description": description,
            "skills": raw_skills,
            "apply_url": apply_url,   # Always None for Adzuna
            "job_url": job_url,        # Always populated for valid Adzuna results
            "company_logo": None,
            "match_percentage": match["match_percentage"],
            "matched_skills": match["matched_skills"],
            "missing_skills": match["missing_skills"],
            "source": "adzuna",
            "provider_job_id": provider_job_id,
            "posted_date": posted_date,
            "category": category_label,
        }

        logger.debug(
            f"[Adzuna] JOB: {title} | COMPANY: {company} | "
            f"JOB URL: {job_url} | APPLY URL: {apply_url}"
        )
        return normalized


def _map_contract(contract_time: str, contract_type: str) -> str:
    """Map Adzuna contract_time / contract_type to a human-readable string."""
    parts = []
    time_map = {"full_time": "Full Time", "part_time": "Part Time"}
    type_map = {"permanent": "Permanent", "contract": "Contract"}
    if contract_time in time_map:
        parts.append(time_map[contract_time])
    if contract_type in type_map:
        parts.append(type_map[contract_type])
    return " · ".join(parts) if parts else ""


def _extract_skills_from_text(text: str, user_skills: list[str]) -> list[str]:
    """
    Heuristic: find which user skills (and common tech terms) appear in the job description.
    Adzuna does not provide structured skill lists in the search API response.
    """
    _COMMON_TECH = [
        "python", "java", "javascript", "typescript", "react", "angular", "vue",
        "node", "nodejs", "fastapi", "django", "flask", "spring", "spring boot",
        "docker", "kubernetes", "aws", "azure", "gcp", "postgresql", "mysql",
        "mongodb", "redis", "kafka", "git", "linux", "sql", "nosql", "graphql",
        "rest", "api", "microservices", "devops", "ci/cd", "terraform", "ansible",
        "machine learning", "deep learning", "tensorflow", "pytorch", "pandas",
        "numpy", "scikit-learn", "nlp", "llm", "openai", "langchain",
        "c++", "c#", "go", "golang", "rust", "kotlin", "swift", "scala",
        "html", "css", "tailwind", "bootstrap",
    ]
    found: set[str] = set()
    text_lower = text.lower()
    for skill in list(user_skills) + _COMMON_TECH:
        if skill.lower() in text_lower:
            found.add(skill.lower())
    return sorted(found)


def _infer_job_title(skills: list[str]) -> str:
    """
    Infer a human-readable job title from a list of skills.
    Adzuna expects a role name (e.g. 'Python Developer'), NOT a raw skill list
    (e.g. 'Java Spring Boot Kafka PostgreSQL') — which returns 0 results.
    """
    if not skills:
        return "Software Developer"

    skill_lower = {s.lower() for s in skills}

    # AI / ML
    if any(s in skill_lower for s in ["machine learning", "deep learning", "tensorflow", "pytorch",
                                        "nlp", "llm", "scikit-learn", "data science", "ai"]):
        return "Machine Learning Engineer"

    # Data Engineering
    if any(s in skill_lower for s in ["spark", "hadoop", "hive", "airflow", "data engineering",
                                        "databricks", "etl", "data pipeline"]):
        return "Data Engineer"

    # DevOps / Cloud
    if any(s in skill_lower for s in ["devops", "kubernetes", "terraform", "ansible", "jenkins",
                                        "ci/cd", "site reliability"]):
        return "DevOps Engineer"

    if any(s in skill_lower for s in ["aws", "azure", "gcp", "cloud architect"]):
        return "Cloud Engineer"

    # Mobile
    if any(s in skill_lower for s in ["android", "kotlin", "ios", "swift", "flutter", "react native"]):
        return "Mobile Developer"

    # Frontend
    if any(s in skill_lower for s in ["react", "angular", "vue", "frontend", "next.js", "tailwind"]):
        return "Frontend Developer"

    # Java ecosystem
    if any(s in skill_lower for s in ["java", "spring", "spring boot", "hibernate", "kafka",
                                        "cassandra", "j2ee"]):
        return "Java Developer"

    # Python ecosystem
    if any(s in skill_lower for s in ["python", "fastapi", "django", "flask", "celery"]):
        return "Python Developer"

    # Node / JS
    if any(s in skill_lower for s in ["nodejs", "node.js", "express", "nestjs", "typescript",
                                        "javascript"]):
        return "Node.js Developer"

    # .NET
    if any(s in skill_lower for s in ["c#", ".net", "asp.net", "dotnet"]):
        return ".NET Developer"

    # Go / Rust / Scala
    if "golang" in skill_lower or "go" in skill_lower:
        return "Go Developer"
    if "rust" in skill_lower:
        return "Rust Developer"
    if "scala" in skill_lower:
        return "Scala Developer"

    # Full Stack fallback
    if any(s in skill_lower for s in ["sql", "postgresql", "mysql", "mongodb", "docker", "git"]):
        return "Full Stack Developer"

    # Generic fallback using primary skill
    return f"{skills[0].title()} Developer"


def _related_query(primary: str) -> str:
    """
    Return a related but different job title to add diversity when the primary
    query doesn't return enough results.
    """
    _RELATED: dict[str, str] = {
        "Java Developer": "Backend Developer",
        "Backend Developer": "Java Developer",
        "Python Developer": "Backend Engineer",
        "Backend Engineer": "Python Developer",
        "Frontend Developer": "React Developer",
        "React Developer": "Frontend Engineer",
        "Node.js Developer": "Full Stack Developer",
        "Full Stack Developer": "Software Engineer",
        "Machine Learning Engineer": "Data Scientist",
        "Data Scientist": "AI Engineer",
        "Data Engineer": "Big Data Developer",
        "DevOps Engineer": "Site Reliability Engineer",
        "Cloud Engineer": "AWS Developer",
        ".NET Developer": "C# Developer",
        "Mobile Developer": "Android Developer",
        "Go Developer": "Backend Developer",
        "Rust Developer": "Systems Engineer",
        "Scala Developer": "Backend Developer",
        "Software Developer": "Software Engineer",
        "Software Engineer": "Backend Developer",
    }
    return _RELATED.get(primary, "Software Engineer")
