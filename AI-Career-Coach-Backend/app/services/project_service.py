from sqlalchemy.orm import Session

from app.repositories.project_repository import (
    project_repository
)


class ProjectService:
    """
    Handles all project-related business logic.
    """

    def save_projects(
        self,
        db: Session,
        user_id: int,
        project_list: list
    ):

        # ==========================================
        # Remove Existing Projects
        # ==========================================

        project_repository.delete_by_user(
            db,
            user_id
        )

        saved_projects = []

        # ==========================================
        # Save Projects
        # ==========================================

        for item in project_list:

            if not isinstance(item, dict):
                continue

            project = project_repository.create(

                db=db,

                user_id=user_id,

                title=item.get(
                    "title",
                    ""
                ),

                description=item.get(
                    "description",
                    ""
                ),

                technologies=item.get(
                    "technologies",
                    ""
                ),

                github_url=item.get(
                    "github_url",
                    ""
                )

            )

            saved_projects.append(project)

        return saved_projects

    def get_projects(
        self,
        db: Session,
        user_id: int
    ):

        return project_repository.get_by_user(
            db,
            user_id
        )

    def delete_projects(
        self,
        db: Session,
        user_id: int
    ):

        project_repository.delete_by_user(
            db,
            user_id
        )


project_service = ProjectService()