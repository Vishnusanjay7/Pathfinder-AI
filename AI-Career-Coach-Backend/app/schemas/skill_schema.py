from pydantic import BaseModel


class SkillCreate(BaseModel):

    name: str


class SkillResponse(BaseModel):

    id: int

    name: str

    proficiency: str

    class Config:
        from_attributes = True