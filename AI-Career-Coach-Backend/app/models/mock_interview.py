from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database.base import Base


class MockInterview(Base):
    __tablename__ = "mock_interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    target_role = Column(String(100), nullable=False)
    interview_type = Column(String(50), nullable=False)  # HR, Technical, Behavioral, Mixed
    difficulty = Column(String(50), default="Intermediate", nullable=False)
    question_count = Column(Integer, default=5, nullable=False)
    avatar_id = Column(String(100), default="female_hr_01", nullable=True)
    voice_id = Column(String(100), default="en_female_01", nullable=True)
    language = Column(String(50), default="en-US", nullable=True)
    status = Column(String(50), default="in_progress", nullable=False)  # in_progress, completed, cancelled
    overall_score = Column(Integer, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="mock_interviews")
    resume = relationship("Resume")
    questions = relationship("MockInterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    answers = relationship("MockInterviewAnswer", back_populates="interview", cascade="all, delete-orphan")
    report = relationship("MockInterviewReport", back_populates="interview", uselist=False, cascade="all, delete-orphan")


class MockInterviewQuestion(Base):
    __tablename__ = "mock_interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("mock_interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False)  # Technical, HR, Behavioral, Project, Scenario
    difficulty = Column(String(50), default="Intermediate")
    topic = Column(String(100), nullable=True)

    interview = relationship("MockInterview", back_populates="questions")
    answers = relationship("MockInterviewAnswer", back_populates="question", cascade="all, delete-orphan")


class MockInterviewAnswer(Base):
    __tablename__ = "mock_interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("mock_interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("mock_interview_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    transcript = Column(Text, nullable=True)
    audio_path = Column(String(255), nullable=True)
    answer_score = Column(Integer, nullable=True)
    technical_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    grammar_score = Column(Integer, nullable=True)
    fluency_score = Column(Integer, nullable=True)
    clarity_score = Column(Integer, nullable=True)
    relevance_score = Column(Integer, nullable=True)
    feedback = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    interview = relationship("MockInterview", back_populates="answers")
    question = relationship("MockInterviewQuestion", back_populates="answers")


class MockInterviewReport(Base):
    __tablename__ = "mock_interview_reports"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("mock_interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    technical_score = Column(Integer, nullable=False, default=0)
    communication_score = Column(Integer, nullable=False, default=0)
    english_score = Column(Integer, nullable=False, default=0)
    body_language_score = Column(Integer, nullable=False, default=0)
    overall_score = Column(Integer, nullable=False, default=0)
    readiness_score = Column(Integer, nullable=False, default=0)
    readiness_breakdown = Column(JSON, nullable=True)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    body_language_observations = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    interview = relationship("MockInterview", back_populates="report")
