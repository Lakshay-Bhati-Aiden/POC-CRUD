from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field #Phase 3: sending data to the API
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Application
from typing import Literal
from sqlalchemy import select, func

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Adjust this to your frontend's origin
    allow_methods=["*"],
    allow_headers=["*"],
)

#Phase 3
class ApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^\d{10}$")

class ApplicationPreferences(BaseModel):
    plan: Literal["basic", "pro"]
    newsletter: bool

@app.post("/api/applications", status_code=201)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    row = Application(name=payload.name, email=payload.email, phone=payload.phone)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": row.status}

@app.patch("/api/applications/{application_id}")
def update_preferences(application_id: int, payload: ApplicationPreferences,
                       db: Session = Depends(get_db)):
    row = db.get(Application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    row.plan = payload.plan
    row.newsletter = payload.newsletter
    db.commit()
    return {"id": row.id, "plan": row.plan, "newsletter": row.newsletter}

@app.get("/api/applications/{application_id}")
def get_application(application_id: int, db: Session = Depends(get_db)):
    row = db.get(Application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return {
        "id": row.id, "name": row.name, "email": row.email, "phone": row.phone,
        "plan": row.plan, "newsletter": row.newsletter, "status": row.status,
    }

@app.post("/api/applications/{application_id}/submit")
def submit_application(application_id: int, db: Session = Depends(get_db)):
    row = db.get(Application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if row.status == "submitted":
        raise HTTPException(status_code=409, detail="Application already submitted")
    if row.plan is None:
        raise HTTPException(status_code=400, detail="Complete page 2 before submitting")
    row.status = "submitted"
    db.commit()
    return {"id": row.id, "status": row.status}

@app.get("/api/applications")
def list_applications(limit: int = Query(5, ge=1, le=50),
                      offset: int = Query(0, ge=0),
                      db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Application))
    rows = db.scalars(
        select(Application).order_by(Application.id.desc()).limit(limit).offset(offset)
    ).all()
    return {
        "total": total, "limit": limit, "offset": offset,
        "items": [
            {"id": r.id, "name": r.name, "email": r.email, "plan": r.plan, "status": r.status}
            for r in rows
        ],
    }

@app.delete("/api/applications/{application_id}", status_code=204)
def delete_application(application_id: int, db: Session = Depends(get_db)):
    row = db.get(Application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(row)
    db.commit()


@app.get("/api/hello")
def say_hello():
    return {"message": "Hello, FastAPI!"}