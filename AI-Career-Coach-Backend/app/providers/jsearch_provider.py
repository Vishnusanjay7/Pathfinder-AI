"""
JSearch (RapidAPI) Job Search Provider.

Refactored from the previous app/services/job_search_service.py.

JSearch field mapping (confirmed from live response inspection):
  job_title              → job_title
  employer_name          → company
  employer_logo          → company_logo
  job_city / job_state / job_country → location
  job_min_salary / job_max_salary    → salary_range
  job_salary_currency    → salary currency
  job_employment_type    → employment_type
  job_required_experience → experience
  job_required_skills    → skills (list[str])
  job_apply_link         → apply_url  ← PRIORITY 1 (direct employer application URL)
  apply_options[].apply_link → apply_url PRIORITY 2 (provider-sourced application links)
  job_google_link        → job_url    ← Google Jobs listing URL (always present)
  job_id                 → provider_job_id
  job_posted_at_datetime_utc → posted_date

URL priority:
  apply_url: job_apply_link → apply_options[*].apply_link
  job_url:   job_google_link

RAPIDAPI_KEY must be set in .env.
"""
from __future__ import annotations

import logging
import os
from typing import Any

import requests

from app.providers.base import JobSearchProvider, validate_url
from app.recommendation.skill_matcher import skill_matcher

logger = logging.getLogger(__name__)

_JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
_JSEARCH_HOST = "jsearch.p.rapidapi.com"


class JSearchProvider(JobSearchProvider):
    """JSearch (RapidAPI) backed job search provider (secondary / fallback)."""

    def search(
        self,
        skills: list[str],
        query: str = "",
        location: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        api_key = os.getenv("RAPIDAPI_KEY", "").strip()
        if not api_key:
            logger.warning("JSearchProvider: RAPIDAPI_KEY is not configured — skipping.")
            return []
        if not skills and not query:
            return []

        search_query = query if query else (" ".join(skills[:5]) + " developer")
        if location:
            search_query = f"{search_query} in {location}"

        try:
            response = requests.get(
                _JSEARCH_URL,
                params={"query": search_query, "page": 1, "num_pages": 1},
                headers={"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": _JSEARCH_HOST},
                timeout=15,
            )
            response.raise_for_status()
            data = response.json().get("data", [])
            logger.info(f"JSearchProvider: received {len(data)} results for '{search_query}'")
            return [self._normalize(item, skills) for item in data]
        except requests.RequestException as err:
            logger.warning(f"JSearchProvider: request failed — {err}")
            return []
        except ValueError as err:
            logger.warning(f"JSearchProvider: JSON parse error — {err}")
            return []

    def _normalize(self, item: dict[str, Any], user_skills: list[str]) -> dict[str, Any]:
        """Map a JSearch API item to our internal job schema."""

        title = item.get("job_title") or "Untitled Role"
        company = item.get("employer_name") or "Unknown Company"
        logo = item.get("employer_logo")

        # Location
        location = ", ".join(
            p for p in [item.get("job_city"), item.get("job_state"), item.get("job_country")]
            if p
        )

        # Salary
        salary_min = item.get("job_min_salary")
        salary_max = item.get("job_max_salary")
        currency = item.get("job_salary_currency") or ""
        if salary_min is not None or salary_max is not None:
            salary_range = f"{currency} {salary_min or ''}–{salary_max or ''}".strip()
        else:
            salary_range = ""

        # Skills
        raw_skills = item.get("job_required_skills") or []
        if not isinstance(raw_skills, list):
            raw_skills = []

        # Match
        match = skill_matcher.calculate_match(user_skills, raw_skills)

        # ── apply_url: job_apply_link (priority 1) ──────────────────────────
        apply_url: str | None = None
        raw_apply = item.get("job_apply_link")
        apply_url = validate_url(raw_apply)

        # apply_options[].apply_link (priority 2)
        if not apply_url:
            apply_opts = item.get("apply_options")
            if isinstance(apply_opts, list):
                for opt in apply_opts:
                    if isinstance(opt, dict):
                        candidate = validate_url(opt.get("apply_link"))
                        if candidate:
                            apply_url = candidate
                            break

        # ── job_url: job_google_link ────────────────────────────────────────
        job_url = validate_url(item.get("job_google_link"))

        provider_job_id = str(item.get("job_id") or f"{company}_{title}".replace(" ", "_").lower())
        posted_date = item.get("job_posted_at_datetime_utc") or None

        normalized = {
            "job_title": title,
            "company": company,
            "companies": [company] if company else [],
            "location": location,
            "salary_range": salary_range,
            "employment_type": item.get("job_employment_type") or "",
            "experience": str(item.get("job_required_experience") or "Not specified"),
            "description": item.get("job_description") or "",
            "skills": raw_skills,
            "apply_url": apply_url,    # Direct application URL (may be None)
            "job_url": job_url,         # Google Jobs listing URL (usually present)
            "company_logo": logo,
            "match_percentage": match["match_percentage"],
            "matched_skills": match["matched_skills"],
            "missing_skills": match["missing_skills"],
            "source": "jsearch",
            "provider_job_id": provider_job_id,
            "posted_date": posted_date,
        }

        logger.debug(
            f"[JSearch] JOB: {title} | COMPANY: {company} | "
            f"APPLY URL: {apply_url} | JOB URL: {job_url}"
        )
        return normalized
