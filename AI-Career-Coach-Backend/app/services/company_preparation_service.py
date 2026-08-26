import logging
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.company_preparation import CompanyPreparation
from app.models.resume import Resume
from app.models.adaptive_assessment import AdaptiveAssessment
from app.models.coding_result import CodingResult
from app.models.mock_interview import MockInterviewReport
from app.services.resume_service import resume_service
from app.services.job_match_service import extract_skills
from app.services.groq_service import client
MODEL_NAME = "openai/gpt-oss-20b"


class CompanyPreparationService:

    def analyze_job_prep(
        self,
        db: Session,
        user_id: int,
        job_key: str,
        company: str,
        job_title: str,
        job_description: str,
        location: str | None = None,
        salary_range: str | None = None,
        apply_url: str | None = None,
        duration_days: int = 7
    ) -> CompanyPreparation:

        # 1. Fetch User Active Resume & Skills
        active_resume = resume_service.get_active_resume(db, user_id)
        user_skills = []
        resume_projects = []
        if active_resume:
            user_skills = active_resume.skills or []
            if active_resume.analysis_data:
                user_skills = list(set(user_skills + (active_resume.analysis_data.get("technical_skills", []) or [])))
                resume_projects = active_resume.analysis_data.get("projects", []) or []

        # 2. Extract Job Skills & Compare
        job_skills = extract_skills(job_description or job_title)
        if not job_skills:
            job_skills = ["python", "javascript", "react", "sql", "git"]  # Sensible role defaults if description is brief

        matched = sorted(list(set(user_skills).intersection(set(job_skills))))
        missing = sorted(list(set(job_skills).difference(set(user_skills))))
        partial = [s for s in missing[:2]]  # Related skills marked for improvement

        # 3. Component Scores & Readiness Calculation
        resume_match_pct = round(len(matched) / len(job_skills) * 100, 1) if job_skills else 50.0

        # Fetch latest assessment
        latest_assessment = db.query(AdaptiveAssessment).filter(AdaptiveAssessment.user_id == user_id).order_by(AdaptiveAssessment.created_at.desc()).first()
        assessment_score = (latest_assessment.mcq_result.get("percentage", 75.0) if latest_assessment and latest_assessment.mcq_result else 75.0)

        # Fetch latest coding results
        latest_coding = db.query(CodingResult).filter(CodingResult.user_id == user_id).order_by(CodingResult.submitted_at.desc()).first()
        coding_score = (latest_coding.score if latest_coding else 75.0)

        # Fetch latest interview report
        latest_interview = db.query(MockInterviewReport).filter(MockInterviewReport.session_id.in_(
            db.query(MockInterviewReport.session_id).filter(MockInterviewReport.id > 0)
        )).order_by(MockInterviewReport.created_at.desc()).first()
        interview_score = (latest_interview.overall_score if latest_interview else 75.0)

        readiness_score = round(0.40 * resume_match_pct + 0.20 * assessment_score + 0.20 * coding_score + 0.20 * interview_score, 1)

        readiness_level = (
            "Excellent" if readiness_score >= 90
            else "Strong" if readiness_score >= 80
            else "Moderate" if readiness_score >= 70
            else "Needs Improvement" if readiness_score >= 60
            else "Not Ready Yet"
        )

        score_breakdown = {
            "resume_match": resume_match_pct,
            "assessment_score": assessment_score,
            "coding_score": coding_score,
            "interview_score": interview_score
        }

        # 4. Generate AI Prep Plan via Groq
        ai_data = self._generate_ai_prep_content(
            company=company,
            job_title=job_title,
            job_description=job_description,
            matched=matched,
            missing=missing,
            projects=resume_projects,
            duration_days=duration_days
        )

        # Check existing prep record
        prep_record = db.query(CompanyPreparation).filter(
            CompanyPreparation.user_id == user_id,
            CompanyPreparation.job_key == job_key
        ).first()

        if prep_record:
            prep_record.company = company
            prep_record.job_title = job_title
            prep_record.job_description = job_description
            prep_record.location = location
            prep_record.salary_range = salary_range
            prep_record.apply_url = apply_url
            prep_record.readiness_score = readiness_score
            prep_record.readiness_level = readiness_level
            prep_record.score_breakdown = score_breakdown
            prep_record.matched_skills = matched
            prep_record.missing_skills = missing
            prep_record.partial_skills = partial
            prep_record.roadmap = ai_data.get("roadmap", [])
            prep_record.technical_questions = ai_data.get("technical_questions", [])
            prep_record.coding_recommendations = ai_data.get("coding_recommendations", [])
            prep_record.behavioral_questions = ai_data.get("behavioral_questions", [])
            prep_record.learning_resources = ai_data.get("learning_resources", [])
        else:
            prep_record = CompanyPreparation(
                user_id=user_id,
                job_key=job_key,
                company=company,
                job_title=job_title,
                job_description=job_description,
                location=location,
                salary_range=salary_range,
                apply_url=apply_url,
                readiness_score=readiness_score,
                readiness_level=readiness_level,
                score_breakdown=score_breakdown,
                matched_skills=matched,
                missing_skills=missing,
                partial_skills=partial,
                roadmap=ai_data.get("roadmap", []),
                technical_questions=ai_data.get("technical_questions", []),
                coding_recommendations=ai_data.get("coding_recommendations", []),
                behavioral_questions=ai_data.get("behavioral_questions", []),
                learning_resources=ai_data.get("learning_resources", []),
                completed_tasks=[],
                progress_percentage=0.0
            )
            db.add(prep_record)

        db.commit()
        db.refresh(prep_record)
        return prep_record

    def _generate_ai_prep_content(
        self,
        company: str,
        job_title: str,
        job_description: str,
        matched: List[str],
        missing: List[str],
        projects: List[Any],
        duration_days: int
    ) -> Dict[str, Any]:

        prompt = f"""You are an expert technical interviewer preparing a candidate for a {job_title} role at {company}.
Job Description snippet: {job_description[:600]}
Candidate Matched Skills: {', '.join(matched) or 'General Software Skills'}
Candidate Skill Gaps: {', '.join(missing) or 'Advanced System Design'}

Generate a JSON preparation plan with keys:
1. "roadmap": list of {duration_days} day dicts (e.g. {{"day": 1, "topic": "...", "tasks": ["...", "..."]}})
2. "technical_questions": list of 4 dicts (e.g. {{"question": "...", "topic": "...", "suggested_answer": "..."}})
3. "coding_recommendations": list of 4 dicts (e.g. {{"title": "...", "difficulty": "Easy|Medium|Hard", "topic": "...", "reason": "..."}})
4. "behavioral_questions": list of 3 dicts (e.g. {{"question": "...", "context": "...", "tip": "..."}})
5. "learning_resources": list of dicts for missing skills (e.g. {{"topic": "...", "title": "...", "provider": "Official Docs", "url": "https://..."}})

Respond strictly in valid JSON format without markdown wrapping."""

        try:
            res = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "system", "content": "You output strictly valid JSON."}, {"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2000
            )
            raw = res.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw)
        except Exception as e:
            logging.warning(f"Groq preparation generation fallback triggered: {e}")
            return self._fallback_prep_content(job_title, missing, duration_days)

    def _fallback_prep_content(self, job_title: str, missing: List[str], duration_days: int) -> Dict[str, Any]:
        gaps = missing or ["Algorithms", "System Architecture"]
        roadmap = [
            {"day": i + 1, "topic": f"Master {gaps[i % len(gaps)].title()}", "tasks": ["Study core fundamentals", "Solve 2 targeted practice problems"]}
            for i in range(duration_days)
        ]
        return {
            "roadmap": roadmap,
            "technical_questions": [
                {"question": f"How do you handle scalability when building a {job_title} application?", "topic": "System Design", "suggested_answer": "Discuss caching, indexing, and microservices."},
                {"question": f"Explain key design patterns used in {gaps[0].title()}.", "topic": gaps[0].title(), "suggested_answer": "Focus on modular design and clean architecture."}
            ],
            "coding_recommendations": [
                {"title": "Two Sum / HashMap Lookup", "difficulty": "Easy", "topic": "Arrays & Hashing", "reason": "Fundamental data structures for technical screens."},
                {"title": "Valid Parentheses", "difficulty": "Easy", "topic": "Stacks", "reason": "Core algorithmic problem."}
            ],
            "behavioral_questions": [
                {"question": f"Why are you interested in this {job_title} opportunity?", "context": "Motivation & Alignment", "tip": "Connect your past achievements with team goals."},
                {"question": "Describe a difficult bug you debugged under pressure.", "context": "Problem Solving", "tip": "Use STAR method."}
            ],
            "learning_resources": [
                {"topic": gap, "title": f"Official {gap.title()} Documentation", "provider": "Official Resource", "url": "https://developer.mozilla.org/"}
                for gap in gaps
            ]
        }


company_preparation_service = CompanyPreparationService()
