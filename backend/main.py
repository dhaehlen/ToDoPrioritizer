from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import get_db, engine, Base
from . import schemas, models, crud

# Create tables on startup (SQLite convenience). For larger apps, use Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Todo Quadrant API", version="0.1.0")

# CORS for Vite (default at 5173)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    search: Optional[str] = Query(None, description="Search in title"),
    priority: Optional[models.PriorityEnum] = Query(None),
    is_completed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.list_tasks(db, search=search, priority=priority, is_completed=is_completed)

@app.post("/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(task_in: schemas.TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, task_in)

@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, task_in: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = crud.update_task(db, task_id, task_in)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_task(db, task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return None