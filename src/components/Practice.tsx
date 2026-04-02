import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  BookOpen, 
  Mic, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Volume2, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PracticeProps {
  user: User;
}

export default function Practice({ user }: PracticeProps) {
  const [activeMode, setActiveMode] = useState<'reading' | 'speech' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const readingTexts = [
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and is often used for practice.",
    "Effective communication is not just about what you say, but how you say it. Pay attention to your tone, pace, and body language during an interview.",
    "Leadership is the capacity to translate vision into reality. It involves inspiring others and working together towards a common goal."
  ];

  const speechTopics = [
    "Tell me about a time you faced a challenge at work.",
    "What are your greatest strengths and weaknesses?",
    "Where do you see yourself in five years?",
    "Why do you want to work for this company?"
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  const startPractice = () => {
    setIsRecording(true);
    setFeedback(null);
    setScore(null);
    // In a real app, we would connect to Gemini Live here
    setTimeout(() => {
      setIsRecording(false);
      setFeedback("Great pronunciation! Try to slow down a bit on the longer words.");
      setScore(85);
    }, 5000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-2">Communication Practice</h2>
        <p className="text-slate-400">Sharpen your speaking skills with real-time AI feedback on pronunciation and fluency.</p>
      </div>

      {!activeMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.button 
            whileHover={{ y: -5 }}
            onClick={() => setActiveMode('reading')}
            className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all group"
          >
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
              <BookOpen className="text-white w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Reading Practice</h3>
            <p className="text-slate-400 mb-6">Read provided paragraphs aloud to improve your pronunciation and rhythm.</p>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              Start Reading <Play size={16} />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -5 }}
            onClick={() => setActiveMode('speech')}
            className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all group"
          >
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
              <MessageSquare className="text-white w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Speech Practice</h3>
            <p className="text-slate-400 mb-6">Give short speeches on common interview topics to build your confidence.</p>
            <div className="flex items-center gap-2 text-purple-400 font-semibold">
              Start Speaking <Play size={16} />
            </div>
          </motion.button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={() => setActiveMode(null)}
              className="text-slate-400 hover:text-white transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Switch Mode
            </button>
            <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
              activeMode === 'reading' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {activeMode} Mode
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">
              {activeMode === 'reading' ? 'Read this text aloud' : 'Speak on this topic'}
            </h3>
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-2xl">
              <p className="text-2xl font-medium text-white leading-relaxed">
                {activeMode === 'reading' ? readingTexts[currentTextIndex] : speechTopics[currentTopicIndex]}
              </p>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button 
                onClick={() => activeMode === 'reading' ? setCurrentTextIndex((currentTextIndex + 1) % readingTexts.length) : setCurrentTopicIndex((currentTopicIndex + 1) % speechTopics.length)}
                className="text-slate-500 hover:text-white transition-all text-sm font-medium"
              >
                Try another one
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={startPractice}
              disabled={isRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
              }`}
            >
              {isRecording ? <div className="w-8 h-8 bg-white rounded-sm" /> : <Mic className="text-white w-10 h-10" />}
            </button>
            <p className="text-slate-400 font-medium">
              {isRecording ? 'Listening...' : 'Click to start recording'}
            </p>

            <AnimatePresence>
              {feedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mt-8 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <CheckCircle size={20} />
                      AI Feedback
                    </div>
                    <div className="text-2xl font-bold text-white">{score}%</div>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{feedback}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
