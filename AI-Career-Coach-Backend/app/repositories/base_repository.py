from typing import Type, TypeVar, Generic

from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):

    def __init__(self, model: Type[ModelType]):
        self.model = model

    def create(self, db: Session, **kwargs):

        obj = self.model(**kwargs)

        db.add(obj)

        try:
            db.commit()
            db.refresh(obj)
            return obj

        except Exception:
            db.rollback()
            raise

    def get(self, db: Session, obj_id: int):

        return db.query(self.model).filter(
            self.model.id == obj_id
        ).first()

    def get_all(self, db: Session):

        return db.query(self.model).all()

    def delete(self, db: Session, obj_id: int):

        obj = self.get(db, obj_id)

        if obj:
            db.delete(obj)
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise

        return obj

    def update(self, db: Session, obj_id: int, **kwargs):

        obj = self.get(db, obj_id)

        if not obj:
            return None

        for key, value in kwargs.items():
            setattr(obj, key, value)

        try:
            db.commit()
            db.refresh(obj)
            return obj

        except Exception:
            db.rollback()
            raise