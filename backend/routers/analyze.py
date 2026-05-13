from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Import your existing AI logic
from utils.text_cleaner import clean_text
from models.matcher import calculate_match_score, get_missing_keywords
from models.coach import get_resume_feedback, generate_micro_objective

router = APIRouter()

# Define what data the frontend is required to send us
class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

@router.post("/analyze")
async def analyze_resume(request: AnalyzeRequest):
    """
    Accepts raw resume text and a job description, runs the Gemini AI 
    analysis, and returns all feedback in a structured JSON format.
    """
    if not request.resume_text or not request.job_description:
        raise HTTPException(status_code=400, detail="Resume text and Job Description are required.")
    
    try:
        # 1. Clean the text (just like the old Streamlit app)
        cleaned_resume = clean_text(request.resume_text)
        cleaned_jd = clean_text(request.job_description)
        
        # 2. Run the AI models
        score = calculate_match_score(cleaned_resume, cleaned_jd)
        missing_keywords = get_missing_keywords(request.resume_text, request.job_description)
        feedback = get_resume_feedback(request.resume_text, cleaned_jd)
        micro_objective = generate_micro_objective(request.resume_text, request.job_description)
        
        # 3. Return everything neatly to the Next.js frontend!
        return {
            "score": score,
            "missing_keywords": missing_keywords,
            "feedback_report": feedback,
            "micro_objective": micro_objective
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")