"""
Local Job Catalogue Provider — final fallback when no live provider credentials are configured.

This provider serves from the in-memory JOB_DATABASE in app/recommendation/job_matcher.py.
It never fabricates application URLs.
Both apply_url and job_url remain None for all local catalogue results.
The frontend will display "Application link unavailable" for these jobs.
"""
from __future__ import annotations

import logging
from typing import Any

from app.providers.base import JobSearchProvider
from app.recommendation.job_matcher import job_matcher

logger = logging.getLogger(__name__)


class LocalProvider(JobSearchProvider):
    """Local in-memory job catalogue — used when no live provider is available."""

    def search(
        self,
        skills: list[str],
        query: str = "",
        location: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        raw = job_matcher.recommend_jobs(skills)
        results = []
        for rec in raw[:limit]:
            companies = rec.get("companies", [])
            results.append({
                "job_title": rec.get("job_title", ""),
                "company": companies[0] if companies else "",
                "companies": companies,
                "location": location or "",
                "salary_range": rec.get("salary_range", ""),
                "employment_type": "",
                "experience": rec.get("experience", ""),
                "description": "",
                "skills": rec.get("matched_skills", []),
                "apply_url": None,    # Never fabricated
                "job_url": None,      # Never fabricated
                "company_logo": None,
                "match_percentage": rec.get("match_percentage", 0.0),
                "matched_skills": rec.get("matched_skills", []),
                "missing_skills": rec.get("missing_skills", []),
                "source": "local",
                "provider_job_id": f"local_{rec.get('job_title', '').replace(' ', '_').lower()}",
                "posted_date": None,
            })
        logger.info(f"LocalProvider: returning {len(results)} local catalogue jobs.")
        return results
