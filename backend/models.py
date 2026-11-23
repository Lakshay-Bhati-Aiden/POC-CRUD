from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base

class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    plan: Mapped[str | None] = mapped_column(String(20))
    newsletter: Mapped[bool] = mapped_column(default=False)