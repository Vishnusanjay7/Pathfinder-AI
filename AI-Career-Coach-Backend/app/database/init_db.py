from app.database.base import Base
from app.database.database import engine

# Models
from app.models.user import User
from app.models.resume import Resume
from app.models.skill import Skill
from app.models.education import Education
from app.models.experience import Experience
from app.models.project import Project
from app.models.certification import Certification
from app.models.language import Language
from app.models.company import Company
from app.models.job import Job
from app.models.otp_code import OTPCode
from app.models.pending_registration import PendingRegistration


def create_database():
    Base.metadata.create_all(bind=engine)
    print("Database created successfully.")


if __name__ == "__main__":
    create_database()
