from sqlalchemy.orm import Session

from app.models.job import Job
from app.repositories.base_repository import BaseRepository


class JobRepository(BaseRepository[Job]):

    def __init__(self):
        super().__init__(Job)

    def get_all_jobs(
        self,
        db: Session
    ):
        return (
            db.query(Job)
            .all()
        )

    def get_company_jobs(
        self,
        db: Session,
        company_id: int
    ):
        return (
            db.query(Job)
            .filter(Job.company_id == company_id)
            .all()
        )


job_repository = JobRepository()