from datetime import datetime, date
from enum import Enum
from sqlalchemy import String, Integer, Boolean, Date, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class PriorityEnum(str, Enum):
    IU = "Important-Urgent"
    IN = "Important-NotUrgent"
    NU = "NotImportant-Urgent"
    NN = "NotImportant-NotUrgent"

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", index=True)
    priority: Mapped[PriorityEnum] = mapped_column(SQLEnum(PriorityEnum), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)