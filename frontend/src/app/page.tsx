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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  // --- THE NEW NATIVE PDF ENGINE ---
  const exportToPDF = () => {
    window.print();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/extract", formData);
      const text = response.data.text || response.data.extracted_text || response.data.content;
      if (text) setResumeText(text);
    } catch (e) { alert("File extraction failed."); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const runAIAnalysis = async () => {
    if (!resumeText || !jobDescription) return alert("Please enter both a resume and a job description!");
    setIsAnalyzing(true);
    setAnalysisResults(null); 
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
        resume_text: resumeText,
        job_description: jobDescription,
      });
      const rawFeedback = JSON.stringify(response.data);
      if (rawFeedback.includes("RESOURCE_EXHAUSTED") || rawFeedback.includes("API_ERROR")) {
        setAnalysisResults({ error: "RATE_LIMIT" });
      } else {
        setAnalysisResults(response.data);
      }
    } catch (e: any) { 
       setAnalysisResults({ error: "CONNECTION_FAILED" });
    } finally { setIsAnalyzing(false); }
  };

  // --- NEW: HANDLE ACCEPTING REWRITES ---
  const handleAcceptRewrite = (oldText: string, newText: string) => {
    // 1. Tell the editor to replace the text
    editorRef.current?.replaceText(oldText, newText);

    // 2. Remove this specific suggestion from the sidebar UI
    setAnalysisResults((prevResults: any) => {
      if (!prevResults || !prevResults.feedback_report) return prevResults;

      // Create a copy of the current feedback report
      const updatedFeedback = { ...prevResults.feedback_report };
      
      // Delete the entry we just accepted
      delete updatedFeedback[oldText];

      // Return the updated state
      return {
        ...prevResults,
        feedback_report: updatedFeedback
      };
    });
  };

  // --- CIRCULAR GRADING LOGIC ---
  let matchStatus = { label: "PENDING", color: "text-gray-400", border: "border-gray-100", dot: "⚪" };
  let displayScore = "0%";
  
  if (analysisResults && !analysisResults.error) {
    const score = Math.round(analysisResults.score);
    displayScore = `${score}%`;
    if (score > 44) {
      matchStatus = { label: "EXCELLENT", color: "text-green-600", border: "border-green-400", dot: "🟢" };
    } else if (score >= 30) {
      matchStatus = { label: "GOOD", color: "text-yellow-500", border: "border-yellow-400", dot: "🟡" };
    } else {
      matchStatus = { label: "WEAK", color: "text-red-500", border: "border-red-400", dot: "🔴" };
    }
  } else {
      matchStatus.border = "border-blue-100";
      matchStatus.color = "text-blue-600";
  }

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] text-black p-6 flex justify-center font-sans print:bg-white print:p-0">
      
      <div className="w-full max-w-[1400px] flex gap-8 print:block print:w-full print:max-w-none">
        
        {/* LEFT SIDE: EDITOR */}
        <div className="w-[65%] flex flex-col gap-4 print:w-full print:block">
          
          {/* THE TOP NAVIGATION BAR */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:hidden">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Resume Pilot AI</h1>
            <div className="flex gap-3">
              <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 text-sm">
                {isUploading ? "Extracting..." : "Upload PDF"}
              </button>

              <button 
                onClick={exportToPDF}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition text-sm flex items-center gap-2"
              >
                📥 Download PDF
              </button>

              <button onClick={runAIAnalysis} disabled={isAnalyzing} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition disabled:bg-blue-300 text-sm">
                {isAnalyzing ? "Analyzing..." : "Analyze Resume 🚀"}
              </button>
            </div>
          </div>

          {/* THE RESUME PAPER */}
          <div id="resume-paper" className="bg-white flex-1 rounded-xl shadow-lg border border-gray-200 pt-0 overflow-hidden min-h-[800px] flex flex-col print:shadow-none print:border-none print:min-h-0 print:overflow-visible">
            <ResumeEditor ref={editorRef} value={resumeText} onChange={(text) => setResumeText(text)} /> 
          </div>
        </div>

        {/* RIGHT SIDE: SIDEBAR */}
        <div className="w-[35%] flex flex-col gap-4 print:hidden">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <h2 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Target Job Description</h2>
             <textarea className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm bg-gray-50" placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </div>

          {/* MATCH SCORE CARD WITH LEGEND */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Match Score</h2>
            
            <div className={`w-32 h-32 rounded-full border-8 ${matchStatus.border} flex items-center justify-center relative transition-colors duration-500 mb-4`}>
               <span className={`text-3xl font-bold ${matchStatus.color}`}>
                 {displayScore}
               </span>
            </div>

            {/* UPGRADED, READABLE SCORING LEGEND */}
            <div className="w-full mt-4 pt-5 border-t border-gray-100">
              <div className="flex justify-between text-xs tracking-wide font-extrabold">
                
                {/* WEAK TIER */}
                <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${matchStatus.label === 'WEAK' ? 'text-red-600 scale-110' : 'text-gray-400'}`}>
                  <span>🔴 WEAK</span>
                  <span className={`${matchStatus.label === 'WEAK' ? 'text-red-600' : 'text-gray-400'} font-bold`}>0-29%</span>
                </div>
                
                {/* GOOD TIER */}
                <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${matchStatus.label === 'GOOD' ? 'text-yellow-600 scale-110' : 'text-gray-400'}`}>
                  <span>🟡 GOOD</span>
                  <span className={`${matchStatus.label === 'GOOD' ? 'text-yellow-600' : 'text-gray-400'} font-bold`}>30-44%</span>
                </div>
                
                {/* EXCELLENT TIER */}
                <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${matchStatus.label === 'EXCELLENT' ? 'text-green-600 scale-110' : 'text-gray-400'}`}>
                  <span>🟢 EXCELLENT</span>
                  <span className={`${matchStatus.label === 'EXCELLENT' ? 'text-green-600' : 'text-gray-400'} font-bold`}>45%+</span>
                </div>

              </div>
            </div>

          </div>

          <div className="bg-white flex-1 p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[800px]">
            {analysisResults && !analysisResults.error ? (
              <>
                {analysisResults.missing_keywords?.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
                    <p className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">🚨 Missing ATS Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.missing_keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-white border border-yellow-300 text-yellow-700 rounded text-xs font-bold">+ {kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-lg font-semibold text-gray-700 mb-4">AI Rewrites</h2>
                {Object.entries(analysisResults.feedback_report || {}).length > 0 ? (
                  Object.entries(analysisResults.feedback_report).map(([oldT, newT], i) => (
                    <div 
                      key={i} 
                      className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md cursor-default"
                      onMouseEnter={() => editorRef.current?.highlightText(oldT)}
                      onMouseLeave={() => editorRef.current?.clearHighlight()}
                    >
                       <p className="text-xs font-bold text-blue-800 uppercase tracking-tighter mb-1">Suggested Improvement</p>
                       <div className="mt-2 text-xs text-gray-500 italic line-through mb-1">"{oldT}"</div>
                       <div className="mt-2 p-3 bg-white border border-blue-100 rounded text-sm text-green-700 font-medium">✨ {String(newT)}</div>
                       <button 
                         onClick={() => handleAcceptRewrite(oldT, String(newT))} 
                         className="w-full mt-3 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition text-xs shadow-sm"
                       >
                         Accept & Rewrite
                       </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No AI rewrites pending.</p>
                )}
              </>
            ) : analysisResults?.error === "RATE_LIMIT" ? (
              <div className="p-8 flex flex-col items-center text-center bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm text-red-700 font-bold mb-2">Gemini is Overloaded</p>
                <p className="text-xs text-gray-600 leading-relaxed">Wait 60 seconds and try again.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 italic text-sm">
                Upload and Analyze to see AI improvements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}