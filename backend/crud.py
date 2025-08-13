from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Iterable, Optional
from . import models, schemas

# CREATE

def create_task(db: Session, task_in: schemas.TaskCreate) -> models.Task:
    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        due_date=task_in.due_date,
        is_completed=task_in.is_completed,
        priority=task_in.priority,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

# READ (list + optional filters)

def list_tasks(
    db: Session,
    *,
    search: Optional[str] = None,
    priority: Optional[models.PriorityEnum] = None,
    is_completed: Optional[bool] = None,
) -> Iterable[models.Task]:
    stmt = select(models.Task)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(models.Task.title.ilike(like))
    if priority:
        stmt = stmt.where(models.Task.priority == priority)
    if is_completed is not None:
        stmt = stmt.where(models.Task.is_completed == is_completed)
    stmt = stmt.order_by(models.Task.created_at.desc())
    return db.scalars(stmt).all()

# READ (single)

def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.get(models.Task, task_id)

# UPDATE

def update_task(db: Session, task_id: int, task_in: schemas.TaskUpdate) -> Optional[models.Task]:
    task = db.get(models.Task, task_id)
    if not task:
        return None
    data = task_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(task, k, v)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

# DELETE

def delete_task(db: Session, task_id: int) -> bool:
    task = db.get(models.Task, task_id)
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True