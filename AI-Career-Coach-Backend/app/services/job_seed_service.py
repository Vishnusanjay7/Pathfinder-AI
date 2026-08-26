from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.job import Job


class JobSeedService:

    def seed(self, db: Session):

        companies = [

            {
                "name": "Infosys",
                "website": "https://www.infosys.com",
                "careers_url": "https://career.infosys.com",
                "linkedin_url": "https://www.linkedin.com/company/infosys",
                "location": "India"
            },

            {
                "name": "TCS",
                "website": "https://www.tcs.com",
                "careers_url": "https://www.tcs.com/careers",
                "linkedin_url": "https://www.linkedin.com/company/tata-consultancy-services",
                "location": "India"
            },

            {
                "name": "Cognizant",
                "website": "https://www.cognizant.com",
                "careers_url": "https://careers.cognizant.com",
                "linkedin_url": "https://www.linkedin.com/company/cognizant",
                "location": "India"
            }

        ]

        for company in companies:

            exists = db.query(Company).filter(
                Company.name == company["name"]
            ).first()

            if not exists:

                db.add(
                    Company(**company)
                )

        db.commit()

        infosys = db.query(Company).filter(
            Company.name == "Infosys"
        ).first()

        tcs = db.query(Company).filter(
            Company.name == "TCS"
        ).first()

        cognizant = db.query(Company).filter(
            Company.name == "Cognizant"
        ).first()

        jobs = [

            {
                "company_id": infosys.id,
                "title": "Python Backend Developer",
                "location": "Bangalore",
                "employment_type": "Full Time",
                "experience": "0-2 Years",
                "salary": "6-10 LPA",
                "required_skills": "python,fastapi,postgresql,docker,git",
                "description": "Backend API Development"
            },

            {
                "company_id": tcs.id,
                "title": "Java Developer",
                "location": "Chennai",
                "employment_type": "Full Time",
                "experience": "0-2 Years",
                "salary": "5-9 LPA",
                "required_skills": "java,spring boot,mysql,git",
                "description": "Enterprise Java Development"
            },

            {
                "company_id": cognizant.id,
                "title": "Full Stack Developer",
                "location": "Hyderabad",
                "employment_type": "Full Time",
                "experience": "0-2 Years",
                "salary": "6-12 LPA",
                "required_skills": "html,css,javascript,react,python,sql",
                "description": "React + Python Development"
            }

        ]

        for job in jobs:

            exists = db.query(Job).filter(
                Job.title == job["title"]
            ).first()

            if not exists:

                db.add(
                    Job(**job)
                )

        db.commit()

        print("Job Database Seeded Successfully")


job_seed_service = JobSeedService()