"""
Job Search Service — multi-provider orchestrator.

Provider selection is controlled by JOB_SEARCH_PROVIDER in .env:

  JOB_SEARCH_PROVIDER=adzuna   → try Adzuna → try JSearch → fall back to local
  JOB_SEARCH_PROVIDER=jsearch  → try JSearch → fall back to local
  (not set / anything else)    → local catalogue only

Deduplication:
  Jobs from different providers are deduplicated by:
    1. provider_job_id (exact match)
    2. normalized (company + title + location) tuple

URL contract:
  apply_url  – direct employer application URL (may be None)
  job_url    – job listing / redirect URL     (may be None)

NEVER manufacture URLs from company names or job titles.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from app.providers.adzuna_provider import AdzunaProvider
from app.providers.jsearch_provider import JSearchProvider
from app.providers.local_provider import LocalProvider

logger = logging.getLogger(__name__)

_adzuna = AdzunaProvider()
_jsearch = JSearchProvider()
_local = LocalProvider()


def _dedup_key(job: dict[str, Any]) -> str:
    """Return a deduplication key for a normalized job dict."""
    pid = job.get("provider_job_id") or ""
    if pid and not pid.startswith("local_"):
        return f"pid:{pid}"
    company = (job.get("company") or "").strip().lower()
    title = (job.get("job_title") or "").strip().lower()
    location = (job.get("location") or "").strip().lower()
    return f"ctL:{company}|{title}|{location}"


def search_jobs(
    skills: list[str],
    query: str = "",
    location: str = "",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Search for jobs using configured providers in priority order.
    Returns a deduplicated, normalized list of job dicts.
    """
    provider_name = os.getenv("JOB_SEARCH_PROVIDER", "jsearch").lower().strip()

    provider_chain: list[tuple[str, Any]]
    if provider_name == "adzuna":
        provider_chain = [("adzuna", _adzuna), ("local", _local)]
    elif provider_name == "adzuna+jsearch":
        provider_chain = [("adzuna", _adzuna), ("jsearch", _jsearch), ("local", _local)]
    elif provider_name == "jsearch":
        provider_chain = [("jsearch", _jsearch), ("local", _local)]
    else:
        provider_chain = [("local", _local)]

    seen: set[str] = set()
    results: list[dict[str, Any]] = []

    for name, provider in provider_chain:
        try:
            jobs = provider.search(skills=skills, query=query, location=location, limit=limit)
        except Exception as err:
            logger.warning(f"Provider '{name}' raised an exception: {err}")
            jobs = []

        if jobs:
            added = 0
            for job in jobs:
                key = _dedup_key(job)
                if key not in seen:
                    seen.add(key)
                    results.append(job)
                    added += 1
            logger.info(f"Provider '{name}' contributed {added} unique jobs.")
            if len(results) >= limit:
                break
            # If this provider returned some results, don't cascade further
            # (only cascade if provider returned 0 results / failed)
            if added > 0:
                break
        else:
            logger.info(f"Provider '{name}' returned 0 results — cascading to next provider.")

    # Log URL summary (development aid — keys only, no credential exposure)
    with_apply = sum(1 for j in results if j.get("apply_url"))
    with_job = sum(1 for j in results if j.get("job_url"))
    without = sum(1 for j in results if not j.get("apply_url") and not j.get("job_url"))
    logger.info(
        f"search_jobs: total={len(results)} | with_apply_url={with_apply} "
        f"| with_job_url={with_job} | no_url={without}"
    )

    return results[:limit]


# Backwards-compatible shim so existing imports of job_search_service still work
class JobSearchService:
    """Thin compatibility wrapper — delegates to the new multi-provider search_jobs()."""

    def search(self, skills: list[str]) -> list[dict[str, Any]]:
        return search_jobs(skills=skills)


job_search_service = JobSearchService()
