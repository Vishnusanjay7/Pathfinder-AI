"""Abstract base class for all job search providers."""
from __future__ import annotations

import re
import urllib.parse
from abc import ABC, abstractmethod
from typing import Any


def validate_url(url: Any) -> str | None:
    """
    Validate and sanitize an external job URL.
    Returns the URL if valid, None otherwise.
    Rules:
      - Must be a non-empty string.
      - Must have http or https scheme only.
      - Must have a non-empty network location (hostname).
      - Must NOT be a localhost / 127.0.0.1 / testserver URL.
      - Must NOT contain javascript:, data:, file:, or vbscript: anywhere.
      - Must NOT be a relative URL.
    """
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme.lower() not in {"http", "https"}:
            return None
        if not parsed.netloc:
            return None
        lower = url.lower()
        unsafe = ["javascript:", "data:", "file:", "vbscript:", "localhost", "127.0.0.1", "testserver"]
        if any(u in lower for u in unsafe):
            return None
        return url
    except Exception:
        return None


def strip_html(text: str) -> str:
    """Strip HTML tags from a string."""
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).replace("&nbsp;", " ").strip()


class JobSearchProvider(ABC):
    """Abstract interface that every job-search provider must implement."""

    @abstractmethod
    def search(
        self,
        skills: list[str],
        query: str = "",
        location: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Search for job listings.

        Returns a list of normalized job dicts. Each dict conforms to:
        {
            job_title       : str
            company         : str
            companies       : list[str]
            location        : str
            salary_range    : str
            employment_type : str
            experience      : str
            description     : str
            skills          : list[str]
            apply_url       : str | None   # direct application URL only
            job_url         : str | None   # job listing / redirect URL
            company_logo    : str | None
            match_percentage: float
            matched_skills  : list[str]
            missing_skills  : list[str]
            source          : str          # 'adzuna' | 'jsearch' | 'local'
            provider_job_id : str
            posted_date     : str | None
        }
        """
        ...
