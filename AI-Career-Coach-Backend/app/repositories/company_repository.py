from sqlalchemy.orm import Session

from app.models.company import Company
from app.repositories.base_repository import BaseRepository


class CompanyRepository(BaseRepository[Company]):

    def __init__(self):
        super().__init__(Company)

    def get_by_name(
        self,
        db: Session,
        name: str
    ):
        return (
            db.query(Company)
            .filter(Company.name == name)
            .first()
        )

    def get_all_companies(
        self,
        db: Session
    ):
        return (
            db.query(Company)
            .order_by(Company.name)
            .all()
        )


company_repository = CompanyRepository()