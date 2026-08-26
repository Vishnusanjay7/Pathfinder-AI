from sqlalchemy.orm import Session

from app.repositories.company_repository import (
    company_repository
)


class CompanyService:

    def get_companies(
        self,
        db: Session
    ):
        return company_repository.get_all_companies(
            db
        )

    def get_company(
        self,
        db: Session,
        name: str
    ):
        return company_repository.get_by_name(
            db,
            name
        )


company_service = CompanyService()