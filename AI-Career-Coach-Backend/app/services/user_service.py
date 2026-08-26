from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import user_repository
from app.auth.password_handler import (
    hash_password,
    verify_password
)


class UserService:
    """
    Handles user-related business logic.
    """

    def register_user(
        self,
        db: Session,
        full_name: str,
        email: str,
        password: str,
        phone: str | None = None,
        college: str | None = None,
        degree: str | None = None,
        branch: str | None = None,
        graduation_year: int | None = None
    ):

        existing_user = user_repository.get_by_email(
            db,
            email
        )

        if existing_user:
            raise ValueError(
                "Email already registered."
            )

        hashed_password = hash_password(password)

        user = user_repository.create(
            db=db,
            full_name=full_name,
            email=email,
            password_hash=hashed_password,
            phone=phone,
            college=college,
            degree=degree,
            branch=branch,
            graduation_year=graduation_year,
            is_verified=False
        )

        return user

    def authenticate_user(
        self,
        db: Session,
        email: str,
        password: str
    ):

        user = user_repository.get_by_email(
            db,
            email
        )

        if user is None:
            return None

        if not verify_password(
            password,
            user.password_hash
        ):
            return None

        return user

    def get_user_by_email(
        self,
        db: Session,
        email: str
    ):

        return user_repository.get_by_email(
            db,
            email
        )

    def get_user(
        self,
        db: Session,
        user_id: int
    ):

        return user_repository.get(
            db,
            user_id
        )

    def get_all_users(
        self,
        db: Session
    ):

        return user_repository.get_all(
            db
        )

    def update_user(
        self,
        db: Session,
        user_id: int,
        **kwargs
    ):

        return user_repository.update(
            db,
            user_id,
            **kwargs
        )

    def delete_user(
        self,
        db: Session,
        user_id: int
    ):

        return user_repository.delete(
            db,
            user_id
        )


user_service = UserService()