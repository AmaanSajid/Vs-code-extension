from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import google.generativeai as genai

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Code Assistant Backend",
    description="Backend service for intelligent code analysis and suggestions"
)

# Pydantic models for request validation
class CodeContext(BaseModel):
    code: str
    file_path: str
    language: str
    request_type: str = "suggestion"
    user_prompt: Optional[str] = None
    file_content: str  # New field for entire file content

class CodeSuggestionResponse(BaseModel):
    suggestion: str
    explanation: Optional[str] = None

# Initialize Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

@app.post("/analyze_code", response_model=CodeSuggestionResponse)
async def analyze_code(code_context: CodeContext):
    try:
        prompt = construct_prompt(code_context)
        
        response = model.generate_content(prompt)
        
        return CodeSuggestionResponse(
            suggestion=response.text,
            explanation=None  # Gemini doesn't provide separate explanation
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def construct_prompt(code_context: CodeContext) -> str:
    base_prompt = f"""
File Context:
{code_context.file_content}

Analyze the following {code_context.language} code from file {code_context.file_path}:

{code_context.code}

"""
    
    if code_context.request_type == "suggestion":
        return base_prompt + "Provide an improved version of this code, highlighting potential improvements or best practices."
    elif code_context.request_type == "explain":
        return base_prompt + "Provide a detailed explanation of what this code does, including its purpose and any potential complexities."
    elif code_context.request_type == "refactor":
        return base_prompt + "Suggest a refactored version of this code to improve its readability, performance, or maintainability."
    else:
        return base_prompt + "Provide a general analysis of the code."

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
