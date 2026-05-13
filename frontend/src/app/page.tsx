"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import ResumeEditor from "./components/ResumeEditor";

export default function Dashboard() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // NEW: A reference to a hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: The function that talks to your /api/extract backend!
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file); // Some backends require this to be named "upload_file" or "pdf". We will find out!

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // THE WIRETAP: Let's see exactly what Python sent back!
      console.log("Raw Python Response:", response.data);
      
      // Let's try to catch the text no matter what the backend named it
      const extractedText = response.data.text || response.data.extracted_text || response.data.content;
      
      if (extractedText) {
        setResumeText(extractedText);
      } else {
        // If it still fails, this alert will tell us the exact names of the JSON keys Python is using
        alert("Upload succeeded, but Next.js couldn't find the text. Python sent these keys: " + Object.keys(response.data).join(", "));
      }
      
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(`Backend Error! Next.js says: ${error.message}. Please check your Python terminal!`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runAIAnalysis = async () => {
    if (!resumeText || !jobDescription) {
      alert("Please enter both a resume and a job description!");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
        resume_text: resumeText,
        job_description: jobDescription,
      });
      
      setAnalysisResults(response.data);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to connect to the AI engine. Is your Python server running?");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] text-black p-6 flex justify-center">
      <div className="w-full max-w-[1400px] flex gap-8">
        
        {/* LEFT SIDE: The Document Editor */}
        <div className="w-[65%] flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Resume Pilot AI</h1>
            
            <div className="flex gap-3">
              {/* NEW: Hidden file input */}
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
              
              {/* NEW: The Upload Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                {isUploading ? "Extracting..." : "Upload PDF"}
              </button>

              <button 
                onClick={runAIAnalysis}
                disabled={isAnalyzing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Resume 🚀"}
              </button>
            </div>
          </div>

          <div className="bg-white flex-1 rounded-xl shadow-lg border border-gray-200 p-12 min-h-[800px]">
            {/* UPDATED: We now pass 'value' so the editor can receive the PDF text */}
            <ResumeEditor 
              value={resumeText} 
              onChange={(text) => setResumeText(text)} 
            /> 
          </div>
        </div>

        {/* RIGHT SIDE: The AI Assistant Sidebar */}
        <div className="w-[35%] flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
             <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Target Job Description</h2>
             <textarea 
                className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
             />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Match Score</h2>
            <div className="w-32 h-32 rounded-full border-8 border-blue-100 flex items-center justify-center">
               <span className="text-3xl font-bold text-blue-600">
                 {analysisResults ? `${analysisResults.score}%` : "0%"}
               </span>
            </div>
          </div>

          <div className="bg-white flex-1 p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">AI Suggestions</h2>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-3 text-center text-gray-500 text-sm">
               Upload your resume and paste a job description, then click Analyze to get Gemini AI feedback.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}