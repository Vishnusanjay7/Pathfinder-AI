from sqlalchemy.orm import Session

from app.models.project import Project
from app.repositories.base_repository import BaseRepository


class ProjectRepository(BaseRepository[Project]):

    def __init__(self):
        super().__init__(Project)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):
        return (
            db.query(Project)
            .filter(Project.user_id == user_id)
            .all()
        )

    def delete_by_user(
        self,
        db: Session,
        user_id: int
    ):
        db.query(Project).filter(
            Project.user_id == user_id
        ).delete()

        db.commit()


project_repository = ProjectRepository()