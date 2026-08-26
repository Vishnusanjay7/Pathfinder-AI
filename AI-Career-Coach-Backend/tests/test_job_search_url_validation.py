"""Unit tests for the multi-provider job search architecture."""
import unittest
from unittest.mock import patch, MagicMock

from app.providers.base import validate_url, strip_html
from app.providers.adzuna_provider import AdzunaProvider, _map_contract, _extract_skills_from_text
from app.providers.jsearch_provider import JSearchProvider
from app.providers.local_provider import LocalProvider


class TestValidateUrl(unittest.TestCase):
    """Tests for the shared URL validator in providers/base.py."""

    def test_valid_https(self):
        self.assertEqual(
            validate_url("https://careers.google.com/jobs/123"),
            "https://careers.google.com/jobs/123"
        )

    def test_valid_http(self):
        self.assertEqual(
            validate_url("http://example.com/apply"),
            "http://example.com/apply"
        )

    def test_none(self):
        self.assertIsNone(validate_url(None))

    def test_empty(self):
        self.assertIsNone(validate_url(""))
        self.assertIsNone(validate_url("   "))

    def test_relative_path(self):
        self.assertIsNone(validate_url("/local/path/123"))

    def test_javascript_scheme(self):
        self.assertIsNone(validate_url("javascript:alert(1)"))

    def test_localhost(self):
        self.assertIsNone(validate_url("http://localhost:8000/api/jobs"))

    def test_127_0_0_1(self):
        self.assertIsNone(validate_url("http://127.0.0.1:3000/jobs"))

    def test_testserver(self):
        self.assertIsNone(validate_url("http://testserver/api/jobs"))

    def test_data_url(self):
        self.assertIsNone(validate_url("data:text/html,<h1>test</h1>"))

    def test_whitespace_trimmed(self):
        self.assertEqual(
            validate_url("  https://example.com/job  "),
            "https://example.com/job"
        )


class TestStripHtml(unittest.TestCase):
    """Tests for the HTML stripper utility."""

    def test_strips_strong(self):
        self.assertEqual(strip_html("<strong>Python</strong> Developer"), "Python Developer")

    def test_strips_nbsp(self):
        self.assertEqual(strip_html("Java&nbsp;Developer"), "Java Developer")

    def test_empty(self):
        self.assertEqual(strip_html(""), "")

    def test_no_html(self):
        self.assertEqual(strip_html("Backend Engineer"), "Backend Engineer")


class TestAdzunaProviderNormalize(unittest.TestCase):
    """Tests for AdzunaProvider._normalize()."""

    def setUp(self):
        self.provider = AdzunaProvider()

    def test_redirect_url_becomes_job_url(self):
        """Adzuna redirect_url must be mapped to job_url — NOT apply_url."""
        item = {
            "id": "129698749",
            "title": "<strong>Python</strong> Developer",
            "company": {"display_name": "ACME Corp"},
            "location": {"display_name": "Bengaluru, Karnataka"},
            "redirect_url": "https://www.adzuna.in/jobs/land/ad/129698749?utm_medium=api",
            "salary_min": 600000,
            "salary_max": 1000000,
            "contract_time": "full_time",
            "contract_type": "permanent",
            "description": "We need a Python Django developer with REST experience.",
            "created": "2024-06-01T10:00:00Z",
        }
        result = self.provider._normalize(item, ["python", "django"])
        self.assertEqual(result["job_title"], "Python Developer")
        self.assertEqual(result["company"], "ACME Corp")
        self.assertEqual(result["location"], "Bengaluru, Karnataka")
        self.assertIsNotNone(result["job_url"])
        self.assertIn("adzuna.in", result["job_url"])
        self.assertIsNone(result["apply_url"])   # Adzuna never has apply_url
        self.assertEqual(result["source"], "adzuna")
        self.assertEqual(result["provider_job_id"], "129698749")

    def test_invalid_redirect_url_becomes_none(self):
        item = {
            "id": "999",
            "title": "Java Developer",
            "company": {"display_name": "Beta Co"},
            "location": {"display_name": "Mumbai"},
            "redirect_url": "javascript:void(0)",
        }
        result = self.provider._normalize(item, [])
        self.assertIsNone(result["job_url"])

    def test_salary_formatting(self):
        item = {
            "id": "1",
            "title": "Engineer",
            "company": {"display_name": "X"},
            "location": {"display_name": "Delhi"},
            "salary_min": 500000,
            "salary_max": 900000,
            "salary_is_predicted": 0,
        }
        result = self.provider._normalize(item, [])
        self.assertIn("₹", result["salary_range"])

    def test_map_contract(self):
        self.assertIn("Full Time", _map_contract("full_time", "permanent"))
        self.assertIn("Permanent", _map_contract("full_time", "permanent"))
        self.assertEqual("", _map_contract("", ""))

    def test_skill_extraction(self):
        skills = _extract_skills_from_text(
            "We need Python, FastAPI and Docker experience.", ["python", "fastapi"]
        )
        self.assertIn("python", skills)
        self.assertIn("fastapi", skills)
        self.assertIn("docker", skills)

    @patch.dict("os.environ", {"ADZUNA_APP_ID": "", "ADZUNA_APP_KEY": ""})
    def test_search_skips_without_credentials(self):
        """Provider should return [] immediately without credentials."""
        provider = AdzunaProvider()
        result = provider.search(["python"])
        self.assertEqual(result, [])


