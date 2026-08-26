from app.services.job_search_service import search_jobs


class JobRecommendationService:
    """
    Generate job recommendations using parsed resume data.

    Calls the multi-provider search_jobs() orchestrator which tries
    Adzuna → JSearch → local catalogue in order based on configuration.
    """

    def recommend(self, parsed_resume: dict) -> list[dict]:
        technical = parsed_resume.get("technical_skills", [])
        soft = parsed_resume.get("soft_skills", [])
        skills = technical + soft

        # Derive a search query from the recommended job titles in the resume analysis
        recommended_jobs = parsed_resume.get("recommended_jobs", [])
        query = recommended_jobs[0] if recommended_jobs else ""

        return search_jobs(skills=skills, query=query)


job_recommendation_service = JobRecommendationService()
