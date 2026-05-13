import spacy
import re

# Load the lightweight English NLP model
# Make sure you ran: python -m spacy download en_core_web_sm in your terminal
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy model. Please wait...")
    import os
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def clean_text(text):
    """
    Cleans raw text by removing special characters, stop words, 
    and applying lemmatization for accurate matching.
    """
    # 1. Remove special characters and extra spaces using Regex
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    
    # 2. Feed the text into the spaCy NLP engine
    doc = nlp(text.lower())
    
    # 3. Lemmatize and remove stop words (like 'and', 'the', 'is')
    cleaned_tokens = [
        token.lemma_ for token in doc 
        if not token.is_stop and not token.is_punct and token.text.strip()
    ]
    
    # Join the cleaned words back into a single string
    return " ".join(cleaned_tokens)