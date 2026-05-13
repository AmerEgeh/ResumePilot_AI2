import spacy
from spacy.matcher import PhraseMatcher
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# --- 1. LOAD THE CUSTOM DOMAIN BRAIN ---
def load_ai_and_database():
    print("Loading AI and Custom Tech Skills Database into memory...")
    nlp = spacy.load("en_core_web_sm")
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER") # Case-insensitive matching
    
    # Pointing to the custom Data Engineering/Tech database you created
    db_path = "data/tech_skills_db.json"
    skills_list = []
    
    # We use a safe fallback in case the database folder hasn't been moved over yet
    if os.path.exists(db_path):
        with open(db_path, "r", encoding="utf-8") as f:
            skills_list = json.load(f)
            
    # Teach the AI every specific tech tool in our custom list
    if skills_list:
        patterns = list(nlp.pipe(skills_list))
        matcher.add("TECH_SKILLS", patterns)
    
    return nlp, matcher

# Initialize the AI (In FastAPI, this runs safely once when the server boots)
nlp, matcher = load_ai_and_database()

# --- 2. THE SCORING ALGORITHM ---
def calculate_match_score(cleaned_resume, cleaned_jd):
    """Calculates the mathematical overlap score (0-100%)."""
    if not cleaned_resume or not cleaned_jd: 
        return 0.0
    
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([cleaned_resume, cleaned_jd])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    
    return round(similarity * 100, 2)

# --- 3. THE SKILL EXTRACTOR ---
def extract_skills(text):
    """Scans raw text and returns ONLY words that exist in our custom database."""
    doc = nlp(text)
    matches = matcher(doc)
    
    found_skills = set()
    for match_id, start, end in matches:
        span = doc[start:end]
        found_skills.add(span.text.lower())
        
    return found_skills

# --- 4. THE GAP ANALYZER ---
def get_missing_keywords(raw_resume, raw_jd):
    """Finds required skills in the JD that are missing from the Resume."""
    # Extract only valid tech tools from both documents
    jd_skills = extract_skills(raw_jd)
    resume_skills = extract_skills(raw_resume)
    
    # Pure mathematical subtraction (JD skills minus Resume skills)
    missing = jd_skills.difference(resume_skills)
    
    # Return the top 10 missing skills, capitalized nicely for the UI
    return [skill.title() for skill in missing][:10]