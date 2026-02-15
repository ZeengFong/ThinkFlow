"""
ThinkFlow Backend — FastAPI entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db

from routes.projects import router as projects_router
from routes.flows import router as flows_router
from routes.tasks import router as tasks_router
from routes.ai import router as ai_router
from routes.upload import router as upload_router

app = FastAPI(
    title="ThinkFlow API",
    description="Convert abstract problems into actionable subtasks using hierarchical visual flows and AI assistance.",
    version="0.1.0",
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Create tables on startup ───
@app.on_event("startup")
def on_startup():
    init_db()

# ─── Routers ───
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(flows_router, prefix="/api/flows", tags=["Flows"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(upload_router, prefix="/api/projects", tags=["Upload"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "thinkflow-backend"}
