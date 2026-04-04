import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Mic, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Volume2, 
  RefreshCw,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { evaluatePractice } from '../services/gemini';
import { savePracticeSession } from '../services/storage';

interface PracticeProps {
  user: any;
}

export default function Practice({ user }: PracticeProps) {
  const [activeMode, setActiveMode] = useState<'reading' | 'speech' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState("");

  const startPractice = async () => {
    setError(null);
    setFeedback(null);
    setScore(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsAnalyzing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            const promptText = activeMode === 'reading' 
              ? readingTexts[currentTextIndex] 
              : (isCustomTopic && customTopic.trim() ? customTopic : speechTopics[currentTopicIndex]);
            
            const result = await evaluatePractice(base64data, activeMode || 'speech', promptText);
            setScore(result.score || 0);
            setFeedback(result.feedback || "Good effort! Keep practicing.");
            setIsAnalyzing(false);

            // Save practice session
            const practiceSession = {
              sessionId: Date.now().toString(),
              date: new Date().toLocaleDateString(),
              mode: activeMode,
              topic: promptText,
              overallScore: result.score || 0,
              feedback: result.feedback || "Good effort! Keep practicing."
            };
            await savePracticeSession(user.uid, practiceSession);

            // Auto-advance topic
            if (activeMode === 'reading') {
              setCurrentTextIndex((prev) => (prev + 1) % readingTexts.length);
            } else if (!isCustomTopic) {
              setCurrentTopicIndex((prev) => (prev + 1) % speechTopics.length);
            }
          };
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to analyze audio. Please try again.");
          setIsAnalyzing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission dismissed') || err.message?.includes('Permission denied')) {
        setError('Microphone access was denied. Please enable permissions in your browser settings.');
      } else {
        setError('Failed to access microphone. Please ensure no other app is using it.');
      }
    }
  };

  const stopPractice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                {activeMode === 'reading' ? 'Read this text aloud' : 'Speak on this topic'}
              </h3>
              {activeMode === 'speech' && (
                <button
                  onClick={() => setIsCustomTopic(!isCustomTopic)}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                >
                  {isCustomTopic ? 'Use preset topics' : 'Enter custom topic'}
                </button>
              )}
            </div>
            
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-2xl">
              {isCustomTopic && activeMode === 'speech' ? (
                <textarea
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Type your custom topic here..."
                  className="w-full bg-transparent text-2xl font-medium text-white leading-relaxed outline-none resize-none placeholder:text-slate-600"
                  rows={3}
                />
              ) : (
                <p className="text-2xl font-medium text-white leading-relaxed">
                  {activeMode === 'reading' ? readingTexts[currentTextIndex] : speechTopics[currentTopicIndex]}
                </p>
              )}
            </div>
            <div className="flex justify-end mt-4 gap-2">
              {(!isCustomTopic || activeMode === 'reading') && (
                <button 
                  onClick={() => activeMode === 'reading' ? setCurrentTextIndex((currentTextIndex + 1) % readingTexts.length) : setCurrentTopicIndex((currentTopicIndex + 1) % speechTopics.length)}
                  className="text-slate-500 hover:text-white transition-all text-sm font-medium"
                >
                  Try another one
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            {!isRecording && !isAnalyzing && (
              <button 
                onClick={startPractice}
                className="w-24 h-24 rounded-full flex items-center justify-center transition-all bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
              >
                <Mic className="text-white w-10 h-10" />
              </button>
            )}
            {isRecording && (
              <button 
                onClick={stopPractice}
                className="w-24 h-24 rounded-full flex items-center justify-center transition-all bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/20 animate-pulse"
              >
                <div className="w-8 h-8 bg-white rounded-sm" />
              </button>
            )}
            {isAnalyzing && (
              <button 
                disabled
                className="w-24 h-24 rounded-full flex items-center justify-center transition-all bg-indigo-600/50 cursor-not-allowed"
              >
                <Loader2 className="text-white w-10 h-10 animate-spin" />
              </button>
            )}
            <p className="text-slate-400 font-medium">
              {isRecording ? 'Click to stop recording' : isAnalyzing ? 'Analyzing audio...' : 'Click to start recording'}
            </p>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400"
              >
                <AlertCircle size={20} />
                <p className="font-medium">{error}</p>
              </motion.div>
            )}

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
