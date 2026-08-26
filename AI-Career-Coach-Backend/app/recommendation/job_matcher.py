from app.recommendation.skill_matcher import skill_matcher


JOB_DATABASE = [

    {
        "job_title": "Python Backend Developer",

        "salary_range": "₹6-10 LPA",

        "experience": "0-2 Years",

        "companies": [
            "Infosys",
            "TCS",
            "Cognizant",
            "Accenture"
        ],

        "required_skills": [
            "python",
            "fastapi",
            "docker",
            "postgresql",
            "git"
        ]
    },

    {
        "job_title": "Java Developer",

        "salary_range": "₹5-9 LPA",

        "experience": "0-2 Years",

        "companies": [
            "Infosys",
            "Capgemini",
            "Wipro",
            "IBM"
        ],

        "required_skills": [
            "java",
            "spring boot",
            "mysql",
            "git"
        ]
    },

    {
        "job_title": "Full Stack Developer",

        "salary_range": "₹6-12 LPA",

        "experience": "0-3 Years",

        "companies": [
            "Zoho",
            "Freshworks",
            "Oracle",
            "Amazon"
        ],

        "required_skills": [
            "html",
            "css",
            "javascript",
            "react",
            "python",
            "sql"
        ]
    },

    {
        "job_title": "AI Engineer",

        "salary_range": "₹8-18 LPA",

        "experience": "0-3 Years",

        "companies": [
            "Google",
            "Microsoft",
            "OpenAI",
            "NVIDIA"
        ],

        "required_skills": [
            "python",
            "machine learning",
            "numpy",
            "pandas",
            "tensorflow"
        ]
    }

]


class JobMatcher:

    def recommend_jobs(
        self,
        user_skills
    ):

        recommendations = []

        for job in JOB_DATABASE:

            result = skill_matcher.calculate_match(

                user_skills,

                job["required_skills"]

            )

            recommendations.append({

                "job_title": job["job_title"],

                "salary_range": job["salary_range"],

                "experience": job["experience"],

                "companies": job["companies"],

                "match_percentage": result["match_percentage"],

                "matched_skills": result["matched_skills"],

                "missing_skills": result["missing_skills"]

            })

        recommendations.sort(

            key=lambda x: x["match_percentage"],

            reverse=True

        )

        return recommendations


job_matcher = JobMatcher()