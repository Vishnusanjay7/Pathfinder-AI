"""Unit tests for the rebuilt Job Recommendation Engine & Gateway workflow."""
import unittest

from app.services.job_recommendation_service import job_recommendation_service


class TestJobRecommendationService(unittest.TestCase):

    def setUp(self):
        self.service = job_recommendation_service
        self.sample_resume = {
            "raw_text": (
                "Senior Backend Developer with 4 years of experience. "
                "Architected and built FastAPI backend services using Python and PostgreSQL. "
                "Developed React and TypeScript client dashboards. "
                "Containerized microservices using Docker and deployed with CI/CD. "
                "Led team of 4 engineers and improved API response latency by 35%."
            ),
            "skills": ["python", "fastapi", "postgresql", "react", "typescript", "docker", "git", "rest api"],
            "categorized_skills": {
                "programming_languages": ["python", "typescript"],
                "backend": ["fastapi", "rest api"],
                "databases": ["postgresql"],
                "devops": ["docker", "git"],
                "frontend": ["react"]
            },
            "experience": [
                {
                    "position": "Backend Developer",
                    "company": "Tech Innovations",
                    "description": "Built FastAPI backend services using Python and PostgreSQL."
                }
            ],
            "projects": [
                {
                    "title": "Cloud API Gateway",
                    "description": "Engineered scalable RESTful APIs with FastAPI and Docker.",
                    "technologies": "Python, FastAPI, Docker, PostgreSQL",
                    "github_url": "https://github.com/example/api-gateway"
                }
            ],
            "education": [{"degree": "B.Tech in Computer Science"}],
            "certifications": []
        }

    def test_extract_resume_profile(self):
        profile = self.service.extract_resume_profile(self.sample_resume)
        self.assertIn("python", profile["skills"])
        self.assertIn("fastapi", profile["skills"])
        self.assertIn("docker", profile["skills"])
        self.assertGreaterEqual(profile["years_of_experience"], 1)

    def test_resume_matching_with_evidence(self):
        profile = self.service.extract_resume_profile(self.sample_resume)
        sample_job = {
            "job_title": "Senior Backend Engineer",
            "company": "ImagineArt",
            "required_skills": ["python", "fastapi", "postgresql", "kubernetes"],
            "critical_skills": ["python", "fastapi"],
            "experience": "3-5 Years",
            "responsibilities": ["Build scalable APIs", "Optimize queries"],
            "status": "Open",
            "apply_url": "https://example.com/apply"
        }
        job_req = self.service.extract_job_requirements(sample_job)
        match_result = self.service.calculate_resume_job_match(profile, job_req)

        # Match score should be >= 60%
        self.assertGreaterEqual(match_result["match_score"], 60)
        self.assertIn("Python", [m["skill"] for m in match_result["matched_skills_with_evidence"]])

        # Check genuine evidence for Python
        python_ev = next(m for m in match_result["matched_skills_with_evidence"] if m["skill"] == "Python")
        self.assertEqual(python_ev["status"], "MATCHED")
        self.assertTrue("FastAPI" in python_ev["evidence"] or "Python" in python_ev["evidence"])

        # Check genuine missing status for Kubernetes
        self.assertIn("Kubernetes", match_result["missing_skills"])

    def test_strict_60_percent_filter(self):
        candidate_jobs = [
            {"job_title": "Senior Backend Engineer", "match_score": 94},
            {"job_title": "Backend Engineer", "match_score": 82},
            {"job_title": "Python Developer", "match_score": 71},
            {"job_title": "Junior Go Engineer", "match_score": 60},
            {"job_title": "Ruby on Rails Lead", "match_score": 58},  # Below 60%
            {"job_title": "Embedded C Developer", "match_score": 42}, # Below 60%
        ]
        filtered = self.service.filter_recommended_jobs(candidate_jobs, min_score=60.0)
        filtered_scores = [j["match_score"] for j in filtered]

        self.assertEqual(len(filtered), 4)
        for s in filtered_scores:
            self.assertGreaterEqual(s, 60.0)
        self.assertNotIn(58, filtered_scores)
        self.assertNotIn(42, filtered_scores)

    def test_assessment_discrepancy_and_validation(self):
        profile = self.service.extract_resume_profile(self.sample_resume)
        job_req = self.service.extract_job_requirements({
            "job_title": "Senior Backend Engineer",
            "required_skills": ["python", "docker", "aws"],
            "critical_skills": ["python"]
        })
        assessment_report = {
            "overall_career_score": 88.0,
            "skill_analysis": {
                "strong_areas": ["Python", "AWS"],
                "weak_areas": ["Docker"]
            }
        }
        combined = self.service.calculate_combined_match(profile, assessment_report, job_req)
        validations = combined.get("assessment_validation", [])

        # Python is on resume and strong in assessment -> VERIFIED
        py_val = next((v for v in validations if "python" in v["skill"].lower()), None)
        self.assertIsNotNone(py_val)
        self.assertEqual(py_val["final_confidence"], "VERIFIED")

        # Docker is on resume but weak in assessment -> RESUME EVIDENCE BUT KNOWLEDGE GAP
        docker_val = next((v for v in validations if "docker" in v["skill"].lower()), None)
        self.assertIsNotNone(docker_val)
        self.assertEqual(docker_val["final_confidence"], "RESUME EVIDENCE BUT KNOWLEDGE GAP")

        # AWS is not on resume but strong in assessment -> CLAIMED/VERIFIED BY ASSESSMENT BUT NOT PRESENT ON RESUME
        aws_val = next((v for v in validations if "aws" in v["skill"].lower()), None)
        self.assertIsNotNone(aws_val)
        self.assertEqual(aws_val["final_confidence"], "CLAIMED/VERIFIED BY ASSESSMENT BUT NOT PRESENT ON RESUME")


if __name__ == "__main__":
    unittest.main()
