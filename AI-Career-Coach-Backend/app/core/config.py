from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ==========================
    # AI Configuration
    # ==========================
    GROQ_API_KEY: str | None = None
    AI_PROVIDER: str = "openrouter"
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_MODEL: str = "openrouter/free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # ==========================
    # Execution Engine
    # ==========================
    EXECUTION_ENGINE_URL: str = "http://localhost:9000"
    JUDGE0_URL: str = "https://ce.judge0.com"
    JUDGE0_REQUEST_TIMEOUT_SECONDS: int = 15
    JUDGE0_POLL_TIMEOUT_SECONDS: int = 60
    JUDGE0_POLL_INTERVAL_SECONDS: float = 1.0
    JUDGE0_MAX_RETRIES: int = 2

    # ==========================
    # CORS
    # ==========================
    FRONTEND_URL: str = "http://localhost:3000"

    # ==========================
    # Auth
    # ==========================
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # OTP_PROVIDER selects the delivery implementation: development | smtp | twilio.
    # "log" remains accepted for existing local environments.
    OTP_PROVIDER: str | None = None
    OTP_DELIVERY_MODE: str | None = None  # deprecated compatibility alias
    SMTP_FROM: str | None = None
    OTP_FROM_EMAIL: str | None = None
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_VERIFY_ATTEMPTS: int = 5
    OTP_RESEND_SECONDS: int = 60

    # ==========================
    # Real-Time Voice & Audio (LiveKit / Deepgram / Tavus)
    # ==========================
    LIVEKIT_URL: str | None = None
    LIVEKIT_API_KEY: str | None = None
    LIVEKIT_API_SECRET: str | None = None
    DEEPGRAM_API_KEY: str | None = None

    # Tavus Conversational Video Interface (Photorealistic Human PAL)
    TAVUS_API_KEY: str | None = None
    TAVUS_PAL_ID: str = "p5277ac17937"
    TAVUS_FACE_ID: str = "r3f427f43c9d"
    TAVUS_PRIYA_FACE_ID: str = "r3f427f43c9d"
    TAVUS_NEHA_FACE_ID: str = "r3f427f43c9d"
    TAVUS_ARJUN_FACE_ID: str = "r3f427f43c9d"
    TAVUS_ROHIT_FACE_ID: str = "r3f427f43c9d"

    # ==========================
    # Company Knowledge RAG
    # ==========================
    COMPANY_RAG_PATH: str = "data/company_knowledge"
    COMPANY_VECTOR_DB_PATH: str = "data/vector_store"

    # ==========================
    # Database
    # ==========================
    DATABASE_URL: str = "postgresql+psycopg2://postgres:1467@localhost:5432/ai_career_coach"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
