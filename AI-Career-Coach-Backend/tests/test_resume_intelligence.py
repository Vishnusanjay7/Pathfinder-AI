import os
import unittest
from pathlib import Path
from unittest.mock import patch

from app.services.skill_taxonomy import extract_categorized_skills, get_all_extracted_skills_flat, normalize_skill_name
from app.services.resume_cleaner import clean_resume_text
from app.services.resume_parser import (
    detect_sections, extract_contact_info, extract_experience,
    extract_education, extract_projects, extract_certifications,
    extract_achievements, parse_resume_structure
)
from app.services.ats_service import calculate_ats_score, calculate_job_specific_ats, simulate_ats_improvements
from app.services.pdf_service import evaluate_extraction_quality, validate_pdf_file
from app.services.groq_service import analyze_resume_qualitative, _fallback_resume_qualitative_analysis

class TestResumeIntelligencePipeline(unittest.TestCase):

    def setUp(self):
        self.sample_text = """
John Doe
Software Engineer
Email: john.doe@example.com | Phone: +91 98765 43210
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

SUMMARY
Experienced Software Engineer with expertise in building scalable backend systems using Python, FastAPI, and PostgreSQL.

TECHNICAL SKILLS
Languages: Python, Java, JavaScript, TypeScript, C++
Frameworks: FastAPI, Django, React, Spring Boot
Databases: PostgreSQL, MySQL, Redis, MongoDB
DevOps & Cloud: Docker, Kubernetes, AWS, Git, CI/CD

PROFESSIONAL EXPERIENCE
Senior Backend Engineer at Tech Corp Jan 2022 - Present
- Developed high-performance RESTful APIs handling 100k daily requests.
- Optimized PostgreSQL database queries, reducing response times by 40%.
- Spearheaded migration of microservices to Docker and AWS Kubernetes.

ACADEMIC BACKGROUND
Bachelor of Technology in Computer Science (2018 - 2022)
Indian Institute of Technology | CGPA: 8.8/10

KEY PROJECTS
AI Career Coach Platform
github.com/johndoe/career-coach
- Built automated resume parsing engine using FastAPI, Groq AI, and PostgreSQL.
- Implemented real-time ATS scoring and job recommendation system.

CERTIFICATIONS
- AWS Certified Solutions Architect (2023)
- Certified Kubernetes Administrator (CKA)
"""

    def test_01_skill_normalization(self):
        self.assertEqual(normalize_skill_name("js"), "JavaScript")
        self.assertEqual(normalize_skill_name("reactjs"), "React")
        self.assertEqual(normalize_skill_name("postgres"), "PostgreSQL")
        self.assertEqual(normalize_skill_name("node.js"), "Node.js")
        self.assertEqual(normalize_skill_name("aws"), "AWS")

    def test_02_skill_taxonomy_extraction(self):
        categorized = extract_categorized_skills(self.sample_text)
        self.assertIn("Python", categorized["programming_languages"])
        self.assertIn("FastAPI", categorized["backend"])
        self.assertIn("PostgreSQL", categorized["databases"])
        self.assertIn("AWS", categorized["cloud"])
        self.assertIn("Docker", categorized["devops"])

    def test_03_context_aware_skill_filtering(self):
        text = "I am interested in learning Rust and Go, but my active skills are Python and Java."
        skills = get_all_extracted_skills_flat(text)
        self.assertIn("Python", skills)
        self.assertIn("Java", skills)
        self.assertNotIn("Rust", skills)

    def test_04_text_cleaner(self):
        raw = "John   Doe \n\n• Developed   APIs\n• Improved-\nment by 40%"
        cleaned = clean_resume_text(raw)
        self.assertIn("Developed APIs", cleaned)
        self.assertIn("Improvedment by 40%", cleaned)
        self.assertNotIn("•", cleaned)

    def test_05_section_detection(self):
        sections = detect_sections(self.sample_text)
        self.assertIn("summary", sections)
        self.assertIn("skills", sections)
        self.assertIn("experience", sections)
        self.assertIn("education", sections)
        self.assertIn("projects", sections)

    def test_06_contact_extraction_email(self):
        contacts = extract_contact_info(self.sample_text)
        self.assertEqual(contacts["email"], "john.doe@example.com")

    def test_07_contact_extraction_phone_indian(self):
        contacts = extract_contact_info(self.sample_text)
        self.assertIsNotNone(contacts["phone"])
        self.assertIn("98765", contacts["phone"])

    def test_08_contact_extraction_linkedin_github(self):
        contacts = extract_contact_info(self.sample_text)
        self.assertEqual(contacts["linkedin"], "linkedin.com/in/johndoe")
        self.assertEqual(contacts["github"], "github.com/johndoe")

    def test_09_contact_extraction_name(self):
        contacts = extract_contact_info(self.sample_text)
        self.assertEqual(contacts["name"], "John Doe")

    def test_10_experience_extraction(self):
        sections = detect_sections(self.sample_text)
        exps = extract_experience(sections.get("experience", self.sample_text))
        self.assertTrue(len(exps) > 0)
        self.assertIn("Jan 2022", exps[0]["start_date"])

    def test_11_education_extraction(self):
        sections = detect_sections(self.sample_text)
        edus = extract_education(sections.get("education", self.sample_text))
        self.assertTrue(len(edus) > 0)
        self.assertIn("Bachelor", edus[0]["degree"])

    def test_12_project_extraction(self):
        sections = detect_sections(self.sample_text)
        projs = extract_projects(sections.get("projects", self.sample_text))
        self.assertTrue(len(projs) > 0)

    def test_13_achievement_metrics(self):
        achievements = extract_achievements(self.sample_text)
        self.assertTrue(len(achievements) > 0)
        self.assertTrue(any("40%" in a for a in achievements))

    def test_14_deterministic_ats_scoring(self):
        parsed = parse_resume_structure(self.sample_text)
        ats_res = calculate_ats_score(parsed, self.sample_text)
        self.assertGreaterEqual(ats_res["ats_score"], 70)
        self.assertIn("score_breakdown", ats_res)
        self.assertIn("overall", ats_res["score_breakdown"])

    def test_15_ats_improvement_simulator(self):
        parsed = parse_resume_structure(self.sample_text)
        ats_res = calculate_ats_score(parsed, self.sample_text)
        sim = ats_res["ats_simulator"]
        self.assertIsInstance(sim, list)

    def test_16_deterministic_job_description_matching(self):
        parsed = parse_resume_structure(self.sample_text)
        jd = "We are seeking a Python Developer with FastAPI, PostgreSQL, Docker, and AWS experience."
        match_res = calculate_job_specific_ats(parsed, self.sample_text, jd)
        self.assertIn("Python", match_res["matched_skills"])
        self.assertIn("FastAPI", match_res["matched_skills"])
        self.assertGreaterEqual(match_res["job_match_score"], 60)

    def test_17_deterministic_ats_match_missing_skills(self):
        parsed = parse_resume_structure(self.sample_text)
        jd = "Looking for Python, FastAPI, Docker, Kubernetes, and Golang Developer."
        match_res = calculate_job_specific_ats(parsed, self.sample_text, jd)
        self.assertIn("Go", match_res["missing_skills"])

    def test_18_extraction_quality_high(self):
        eval_res = evaluate_extraction_quality(self.sample_text)
        self.assertEqual(eval_res["quality"], "high")

    def test_19_extraction_quality_low(self):
        eval_res = evaluate_extraction_quality("asdf 123 !@#")
        self.assertEqual(eval_res["quality"], "low")

    def test_20_groq_fallback_on_error(self):
        with patch("app.services.groq_service.client", None):
            res = analyze_resume_qualitative(self.sample_text)
            self.assertIn("strengths", res)
            self.assertIn("suggested_improvements", res)

    def test_21_weak_action_verb_detection(self):
        weak_text = "I worked on APIs and was responsible for managing servers."
        parsed = parse_resume_structure(weak_text)
        ats_res = calculate_ats_score(parsed, weak_text)
        self.assertTrue(len(ats_res["weak_phrases_found"]) > 0)

    def test_22_empty_pdf_validation(self):
        empty_file = Path("test_empty.pdf")
        with open(empty_file, "wb") as f:
            f.write(b"")
        try:
            with self.assertRaises(ValueError):
                validate_pdf_file(str(empty_file))
        finally:
            if empty_file.exists():
                empty_file.unlink()

    def test_23_invalid_pdf_header_validation(self):
        invalid_file = Path("test_invalid.pdf")
        with open(invalid_file, "wb") as f:
            f.write(b"NOT_A_PDF_CONTENT")
        try:
            with self.assertRaises(ValueError):
                validate_pdf_file(str(invalid_file))
        finally:
            if invalid_file.exists():
                invalid_file.unlink()

    def test_24_resume_full_structure_parsing(self):
        parsed = parse_resume_structure(self.sample_text)
        self.assertEqual(parsed["name"], "John Doe")
        self.assertEqual(parsed["email"], "john.doe@example.com")
        self.assertIn("Python", parsed["skills"])

    def test_25_certification_extraction(self):
        certs = extract_certifications(self.sample_text)
        self.assertTrue(len(certs) > 0)
        self.assertIn("AWS", certs[0]["name"])

if __name__ == "__main__":
    unittest.main()
