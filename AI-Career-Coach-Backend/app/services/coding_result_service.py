from sqlalchemy.orm import Session

from app.models.coding_result import CodingResult


class CodingResultService:

    def save(
        self,
        db: Session,
        data: dict
    ):

        result = CodingResult(**data)

        try:
            db.add(result)
            db.commit()
            db.refresh(result)
        except Exception:
            db.rollback()
            raise

        return result

    def get_all(
        self,
        db: Session
    ):

        return db.query(
            CodingResult
        ).order_by(
            CodingResult.created_at.desc()
        ).all()

    def get_by_id(
        self,
        db: Session,
        result_id: int
    ):

        return db.query(
            CodingResult
        ).filter(
            CodingResult.id == result_id
        ).first()

    def delete(
        self,
        db: Session,
        result_id: int
    ):

        result = self.get_by_id(
            db,
            result_id
        )

        if result:

            db.delete(result)

            db.commit()

            return True

        return False


coding_result_service = CodingResultService()
