from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import google.generativeai as genai

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="AI Code Assistant Backend",
    description="Backend service for intelligent code analysis and suggestions"
)

class CodeContext(BaseModel):
    code: str
    file_path: str
    language: str
    request_type: str = "suggestion"
    user_prompt: Optional[str] = None
    file_content: str

class RewriteRequest(BaseModel):
    code: str
    request_type: str

class CodeResponse(BaseModel):
    suggestion: str

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

@app.post("/analyze_code", response_model=CodeResponse)
async def analyze_code(code_context: CodeContext):
    try:
        prompt = construct_prompt(code_context)
        response = model.generate_content(prompt)
        return CodeResponse(suggestion=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rewrite_code", response_model=CodeResponse)
async def rewrite_code(rewrite_request: RewriteRequest):
    try:
        prompt = construct_rewrite_prompt(rewrite_request)
        response = model.generate_content(prompt)
        return CodeResponse(suggestion=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def construct_prompt(code_context: CodeContext) -> str:
    base_prompt = f"""
Analyze the following {code_context.language} code snippet:

{code_context.code}

Context: This code is from the file {code_context.file_path}

"""
    
    if code_context.request_type == "suggestion":
        return base_prompt + "Provide concise improvements for this code snippet in 6-8 lines, focusing on key enhancements. Consider performance, readability, and best practices."
    elif code_context.request_type == "explain":
        return base_prompt + "Provide a clear and concise explanation of what this code does, its purpose, and any potential complexities or important considerations. Limit your explanation to about 400 words."
    elif code_context.request_type == "refactor":
        return base_prompt + "Provide a refactored version of this code that improves its structure, efficiency, or readability. Include brief inline comments to highlight significant changes. The refactored code should be self-explanatory and concise."
    else:
        return base_prompt + "Provide a brief analysis of this code snippet, considering its structure, potential improvements, and any notable characteristics. Limit your analysis to about 400 words."

def construct_rewrite_prompt(rewrite_request: RewriteRequest) -> str:
    base_prompt = f"""
Rewrite and further improve the following code:

{rewrite_request.code}

Request Type: {rewrite_request.request_type}

Please provide an improved version of the code that enhances its quality, readability, or efficiency. Include brief comments explaining significant changes.
"""
    return base_prompt

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
