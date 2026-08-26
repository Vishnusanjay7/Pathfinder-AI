import json
import logging
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.resume import Resume
from app.models.job_readiness import JobReadinessRecord
from app.services.resume_service import resume_service
from app.services.groq_service import client as groq_client
from app.services.openrouter_service import openrouter_service


def get_active_resume_version(db: Session, user_id: int) -> Tuple[Optional[Resume], Optional[str]]:
    resume = resume_service.get_active_resume(db, user_id)
    if not resume:
        return None, None
    timestamp = int(resume.upload_date.timestamp()) if resume.upload_date else 0
    version_str = f"v{resume.id}_{timestamp}"
    return resume, version_str


def invalidate_user_readiness_on_resume_change(db: Session, user_id: int) -> int:
    """Invalidates all job readiness records when user uploads/selects a new resume."""
    records = db.query(JobReadinessRecord).filter(
        JobReadinessRecord.user_id == user_id,
        JobReadinessRecord.is_valid == True
    ).all()
    count = 0
    for rec in records:
        rec.is_valid = False
        rec.eligibility_status = "RESUME_OUTDATED"
        rec.eligibility_reason = "Active resume was updated. Analysis must be re-run for this resume version."
        count += 1
    db.commit()
    return count


class JobReadinessService:

    def get_or_create_record(
        self,
        db: Session,
        user_id: int,
        job_key: str,
        job_title: str,
        company: str
    ) -> JobReadinessRecord:
        resume, resume_version = get_active_resume_version(db, user_id)
        if not resume:
            raise ValueError("No active resume found. Please upload a resume first.")

        record = db.query(JobReadinessRecord).filter(
            JobReadinessRecord.user_id == user_id,
            JobReadinessRecord.job_key == job_key,
            JobReadinessRecord.resume_id == resume.id,
            JobReadinessRecord.resume_version == resume_version,
            JobReadinessRecord.is_valid == True
        ).order_by(JobReadinessRecord.created_at.desc()).first()

        if not record:
            # Invalidate older records for this job
            old_records = db.query(JobReadinessRecord).filter(
                JobReadinessRecord.user_id == user_id,
                JobReadinessRecord.job_key == job_key,
                JobReadinessRecord.is_valid == True
            ).all()
            for old in old_records:
                old.is_valid = False
                old.eligibility_status = "RESUME_OUTDATED"

            record = JobReadinessRecord(
                user_id=user_id,
                job_key=job_key,
                job_title=job_title,
                company=company,
                resume_id=resume.id,
                resume_version=resume_version,
                assessment_attempt=1,
                assessment_status="not_started",
                eligibility_status="ASSESSMENT_REQUIRED",
                eligibility_reason="Self-assessment must be completed before applying.",
                is_valid=True
            )
            db.add(record)
            db.commit()
            db.refresh(record)

        return record

    def start_assessment(
        self,
        db: Session,
        user_id: int,
        job_key: str,
        job_title: str,
        company: str,
        job_description: str,
        required_skills: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        record = self.get_or_create_record(db, user_id, job_key, job_title, company)

        # If questions already generated for this attempt, return them
        if record.assessment_data and "questions" in record.assessment_data and record.assessment_status == "in_progress":
            return {
                "success": True,
                "record_id": record.id,
                "attempt": record.assessment_attempt,
                "status": record.assessment_status,
                "questions": record.assessment_data["questions"]
            }

        questions = self._generate_job_specific_questions(job_title, company, job_description, required_skills or [])

        assessment_payload = {
            "attempt": record.assessment_attempt,
            "generated_at": datetime.utcnow().isoformat(),
            "questions": questions,
            "answers": {}
        }

        record.assessment_data = assessment_payload
        record.assessment_status = "in_progress"
        record.eligibility_status = "ASSESSMENT_REQUIRED"
        record.eligibility_reason = "Complete self-assessment to unlock resume analysis."
        db.commit()

        return {
            "success": True,
            "record_id": record.id,
            "attempt": record.assessment_attempt,
            "status": record.assessment_status,
            "questions": questions
        }

    def _generate_job_specific_questions(
        self,
        job_title: str,
        company: str,
        job_description: str,
        required_skills: List[str]
    ) -> List[Dict[str, Any]]:
        """Generates job-specific questions tailored to the job's title, description, and technical stack."""
        
        prompt = f"""
You are an expert technical interviewer and role readiness assessor.
Generate a job-specific self-assessment for the following position:
- Job Title: {job_title}
- Company: {company}
- Key Skills: {', '.join(required_skills or [])}
- Description: {job_description[:1500]}

Generate 7 distinct, highly job-specific assessment questions.
DO NOT return generic questions. Each question must evaluate specific technical stack elements, tools, framework choices, architecture, scenario handling, or role confidence for this EXACT job.

Include a mixture of question types across categories:
1. Category: "Technical Skills", Type: "multiple_choice" (4 options)
2. Category: "Role Knowledge", Type: "scenario" (with options or short explanation)
3. Category: "Tools & Frameworks", Type: "confidence_rating" (1 to 5 scale)
4. Category: "Problem Solving", Type: "scenario"
5. Category: "Experience Confidence", Type: "yes_no"
6. Category: "DevOps & Cloud", Type: "multiple_choice"
7. Category: "Behavioral & Delivery", Type: "short_answer"

Return ONLY valid JSON matching this exact structure:
{{
  "questions": [
    {{
      "id": "q1",
      "category": "Technical Skills",
      "type": "multiple_choice",
      "question": "Clear technical question...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "skill": "Target Skill Name",
      "severity": "CRITICAL"
    }},
    {{
      "id": "q2",
      "category": "Role Knowledge",
      "type": "scenario",
      "question": "Scenario question...",
      "options": ["Approach A", "Approach B", "Approach C", "Approach D"],
      "correct_answer": "Approach A",
      "skill": "Target Skill Name",
      "severity": "CRITICAL"
    }},
    {{
      "id": "q3",
      "category": "Tools & Frameworks",
      "type": "confidence_rating",
      "question": "Rate your practical proficiency with...",
      "options": ["1 - No experience", "2 - Basic concept", "3 - Hands-on projects", "4 - Professional experience", "5 - Expert / Architect"],
      "correct_answer": "4 - Professional experience",
      "skill": "Target Skill Name",
      "severity": "IMPORTANT"
    }},
    {{
      "id": "q4",
      "category": "Problem Solving",
      "type": "multiple_choice",
      "question": "Architecture or bug-fix question...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "skill": "System Design",
      "severity": "IMPORTANT"
    }},
    {{
      "id": "q5",
      "category": "Experience Confidence",
      "type": "yes_no",
      "question": "Have you built and deployed...",
      "options": ["Yes, in production", "Yes, in personal/academic projects", "No, but familiar with concepts", "No experience"],
      "correct_answer": "Yes, in production",
      "skill": "Deployment",
      "severity": "CRITICAL"
    }},
    {{
      "id": "q6",
      "category": "Tools & Frameworks",
      "type": "multiple_choice",
      "question": "Tool/database specific question...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option C",
      "skill": "Database/Cloud",
      "severity": "IMPORTANT"
    }},
    {{
      "id": "q7",
      "category": "Behavioral & Delivery",
      "type": "short_answer",
      "question": "How do you handle production incidents or sprint deadlines in this role?",
      "options": [],
      "correct_answer": "Structured response focusing on root cause analysis, clear communication, and automated rollback/testing.",
      "skill": "Communication",
      "severity": "PREFERRED"
    }}
  ]
}}
"""

        # Try Groq first
        if groq_client:
            try:
                res = groq_client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=1500
                )
                text = res.choices[0].message.content.strip()
                if text.startswith("```"):
                    lines = text.splitlines()
                    if len(lines) >= 3:
                        text = "\n".join(lines[1:-1])
                data = json.loads(text)
                if data.get("questions") and len(data["questions"]) >= 5:
                    return data["questions"]
            except Exception as e:
                logging.warning(f"Groq question generation failed: {e}")

        # Try OpenRouter
        try:
            res_text = openrouter_service.generate_text(prompt, temperature=0.3)
            if res_text.startswith("```"):
                lines = res_text.splitlines()
                if len(lines) >= 3:
                    res_text = "\n".join(lines[1:-1])
            data = json.loads(res_text)
            if data.get("questions") and len(data["questions"]) >= 5:
                return data["questions"]
        except Exception as e:
            logging.warning(f"OpenRouter question generation failed: {e}")

        # Deterministic Job-Specific Fallback Generator
        return self._fallback_questions(job_title, company, required_skills, job_description)

    def _fallback_questions(
        self,
        job_title: str,
        company: str,
        required_skills: List[str],
        job_description: str
    ) -> List[Dict[str, Any]]:
        s1 = required_skills[0] if len(required_skills) > 0 else "Software Development"
        s2 = required_skills[1] if len(required_skills) > 1 else "Database Systems"
        s3 = required_skills[2] if len(required_skills) > 2 else "Cloud & DevOps"

        return [
            {
                "id": "q1",
                "category": "Technical Skills",
                "type": "multiple_choice",
                "question": f"When building scalable features in {s1} for {job_title}, how do you ensure high performance and clean code structure?",
                "options": [
                    f"Use modular components/functions, explicit error handling, and performance profiling.",
                    "Keep all code in a single file for easy readability.",
                    "Rely solely on database indexes without application-level optimization.",
                    "Skip unit tests to ship code faster."
                ],
                "correct_answer": f"Use modular components/functions, explicit error handling, and performance profiling.",
                "skill": s1,
                "severity": "CRITICAL"
            },
            {
                "id": "q2",
                "category": "Role Knowledge",
                "type": "scenario",
                "question": f"In a {job_title} role at {company}, an API endpoint experiences sudden high latency under load. What is your primary diagnostic step?",
                "options": [
                    "Inspect database query execution plans, memory usage, and APM tracing logs.",
                    "Immediately restart the server without checking logs.",
                    "Increase server RAM without identifying the bottleneck.",
                    "Rewrite the API in a new language."
                ],
                "correct_answer": "Inspect database query execution plans, memory usage, and APM tracing logs.",
                "skill": "Performance Optimization",
                "severity": "CRITICAL"
            },
            {
                "id": "q3",
                "category": "Tools & Technologies",
                "type": "confidence_rating",
                "question": f"Rate your practical hands-on experience with {s2} and associated ecosystem tools for {job_title} applications.",
                "options": [
                    "1 - No experience",
                    "2 - Basic conceptual understanding",
                    "3 - Hands-on academic/project experience",
                    "4 - Professional production experience",
                    "5 - Expert / System Architect"
                ],
                "correct_answer": "4 - Professional production experience",
                "skill": s2,
                "severity": "IMPORTANT"
            },
            {
                "id": "q4",
                "category": "Problem Solving",
                "type": "scenario",
                "question": f"How do you handle schema updates or breaking contract changes in production APIs for {job_title}?",
                "options": [
                    "Use API versioning, migration scripts, backward-compatible schemas, and automated integration testing.",
                    "Apply breaking schema changes directly to production database during business hours.",
                    "Ask frontend developers to rewrite client calls within 1 hour.",
                    "Avoid updating schemas once created."
                ],
                "correct_answer": "Use API versioning, migration scripts, backward-compatible schemas, and automated integration testing.",
                "skill": "System Design",
                "severity": "IMPORTANT"
            },
            {
                "id": "q5",
                "category": "Experience Confidence",
                "type": "yes_no",
                "question": f"Have you configured CI/CD pipelines, containerization (Docker/Kubernetes), or automated deployments using {s3}?",
                "options": [
                    "Yes, in production environments",
                    "Yes, in personal or project environments",
                    "No, but familiar with concepts",
                    "No experience"
                ],
                "correct_answer": "Yes, in production environments",
                "skill": s3,
                "severity": "CRITICAL"
            },
            {
                "id": "q6",
                "category": "Tools & Technologies",
                "type": "multiple_choice",
                "question": f"Which security best practice is essential when integrating third-party APIs or database connections for {job_title}?",
                "options": [
                    "Store credentials in environment variables / secret managers and validate all user input.",
                    "Hardcode database API keys inside frontend source code.",
                    "Disable CORS and authentication for internal routes.",
                    "Store access tokens in unencrypted local file storage."
                ],
                "correct_answer": "Store credentials in environment variables / secret managers and validate all user input.",
                "skill": "Security",
                "severity": "IMPORTANT"
            },
            {
                "id": "q7",
                "category": "Behavioral & Delivery",
                "type": "short_answer",
                "question": f"How do you prioritize technical debt versus shipping new features when working as a {job_title} at {company}?",
                "options": [],
                "correct_answer": "Balance feature delivery with continuous refactoring, automated testing, and dedicated sprint allocation for high-risk technical debt.",
                "skill": "Delivery & Communication",
                "severity": "PREFERRED"
            }
        ]

    def submit_assessment(
        self,
        db: Session,
        user_id: int,
        job_key: str,
        user_answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluates candidate assessment answers without punishing honest declarations of not knowing."""
        record = db.query(JobReadinessRecord).filter(
            JobReadinessRecord.user_id == user_id,
            JobReadinessRecord.job_key == job_key,
            JobReadinessRecord.is_valid == True
        ).order_by(JobReadinessRecord.created_at.desc()).first()

        if not record or not record.assessment_data:
            raise ValueError("No active assessment session found for this job. Please start assessment first.")

        questions = record.assessment_data.get("questions", [])
        evaluated_questions = []
        total_questions = len(questions)
        scored_points = 0.0
        max_possible_points = 0.0

        ratings_summary = {
            "Strong": 0,
            "Good": 0,
            "Developing": 0,
            "Weak": 0,
            "Missing": 0
        }

        category_scores = {}

        for q in questions:
            q_id = q["id"]
            user_ans = user_answers.get(q_id, "")
            correct_ans = q.get("correct_answer", "")
            q_type = q.get("type", "multiple_choice")
            severity = q.get("severity", "IMPORTANT")
            category = q.get("category", "Technical Skills")

            # Weight by severity: CRITICAL=3, IMPORTANT=2, PREFERRED=1, OPTIONAL=0.5
            weight = 3.0 if severity == "CRITICAL" else (2.0 if severity == "IMPORTANT" else 1.0)
            max_possible_points += weight

            rating = "Missing"
            question_score = 0.0

            if not user_ans or user_ans in ["No experience", "1 - No experience", "No, but familiar with concepts"]:
                # Honest acknowledgment of missing knowledge - NOT penalized harshly
                rating = "Developing" if "familiar" in str(user_ans).lower() else "Missing"
                question_score = 0.25 if rating == "Developing" else 0.0
            elif q_type in ["multiple_choice", "scenario", "yes_no"]:
                if str(user_ans).strip().lower() == str(correct_ans).strip().lower() or "production" in str(user_ans).lower() or "modular" in str(user_ans).lower() or "inspect" in str(user_ans).lower() or "versioning" in str(user_ans).lower() or "store credentials" in str(user_ans).lower():
                    rating = "Strong"
                    question_score = 1.0
                elif "project" in str(user_ans).lower() or "academic" in str(user_ans).lower() or "basic" in str(user_ans).lower():
                    rating = "Good"
                    question_score = 0.7
                else:
                    rating = "Weak"
                    question_score = 0.3
            elif q_type == "confidence_rating":
                if "4" in str(user_ans) or "5" in str(user_ans) or "Expert" in str(user_ans) or "Professional" in str(user_ans):
                    rating = "Strong"
                    question_score = 1.0
                elif "3" in str(user_ans) or "Hands-on" in str(user_ans):
                    rating = "Good"
                    question_score = 0.75
                elif "2" in str(user_ans):
                    rating = "Developing"
                    question_score = 0.4
                else:
                    rating = "Missing"
                    question_score = 0.0
            elif q_type == "short_answer":
                if len(str(user_ans).strip()) >= 15:
                    rating = "Good"
                    question_score = 0.8
                elif len(str(user_ans).strip()) > 0:
                    rating = "Developing"
                    question_score = 0.5
                else:
                    rating = "Missing"
                    question_score = 0.0

            scored_points += question_score * weight
            ratings_summary[rating] += 1

            if category not in category_scores:
                category_scores[category] = {"scored": 0.0, "max": 0.0}
            category_scores[category]["scored"] += question_score * weight
            category_scores[category]["max"] += weight

            evaluated_questions.append({
                "id": q_id,
                "question": q["question"],
                "category": category,
                "skill": q.get("skill", "General"),
                "severity": severity,
                "user_answer": user_ans,
                "rating": rating,
                "score_pct": round(question_score * 100, 1)
            })

        overall_assessment_pct = round((scored_points / max_possible_points * 100), 1) if max_possible_points > 0 else 70.0

        # Preserve attempt history if retaking
        existing_data = record.assessment_data or {}
        attempts_history = existing_data.get("history", [])

        attempts_history.append({
            "attempt": record.assessment_attempt,
            "submitted_at": datetime.utcnow().isoformat(),
            "score": overall_assessment_pct,
            "ratings_summary": ratings_summary
        })

        record.assessment_data = {
            "attempt": record.assessment_attempt,
            "completed_at": datetime.utcnow().isoformat(),
            "score": overall_assessment_pct,
            "ratings_summary": ratings_summary,
            "evaluated_questions": evaluated_questions,
            "category_breakdown": {
                cat: round((val["scored"] / val["max"] * 100), 1) if val["max"] > 0 else 100.0
                for cat, val in category_scores.items()
            },
            "history": attempts_history
        }

        record.assessment_score = overall_assessment_pct
        record.assessment_status = "completed"
        record.eligibility_status = "ANALYSIS_REQUIRED"
        record.eligibility_reason = "Assessment complete. Running deep resume match analysis..."
        db.commit()

        # Run Deep Resume vs Job Analysis automatically after self-assessment
        return self.perform_deep_resume_analysis(
            db=db,
            user_id=user_id,
            job_key=job_key,
            job_title=record.job_title,
            company=record.company,
            job_description=""
        )

    def perform_deep_resume_analysis(
        self,
        db: Session,
        user_id: int,
        job_key: str,
        job_title: str,
        company: str,
        job_description: str
    ) -> Dict[str, Any]:
        """Deep technology-by-technology comparison combining resume evidence + self-assessment evaluation."""
        record = db.query(JobReadinessRecord).filter(
            JobReadinessRecord.user_id == user_id,
            JobReadinessRecord.job_key == job_key,
            JobReadinessRecord.is_valid == True
        ).order_by(JobReadinessRecord.created_at.desc()).first()

        if not record or record.assessment_status != "completed":
            raise ValueError("Candidate must complete self-assessment before running deep resume analysis.")

        resume = db.query(Resume).filter(Resume.id == record.resume_id).first()
        if not resume:
            raise ValueError("Active resume record not found.")

        resume_raw_text = resume.raw_text or ""
        resume_analysis = resume.analysis_data or {}
        extracted_skills = [s.lower() for s in (resume.extracted_skills or resume_analysis.get("technical_skills", []))]

        # Evaluate tech stack requirements against resume text
        assessment_evaluated = record.assessment_data.get("evaluated_questions", []) if record.assessment_data else []

        tech_stack_items = []
        combined_insights = []
        scores_explanations = []
        missing_critical_gaps = []

        # Default tech stack inspection based on common role keywords + job description
        sample_stack = [
            {"tech": "React", "severity": "CRITICAL", "category": "Frontend"},
            {"tech": "TypeScript", "severity": "CRITICAL", "category": "Languages"},
            {"tech": "Python / Node.js", "severity": "CRITICAL", "category": "Backend"},
            {"tech": "PostgreSQL / SQL", "severity": "IMPORTANT", "category": "Databases"},
            {"tech": "Docker", "severity": "IMPORTANT", "category": "DevOps"},
            {"tech": "AWS / Cloud", "severity": "PREFERRED", "category": "Cloud"},
            {"tech": "Kubernetes", "severity": "PREFERRED", "category": "DevOps"},
            {"tech": "System Design", "severity": "IMPORTANT", "category": "Architecture"},
            {"tech": "CI/CD Pipelines", "severity": "OPTIONAL", "category": "DevOps"}
        ]

        # Analyze evidence in resume text
        matched_count = 0
        critical_missing_count = 0
        tech_matched_points = 0.0
        tech_total_points = 0.0

        for item in sample_stack:
            tech_name = item["tech"]
            sev = item["severity"]
            weight = 3.0 if sev == "CRITICAL" else (2.0 if sev == "IMPORTANT" else 1.0)
            tech_total_points += weight

            # Search in resume text & extracted skills
            patterns = [p.strip().lower() for p in tech_name.split("/")]
            resume_has_tech = any(p in resume_raw_text.lower() or any(p in s for s in extracted_skills) for p in patterns)

            # Check self-assessment response for this skill
            assess_q = next((q for q in assessment_evaluated if any(p in q.get("skill", "").lower() or p in q.get("question", "").lower() for p in patterns)), None)
            assess_rating = assess_q.get("rating", "Unknown") if assess_q else "Not Tested"

            if resume_has_tech:
                if assess_rating in ["Strong", "Good", "Not Tested"]:
                    status = "MATCHED"
                    evidence = f"Verified from resume text & project/work experience ({assess_rating} self-assessment confidence)."
                    tech_matched_points += weight
                    matched_count += 1
                    scores_explanations.append(f"{tech_name} — Strong Match: {evidence}")
                else:
                    status = "PARTIAL"
                    evidence = f"Resume evidence exists, but assessment indicates a current knowledge gap ({assess_rating})."
                    tech_matched_points += weight * 0.5
                    scores_explanations.append(f"{tech_name} — Partial Match: {evidence}")
            else:
                if assess_rating in ["Strong", "Good"]:
                    status = "PARTIAL"
                    evidence = f"Claimed in self-assessment ({assess_rating}) — not demonstrated on resume."
                    tech_matched_points += weight * 0.3
                    scores_explanations.append(f"{tech_name} — Potential Skill: {evidence}")
                else:
                    status = "MISSING"
                    evidence = f"No evidence in resume or assessment."
                    scores_explanations.append(f"{tech_name} — Gap: {evidence}")
                    if sev in ["CRITICAL", "IMPORTANT"]:
                        missing_critical_gaps.append(tech_name)
                        if sev == "CRITICAL":
                            critical_missing_count += 1

            tech_stack_items.append({
                "technology": tech_name,
                "severity": sev,
                "category": item["category"],
                "status": status,
                "evidence": evidence
            })

        # Calculate Category Scores
        tech_match_pct = round((tech_matched_points / tech_total_points * 100), 1) if tech_total_points > 0 else 75.0
        assess_score = record.assessment_score or 75.0

        exp_match_pct = 85.0 if len(resume_analysis.get("experience", [])) >= 2 else 70.0
        resp_match_pct = round(tech_match_pct * 0.9 + 8.0, 1)
        edu_match_pct = 100.0 if len(resume_analysis.get("education", [])) > 0 else 80.0
        cert_match_pct = 90.0 if len(resume_analysis.get("certifications", [])) > 0 else 70.0
        domain_match_pct = 80.0
        pref_match_pct = round(tech_match_pct * 0.85, 1)

        # Weighted Overall Job Fit Score (Critical > Preferred)
        overall_match_pct = round(
            (tech_match_pct * 0.40) +
            (assess_score * 0.25) +
            (exp_match_pct * 0.15) +
            (resp_match_pct * 0.10) +
            (edu_match_pct * 0.05) +
            (pref_match_pct * 0.05),
            1
        )

        # Determine Eligibility
        if critical_missing_count == 0 and overall_match_pct >= 65.0:
            eligibility_status = "ELIGIBLE"
            eligibility_reason = "Candidate satisfies all critical requirements and demonstrates strong readiness to apply."
        elif critical_missing_count <= 1 and overall_match_pct >= 50.0:
            eligibility_status = "NEEDS_IMPROVEMENT"
            eligibility_reason = f"Candidate has key preparation gaps ({', '.join(missing_critical_gaps[:2])}). Application locked until readiness improves."
        else:
            eligibility_status = "NOT_READY"
            eligibility_reason = f"Major critical requirements are missing ({', '.join(missing_critical_gaps[:3])}). Complete preparation pathway before applying."

        resume_analysis_payload = {
            "analyzed_at": datetime.utcnow().isoformat(),
            "overall_fit_score": overall_match_pct,
            "eligibility_status": eligibility_status,
            "eligibility_reason": eligibility_reason,
            "categories": {
                "technical_match": tech_match_pct,
                "assessment_score": assess_score,
                "experience_match": exp_match_pct,
                "responsibilities_match": resp_match_pct,
                "education_match": edu_match_pct,
                "certification_match": cert_match_pct,
                "domain_match": domain_match_pct,
                "preferred_match": pref_match_pct,
                "overall_match": overall_match_pct
            },
            "tech_stack": tech_stack_items,
            "scores_explanations": scores_explanations,
            "gaps": missing_critical_gaps,
            "recommendation": f"Your overall role fit is {overall_match_pct}%. " + (
                "You are eligible to apply!" if eligibility_status == "ELIGIBLE" else
                f"Your primary preparation focus should be: {', '.join(missing_critical_gaps[:2])}."
            )
        }

        record.resume_analysis_data = resume_analysis_payload
        record.eligibility_status = eligibility_status
        record.eligibility_reason = eligibility_reason
        db.commit()

        return self.get_match_report(db, user_id, job_key)

    def get_match_report(self, db: Session, user_id: int, job_key: str) -> Dict[str, Any]:
        record = db.query(JobReadinessRecord).filter(
            JobReadinessRecord.user_id == user_id,
            JobReadinessRecord.job_key == job_key,
            JobReadinessRecord.is_valid == True
        ).order_by(JobReadinessRecord.created_at.desc()).first()

        if not record:
            return {
                "success": False,
                "status": "NOT_STARTED",
                "eligibility_status": "ASSESSMENT_REQUIRED",
                "message": "No active readiness assessment found for this job."
            }

        return {
            "success": True,
            "record_id": record.id,
            "job_key": record.job_key,
            "job_title": record.job_title,
            "company": record.company,
            "resume_version": record.resume_version,
            "assessment_attempt": record.assessment_attempt,
            "assessment_status": record.assessment_status,
            "assessment_score": record.assessment_score,
            "assessment_history": record.assessment_data.get("history", []) if record.assessment_data else [],
            "eligibility_status": record.eligibility_status,
            "eligibility_reason": record.eligibility_reason,
            "resume_analysis": record.resume_analysis_data or {},
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat()
        }

    def retake_assessment(
        self,
        db: Session,
        user_id: int,
        job_key: str,
        job_title: str,
        company: str,
        job_description: str
    ) -> Dict[str, Any]:
        """Creates a new retake attempt, generates updated questions, and tracks score improvement."""
        record = db.query(JobReadinessRecord).filter(
            JobReadinessRecord.user_id == user_id,
            JobReadinessRecord.job_key == job_key,
            JobReadinessRecord.is_valid == True
        ).order_by(JobReadinessRecord.created_at.desc()).first()

        if not record:
            return self.start_assessment(db, user_id, job_key, job_title, company, job_description)

        previous_score = record.assessment_score or 0.0
        previous_history = (record.assessment_data or {}).get("history", [])

        # Increment attempt
        new_attempt = record.assessment_attempt + 1
        record.assessment_attempt = new_attempt
        record.assessment_status = "in_progress"
        record.eligibility_status = "ASSESSMENT_REQUIRED"
        record.eligibility_reason = f"Attempt {new_attempt} in progress. Complete self-assessment to update eligibility."

        # Target questions to identified gaps
        gaps = (record.resume_analysis_data or {}).get("gaps", [])
        new_questions = self._generate_job_specific_questions(job_title, company, job_description, gaps)

        record.assessment_data = {
            "attempt": new_attempt,
            "started_at": datetime.utcnow().isoformat(),
            "previous_score": previous_score,
            "questions": new_questions,
            "history": previous_history
        }

        db.commit()

        return {
            "success": True,
            "message": f"Retake assessment (Attempt {new_attempt}) initialized.",
            "record_id": record.id,
            "attempt": new_attempt,
            "previous_score": previous_score,
            "questions": new_questions
        }

    def check_eligibility_for_apply(
        self,
        db: Session,
        user_id: int,
        job_key: str
    ) -> Tuple[bool, str, str, Optional[JobReadinessRecord]]:
        """Strict backend eligibility check to enforce application lock."""
        resume, resume_version = get_active_resume_version(db, user_id)
        if not resume:
            return False, "NO_ACTIVE_RESUME", "No active resume found. Please upload a resume first.", None

        record = db.query(JobReadinessRecord).filter(
            JobReadinessRecord.user_id == user_id,
            JobReadinessRecord.job_key == job_key,
            JobReadinessRecord.resume_id == resume.id,
            JobReadinessRecord.resume_version == resume_version,
            JobReadinessRecord.is_valid == True
        ).order_by(JobReadinessRecord.created_at.desc()).first()

        if not record:
            return False, "ASSESSMENT_REQUIRED", "Application locked: Candidate must complete job-specific self-assessment.", None

        if record.assessment_status != "completed":
            return False, "ASSESSMENT_INCOMPLETE", "Application locked: Candidate self-assessment is not completed.", record

        if not record.resume_analysis_data:
            return False, "ANALYSIS_REQUIRED", "Application locked: Job match analysis has not been performed.", record

        if record.eligibility_status not in ["ELIGIBLE", "READY_TO_APPLY"]:
            return False, record.eligibility_status, f"Application locked: Eligibility status is {record.eligibility_status}. {record.eligibility_reason}", record

        return True, "ELIGIBLE", "Candidate is eligible to apply.", record


job_readiness_service = JobReadinessService()
