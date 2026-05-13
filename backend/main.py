from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import extract, analyze  # <-- UPDATED: We added the analyze router here!

app = FastAPI(
    title="ResumePilot AI Backend",
    description="API for parsing, analyzing, and generating resumes.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# --- INCLUDE ROUTERS --- 
app.include_router(extract.router, prefix="/api", tags=["Extraction"])
app.include_router(analyze.router, prefix="/api", tags=["Analysis"]) # <-- NEW: Linked the new router!

@app.get("/")
async def root():
    return {"message": "🚀 ResumePilot AI Backend is running!"}