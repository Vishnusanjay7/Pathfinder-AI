from typing import Literal
from pydantic import BaseModel, Field


class LearningProgressUpdate(BaseModel):
    resource_type: Literal["course", "certification", "project", "practice", "interview"]
    resource_key: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    status: Literal["completed"] = "completed"
