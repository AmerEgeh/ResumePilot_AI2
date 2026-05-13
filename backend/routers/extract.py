from fastapi import APIRouter, UploadFile, File, HTTPException
import fitz  # PyMuPDF

# Initialize the router for this specific feature
router = APIRouter()

@router.post("/extract")
async def extract_resume_text(file: UploadFile = File(...)):
    """
    Accepts a PDF file upload, extracts the text using PyMuPDF, 
    and returns it as a JSON string for the Next.js frontend.
    """
    # 1. Security Check: Ensure it's a PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # 2. Read the file into memory (No need to save it to the hard drive!)
        file_bytes = await file.read()
        
        # 3. Open the PDF in memory
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        # 4. Extract the text page by page
        extracted_text = ""
        for page in doc:
            extracted_text += page.get_text("text") + "\n\n"
            
        doc.close()
        
        # 5. Return the clean data to the frontend
        return {
            "filename": file.filename,
            "extracted_text": extracted_text.strip()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")