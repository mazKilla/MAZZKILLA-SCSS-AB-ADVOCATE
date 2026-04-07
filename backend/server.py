"""
SCSS AB Advocate — FastAPI entry point.
All routes are in /routes/*.py; shared state is in config.py.
"""
import sys
import os

# Ensure the backend directory is in the path so `config` and `routes` are importable
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import sessions, chat, emails, ec, misc, policy, tools

app = FastAPI(title="SCSS AB Advocate API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(misc.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(emails.router)
app.include_router(ec.router)
app.include_router(policy.router)
app.include_router(tools.router)
