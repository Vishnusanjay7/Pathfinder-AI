from sqlalchemy.orm import Session

from app.models.certification import Certification
from app.repositories.base_repository import BaseRepository


class CertificationRepository(BaseRepository[Certification]):

    def __init__(self):
        super().__init__(Certification)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):
        return (
            db.query(Certification)
            .filter(Certification.user_id == user_id)
            .all()
        )

    def delete_by_user(
        self,
        db: Session,
        user_id: int
    ):
        db.query(Certification).filter(
            Certification.user_id == user_id
        ).delete()

        db.commit()


certification_repository = CertificationRepository()