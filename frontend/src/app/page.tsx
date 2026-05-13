"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import ResumeEditor from "./components/ResumeEditor";

export default function Dashboard() {
  // --- STATE VARIABLES ---
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- API CALL: UPLOAD PDF ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const extractedText = response.data.text || response.data.extracted_text || response.data.content;
      
      if (extractedText) {
        setResumeText(extractedText);
      } else {
        alert("Upload succeeded, but Next.js couldn't find the text.");
      }
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(`Backend Error: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- API CALL: ANALYZE RESUME ---
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
      
      console.log("AI Results:", response.data);
      setAnalysisResults(response.data);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to connect to the AI engine.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] text-black p-6 flex justify-center font-sans">
      <div className="w-full max-w-[1400px] flex gap-8">
        
        {/* LEFT SIDE: The Document Editor */}
        <div className="w-[65%] flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Resume Pilot AI</h1>
            
            <div className="flex gap-3">
              <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition disabled:bg-blue-300"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Resume 🚀"}
              </button>
            </div>
          </div>

          <div className="bg-white flex-1 rounded-xl shadow-lg border border-gray-200 pt-0 overflow-hidden min-h-[800px] flex flex-col">
            <ResumeEditor value={resumeText} onChange={(text) => setResumeText(text)} /> 
          </div>
        </div>

        {/* RIGHT SIDE: The AI Assistant Sidebar */}
        <div className="w-[35%] flex flex-col gap-4">
          
          {/* Job Description Input */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
             <h2 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Target Job Description</h2>
             <textarea 
                className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm bg-gray-50"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
             />
          </div>

          {/* Score Gauge */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Match Score</h2>
            <div className="w-32 h-32 rounded-full border-8 border-blue-100 flex items-center justify-center relative">
               <span className="text-3xl font-bold text-blue-600">
                 {analysisResults ? `${Math.round(analysisResults.score)}%` : "0%"}
               </span>
            </div>
          </div>

          {/* AI Analysis Feed */}
          <div className="bg-white flex-1 p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[800px]">
            {analysisResults ? (
              <>
                {/* 1. Missing Keywords Widget */}
                {analysisResults.missing_keywords && analysisResults.missing_keywords.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
                    <p className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                      🚨 Missing ATS Keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.missing_keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-white border border-yellow-300 text-yellow-700 rounded text-xs font-bold">
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Line-by-Line Feedback */}
                <h2 className="text-lg font-semibold text-gray-700 mb-4">AI Rewrites</h2>
                {analysisResults.feedback_report && Object.keys(analysisResults.feedback_report).length > 0 ? (
                  Object.entries(analysisResults.feedback_report).map(([original, suggested], index) => (
                    <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4 shadow-sm">
                       <p className="text-xs font-bold text-blue-800 uppercase tracking-tighter mb-1">Suggested Improvement</p>
                       <div className="mt-2 text-xs text-gray-500 italic line-through mb-1">
                         "{original}"
                       </div>
                       <div className="mt-2 p-3 bg-white border border-blue-100 rounded text-sm text-green-700 font-medium">
                         ✨ {String(suggested)}
                       </div>
                       <button 
                         onClick={() => alert("Replace feature coming next!")}
                         className="w-full mt-3 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition text-xs"
                       >
                         Accept & Rewrite
                       </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-10 italic">No specific rewrites found.</p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">🚀</div>
                <p className="text-sm text-gray-500 px-10 leading-relaxed">
                  Upload your resume and paste a job description to see line-by-line AI improvements.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}