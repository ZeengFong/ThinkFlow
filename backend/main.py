"""
ThinkFlow Backend — FastAPI entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from ai import providers
from database import IS_SQLITE, init_db
from routes.ai import router as ai_router
from routes.flows import router as flows_router
from routes.me import router as me_router
from routes.projects import router as projects_router
from routes.tasks import router as tasks_router
from routes.upload import router as upload_router

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s: %(message)s")
log = logging.getLogger("thinkflow")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if config.auth_mode() == "local":
        log.warning(
            "LOCAL MODE: SUPABASE_URL is not set, so sign-in is disabled and everyone shares one "
            "local user. Fine for development; never deploy like this."
        )
    else:
        log.info("Sign-in: Supabase (%s)", config.supabase_url())
    ai = [p.label for p in providers.configured_providers()]
    log.info("AI providers: %s", ", ".join(ai) if ai else "none (add GROQ_API_KEY to backend/.env)")
    log.info("Database: %s", "SQLite (local file)" if IS_SQLITE else "Postgres")
    yield


app = FastAPI(
    title="ThinkFlow API",
    description="Turn abstract problems into actionable subtasks using hierarchical visual flows and AI.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.frontend_origins(),
    allow_credentials=False,  # auth uses the Authorization header, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me_router, prefix="/api/me", tags=["Me"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(upload_router, prefix="/api/projects", tags=["Upload"])
app.include_router(flows_router, prefix="/api/flows", tags=["Flows"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "thinkflow-backend", "auth": config.auth_mode()}
