from sqlalchemy.orm import Session

from app.repositories.job_repository import (
    job_repository
)


class JobService:

    def get_jobs(
        self,
        db: Session
    ):
        return job_repository.get_all_jobs(
            db
        )

    def get_company_jobs(
        self,
        db: Session,
        company_id: int
    ):
        return job_repository.get_company_jobs(
            db,
            company_id
        )


job_service = JobService()