import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { parseResume } from '../services/gemini';
import { saveUserProfile, getUserProfile } from '../services/storage';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ResumeUploadProps {
  user: any;
  onComplete: () => void;
}

export default function ResumeUpload({ user, onComplete }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
      setError('Please upload a PDF or text file.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      setIsParsing(true);
      const resumeData = await parseResume(text);

      const existingProfile = await getUserProfile(user.uid) || {};
      const updatedProfile = {
        ...existingProfile,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        resumeText: text,
        resumeData: resumeData,
        createdAt: existingProfile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await saveUserProfile(user.uid, updatedProfile);

      setSuccess(true);
      setTimeout(onComplete, 1500);
    } catch (err) {
      console.error(err);
      setError('Failed to process resume. Please try again.');
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Upload Your Resume</h2>
        <p className="text-slate-400">We'll use your resume to generate personalized interview questions based on your experience.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          success ? 'border-green-500 bg-green-500/5' : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/50'
        }`}
      >
        <input 
          type="file" 
          accept=".pdf,.txt" 
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isUploading || isParsing || success}
        />

        <div className="flex flex-col items-center">
          {success ? (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle className="text-white w-10 h-10" />
            </motion.div>
          ) : (
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
              isUploading || isParsing ? 'bg-indigo-600/20' : 'bg-indigo-600 shadow-indigo-500/20'
            }`}>
              {isUploading || isParsing ? (
                <Loader2 className="text-indigo-400 w-10 h-10 animate-spin" />
              ) : (
                <Upload className="text-white w-10 h-10" />
              )}
            </div>
          )}

          <h3 className="text-xl font-semibold text-white mb-2">
            {isUploading ? 'Uploading...' : isParsing ? 'Analyzing Resume...' : success ? 'Resume Processed!' : 'Click or drag to upload'}
          </h3>
          <p className="text-slate-400 mb-6">Supports PDF and TXT formats</p>
          
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">{error}</p>
          )}
        </div>
      </motion.div>

      <div className="mt-6 text-center">
        <p className="text-slate-400 mb-4">Don't have a resume handy?</p>
        <button 
          onClick={onComplete}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
        >
          Fill Details Manually
        </button>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: FileText, title: 'Smart Parsing', desc: 'Extracts skills, projects, and experience automatically.' },
          { icon: CheckCircle, title: 'Tailored Questions', desc: 'Generates questions specific to your background.' },
          { icon: Upload, title: 'Secure Storage', desc: 'Your data is encrypted and stored securely.' },
        ].map((feature, i) => (
          <div key={i} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <feature.icon className="text-indigo-400 w-8 h-8 mb-4" />
            <h4 className="text-white font-semibold mb-2">{feature.title}</h4>
            <p className="text-sm text-slate-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