class TestJSearchProviderNormalize(unittest.TestCase):
    """Tests for JSearchProvider._normalize()."""

    def setUp(self):
        self.provider = JSearchProvider()

    def test_apply_link_becomes_apply_url(self):
        item = {
            "job_id": "jid_001",
            "job_title": "Backend Engineer",
            "employer_name": "ACME",
            "job_apply_link": "https://acme.com/careers/backend",
            "job_google_link": "https://www.google.com/search?q=backend",
            "job_required_skills": ["Python", "FastAPI"],
        }
        result = self.provider._normalize(item, ["python"])
        self.assertEqual(result["apply_url"], "https://acme.com/careers/backend")
        self.assertIsNotNone(result["job_url"])
        self.assertEqual(result["source"], "jsearch")

    def test_apply_options_fallback(self):
        item = {
            "job_id": "jid_002",
            "job_title": "Frontend Engineer",
            "employer_name": "Beta",
            "apply_options": [
                {"publisher": "LinkedIn", "apply_link": "https://linkedin.com/jobs/999"},
            ],
            "job_required_skills": [],
        }
        result = self.provider._normalize(item, [])
        self.assertEqual(result["apply_url"], "https://linkedin.com/jobs/999")

    def test_invalid_apply_link_becomes_none(self):
        item = {
            "job_id": "jid_003",
            "job_title": "DevOps",
            "employer_name": "Gamma",
            "job_apply_link": "javascript:void(0)",
            "job_required_skills": [],
        }
        result = self.provider._normalize(item, [])
        self.assertIsNone(result["apply_url"])

    @patch.dict("os.environ", {"RAPIDAPI_KEY": ""})
    def test_search_skips_without_key(self):
        provider = JSearchProvider()
        result = provider.search(["java"])
        self.assertEqual(result, [])


class TestLocalProvider(unittest.TestCase):
    """Tests for LocalProvider."""

    def test_returns_no_urls(self):
        provider = LocalProvider()
        results = provider.search(["python", "fastapi"])
        self.assertIsInstance(results, list)
        for job in results:
            self.assertIsNone(job["apply_url"], "Local provider must not fabricate apply_url")
            self.assertIsNone(job["job_url"], "Local provider must not fabricate job_url")
            self.assertEqual(job["source"], "local")


class TestSearchJobsOrchestrator(unittest.TestCase):
    """Integration tests for the search_jobs orchestrator."""

    @patch.dict("os.environ", {
        "JOB_SEARCH_PROVIDER": "adzuna",
        "ADZUNA_APP_ID": "",
        "ADZUNA_APP_KEY": "",
        "RAPIDAPI_KEY": "",
    })
    def test_cascades_to_local_when_all_live_providers_fail(self):
        from app.services.job_search_service import search_jobs
        results = search_jobs(["python"])
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        for job in results:
            self.assertEqual(job["source"], "local")
            self.assertIsNone(job["apply_url"])
            self.assertIsNone(job["job_url"])

    @patch.dict("os.environ", {"JOB_SEARCH_PROVIDER": "local"})
    def test_local_provider_only(self):
        from app.services.job_search_service import search_jobs
        results = search_jobs(["java"])
        self.assertIsInstance(results, list)
        for job in results:
            self.assertEqual(job["source"], "local")


if __name__ == "__main__":
    unittest.main()
