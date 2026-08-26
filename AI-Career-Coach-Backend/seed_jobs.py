from app.database.database import SessionLocal

from app.services.job_seed_service import (
    job_seed_service
)


def main():

    db = SessionLocal()

    try:

        job_seed_service.seed(db)

    finally:

        db.close()


if __name__ == "__main__":

    main()