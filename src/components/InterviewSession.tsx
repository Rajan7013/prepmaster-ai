import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Video, 
  StopCircle, 
  Play, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Eye,
  Activity,
  Volume2,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { generateInterviewQuestions, analyzePerformance } from '../services/gemini';
import { saveVideo, saveSession, getUserProfile } from '../services/storage';
import { generatePDFReport, generateExcelReport } from '../services/reports';
import { Download, FileText, Table, StopCircle as StopIcon, Timer, HelpCircle } from 'lucide-react';

interface InterviewSessionProps {
  user: any;
  onComplete: () => void;
}

export default function InterviewSession({ user, onComplete }: InterviewSessionProps) {
  const [status, setStatus] = useState<'idle' | 'calibrating' | 'preparing' | 'active' | 'analyzing' | 'completed'>('idle');
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [finalSummary, setFinalSummary] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizTimer, setQuizTimer] = useState<number | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [interviewLevel, setInterviewLevel] = useState<'Basic' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlaybackContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const userMicSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mixedAudioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const quizTimerIntervalRef = useRef<any>(null);

  const [realtimeMetrics, setRealtimeMetrics] = useState({
    eyeContact: 0,
    gestures: { hands: 0, head: 0, posture: 'Upright' },
    voice: { pitch: 0, pace: 0, clarity: 0, tone: 'Neutral' },
    fillers: 0
  });

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioPlaybackContextRef.current) {
        audioPlaybackContextRef.current.close();
      }
      if (quizTimerIntervalRef.current) {
        clearInterval(quizTimerIntervalRef.current);
      }
    };
  }, []);

  const startCalibration = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus('calibrating');
      setCalibrationStep(1);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission dismissed') || err.message?.includes('Permission denied')) {
        setError('Camera or microphone access was denied or dismissed. Please enable permissions in your browser settings and refresh.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect your devices and try again.');
      } else {
        setError(err.message || 'Failed to access camera/mic. Please ensure no other app is using them.');
      }
    }
  };

  const nextCalibrationStep = () => {
    // Initialize audio playback context on user gesture
    if (!audioPlaybackContextRef.current) {
      audioPlaybackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlayTimeRef.current = audioPlaybackContextRef.current.currentTime;
    } else if (audioPlaybackContextRef.current.state === 'suspended') {
      audioPlaybackContextRef.current.resume();
    }

    if (calibrationStep < 5) {
      setCalibrationStep(prev => prev + 1);
    } else {
      setCalibrationStep(6); // Special state for completion
      setTimeout(() => {
        startInterview();
      }, 1500);
    }
  };

  const restartCalibration = () => {
    setCalibrationStep(1);
    setError(null);
  };

  const startInterview = async () => {
    setStatus('preparing');
    setError(null);

    try {
      const userData = JSON.parse(localStorage.getItem(`userProfile_${user.uid}`) || '{}');
      const hasProfile = userData?.resumeText || (userData?.resumeData?.skills && userData.resumeData.skills.length > 0);
      
      if (!hasProfile) {
        setError('Please upload your resume or fill out your profile before starting an interview.');
        setStatus('idle');
        return;
      }

      const generatedQuestions = await generateInterviewQuestions(
        userData?.resumeData || {}, 
        userData?.targetRole || 'Software Engineer', 
        userData?.targetIndustry || 'Technology',
        interviewLevel,
        selectedTopics,
        isQuizMode
      );
      setQuestions(generatedQuestions);
      
      // If stream isn't already active from calibration
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }

      setStatus('active');
      setQuestionStartTime(Date.now());
      setIsAnswering(false);
      setResponseTime(null);
      
      // Initialize audio playback context on user gesture (if not already)
      if (!audioPlaybackContextRef.current) {
        audioPlaybackContextRef.current = new AudioContext({ sampleRate: 24000 });
        nextPlayTimeRef.current = audioPlaybackContextRef.current.currentTime;
      } else if (audioPlaybackContextRef.current.state === 'suspended') {
        audioPlaybackContextRef.current.resume();
      }

      // Start recording with mixed audio
      if (streamRef.current && audioPlaybackContextRef.current) {
        try {
          // Create a destination for mixed audio (User Mic + AI Audio)
          mixedAudioDestinationRef.current = audioPlaybackContextRef.current.createMediaStreamDestination();
          
          // Connect user's microphone to the mixed destination
          userMicSourceRef.current = audioPlaybackContextRef.current.createMediaStreamSource(streamRef.current);
          userMicSourceRef.current.connect(mixedAudioDestinationRef.current);

          // Create a combined stream (Original Video + Mixed Audio)
          const combinedStream = new MediaStream([
            ...streamRef.current.getVideoTracks(),
            ...mixedAudioDestinationRef.current.stream.getAudioTracks()
          ]);

          const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
          mediaRecorderRef.current = mediaRecorder;
          recordedChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          mediaRecorder.start(1000);
        } catch (err) {
          console.error("MediaRecorder error:", err);
        }
      }

      connectToGeminiLive();
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission dismissed') || err.message?.includes('Permission denied')) {
        setError('Camera or microphone access was denied or dismissed. Please enable permissions in your browser settings and refresh.');
      } else {
        setError(err.message || 'Failed to start interview. Please check camera/mic permissions.');
      }
      setStatus('idle');
    }
  };

  const connectToGeminiLive = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a professional interviewer. Observe the user's video and audio. 
          Track their eye contact, hand gestures (hands, head nods, posture), voice (pitch, pace, clarity, tone), and use of filler words. 
          Also track if the user has started answering the question (isAnswering: boolean).
          
          ADAPTIVE LOGIC:
          1. Start with a friendly greeting and an easy question like "Tell me about yourself".
          2. Based on their skills and selected topics (${selectedTopics.join(', ')}), start with ${interviewLevel} level questions.
          3. If difficulty is Basic: Start with easy, introductory questions and basic definitions.
          4. If difficulty is Intermediate: Ask a mix of conceptual and practical questions.
          5. If difficulty is Advanced: Ask complex, in-depth, and challenging technical questions.
          6. If QUIZ MODE is active: Present a question and 3 multiple-choice options (A, B, C). Tell the user they have 5 seconds.
          
          CRITICAL: Every 2-3 seconds, output a hidden JSON-like tag in your response to update the dashboard metrics. 
          Format: [METRICS: {"eyeContact": 0-100, "gestures": {"hands": 0-100, "head": 0-100, "posture": "Upright|Slouching|Leaning"}, "voice": {"pitch": 0-100, "pace": 0-100, "clarity": 0-100, "tone": "Confident|Nervous|Neutral"}, "fillers": count, "isAnswering": true|false, "level": "basic|intermediate|advanced", "quiz": {"active": true|false, "options": ["A", "B", "C"], "timer": 5}}]
          
          Provide real-time feedback in a supportive way. 
          IMPORTANT: You must speak out loud.`,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live connected");
            sessionPromise.then(session => {
              sessionRef.current = session;
              startStreaming();
              session.sendRealtimeInput({ text: "Hello, I am ready for the interview. Please greet me and ask the first question out loud." });
            });
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              if (!audioPlaybackContextRef.current) {
                audioPlaybackContextRef.current = new AudioContext({ sampleRate: 24000 });
                nextPlayTimeRef.current = audioPlaybackContextRef.current.currentTime;
              }
              
              const binaryString = atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Convert PCM16 to Float32
              const float32Data = new Float32Array(bytes.length / 2);
              const dataView = new DataView(bytes.buffer);
              for (let i = 0; i < float32Data.length; i++) {
                float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
              }
              
              const audioBuffer = audioPlaybackContextRef.current.createBuffer(1, float32Data.length, 24000);
              audioBuffer.getChannelData(0).set(float32Data);
              
              const source = audioPlaybackContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioPlaybackContextRef.current.destination);
              
              // Also connect to the mixed destination for recording
              if (mixedAudioDestinationRef.current) {
                source.connect(mixedAudioDestinationRef.current);
              }
              
              const currentTime = audioPlaybackContextRef.current.currentTime;
              if (nextPlayTimeRef.current < currentTime) {
                nextPlayTimeRef.current = currentTime;
              }
              source.start(nextPlayTimeRef.current);
              nextPlayTimeRef.current += audioBuffer.duration;
              
              audioSourcesRef.current.push(source);
              source.onended = () => {
                audioSourcesRef.current = audioSourcesRef.current.filter(s => s !== source);
              };
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(source => {
                try {
                  source.stop();
                } catch (e) {
                  // Ignore errors if already stopped
                }
              });
              audioSourcesRef.current = [];
              if (audioPlaybackContextRef.current) {
                nextPlayTimeRef.current = audioPlaybackContextRef.current.currentTime;
              }
            }

            // Handle real-time feedback from Gemini
            const text = message.serverContent?.modelTurn?.parts[0]?.text;
            if (text) {
              const metricsMatch = text.match(/\[METRICS: ({.*?})\]/);
              if (metricsMatch) {
                try {
                  const newMetrics = JSON.parse(metricsMatch[1]);
                  
                  if (newMetrics.isAnswering && !isAnswering && questionStartTime > 0) {
                    setIsAnswering(true);
                    setResponseTime((Date.now() - questionStartTime) / 1000);
                  }

                  if (newMetrics.level) {
                    setInterviewLevel(newMetrics.level);
                  }

                  if (newMetrics.quiz) {
                    setIsQuizMode(newMetrics.quiz.active);
                    setQuizOptions(newMetrics.quiz.options || []);
                    if (newMetrics.quiz.active && newMetrics.quiz.timer) {
                      startQuizTimer(newMetrics.quiz.timer);
                    } else if (!newMetrics.quiz.active) {
                      stopQuizTimer();
                    }
                  }

                  setRealtimeMetrics(prev => ({
                    ...prev,
                    ...newMetrics
                  }));
                } catch (e) {
                  console.error("Failed to parse metrics:", e);
                }
              }
            }
          },
          onerror: (err) => {
            console.error("Gemini Live error:", err);
            setError("Connection lost. Retrying...");
          }
        }
      });
      await sessionPromise;
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        setError("You have exceeded your Gemini API quota. Please check your plan and billing details.");
      } else {
        setError("Failed to connect to AI interviewer. Please try again.");
      }
      setStatus('idle');
    }
  };

  const startStreaming = () => {
    if (!streamRef.current || !sessionRef.current) return;

    // Audio streaming
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Convert to Int16 PCM
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
      
      sessionRef.current.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    };

    source.connect(processor);
    // Do NOT connect to destination to avoid user hearing their own voice
    // processor.connect(audioContextRef.current.destination);

    // Video streaming (frames)
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && sessionRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
          sessionRef.current.sendRealtimeInput({
            video: { data: base64Data, mimeType: 'image/jpeg' }
          });
        }
      }
    }, 1000); // Send 1 frame per second

    return () => {
      clearInterval(interval);
      processor.disconnect();
      source.disconnect();
    };
  };

  const updateMetrics = () => {
    setRealtimeMetrics({
      eyeContact: Math.floor(Math.random() * 20) + 70,
      gestures: { 
        hands: Math.floor(Math.random() * 40) + 50,
        head: Math.floor(Math.random() * 20) + 30,
        posture: 'Upright'
      },
      voice: { 
        pitch: Math.floor(Math.random() * 30) + 60,
        pace: Math.floor(Math.random() * 20) + 80,
        clarity: Math.floor(Math.random() * 10) + 90,
        tone: 'Confident'
      },
      fillers: Math.floor(Math.random() * 5)
    });
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setQuestionStartTime(Date.now());
      setIsAnswering(false);
      setResponseTime(null);
      // Update Gemini context
      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput({
          text: `The user has finished answering. Please ask the next question out loud: ${questions[nextIndex]}`
        });
      }
    } else {
      finishInterview();
    }
  };

  const startQuizTimer = (seconds: number) => {
    stopQuizTimer();
    setQuizTimer(seconds);
    quizTimerIntervalRef.current = setInterval(() => {
      setQuizTimer(prev => {
        if (prev !== null && prev > 0) return prev - 1;
        stopQuizTimer();
        return 0;
      });
    }, 1000);
  };

  const stopQuizTimer = () => {
    if (quizTimerIntervalRef.current) {
      clearInterval(quizTimerIntervalRef.current);
      quizTimerIntervalRef.current = null;
    }
    setQuizTimer(null);
  };

  const stopInterview = () => {
    if (window.confirm("Are you sure you want to stop the interview? Your progress will be saved up to this point.")) {
      finishInterview();
    }
  };

  const finishInterview = async () => {
    setStatus('analyzing');
    setIsRecording(false);
    
    // Stop streams
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (audioPlaybackContextRef.current) {
      audioPlaybackContextRef.current.close();
    }
    if (sessionRef.current) {
      sessionRef.current.close();
    }

    let uploadedVideoUrl = null;
    let videoBase64: string | undefined = undefined;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsUploading(true);
      const result = await new Promise<{url: string | null, base64: string | undefined}>((resolve) => {
        if (!mediaRecorderRef.current) return resolve({url: null, base64: undefined});
        mediaRecorderRef.current.onstop = async () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            
            // Convert to base64 for Gemini analysis
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
              const base64data = (reader.result as string).split(',')[1];
              
              // Instead of uploading to Firebase, we just create a local object URL for playback
              // Note: This URL will expire when the browser is closed, but it's fine for a local-only app
              const url = URL.createObjectURL(blob);
              resolve({url, base64: base64data});
            };
          } catch (err) {
            console.error("Failed to process video:", err);
            resolve({url: null, base64: undefined});
          }
        };
        mediaRecorderRef.current.stop();
      });
      uploadedVideoUrl = result.url;
      videoBase64 = result.base64;
      setIsUploading(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const userData = await getUserProfile(user.uid) || {};
      // Final analysis with video
      const analysis = await analyzePerformance({
        questions,
        metrics: realtimeMetrics,
        responseTime,
        timestamp: new Date().toISOString()
      }, videoBase64);
      setFinalSummary(analysis);

      const sessionId = Date.now().toString();
      const newSession = {
        id: sessionId,
        uid: user.uid,
        timestamp: new Date().toISOString(),
        role: userData?.targetRole || 'Software Engineer',
        questions,
        overallScore: analysis.overallScore,
        metrics: analysis.metrics,
        feedback: analysis.feedback,
        positiveQuote: analysis.positiveQuote,
        videoUrl: uploadedVideoUrl // Local blob URL
      };

      // Save to IndexedDB for persistence
      await saveSession(newSession);
      if (mediaRecorderRef.current && recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await saveVideo(sessionId, blob, user.uid);
      }

      setStatus('completed');
    } catch (err) {
      console.error(err);
      setError('Failed to save session data.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {status === 'idle' && (
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Setup Your Interview</h2>
            <p className="text-slate-400 text-lg">Customize your session to get the most relevant practice.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Difficulty Selection */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="text-indigo-400" size={20} />
                Difficulty Level
              </h3>
              <div className="space-y-3">
                {(['Basic', 'Intermediate', 'Advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setInterviewLevel(level)}
                    className={`w-full px-6 py-4 rounded-2xl font-bold text-left transition-all border-2 ${
                      interviewLevel === level 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                        : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{level}</span>
                      {interviewLevel === level && <CheckCircle size={18} />}
                    </div>
                    <p className="text-xs font-medium mt-1 opacity-60">
                      {level === 'Basic' && 'Foundational concepts and introductions.'}
                      {level === 'Intermediate' && 'Conceptual understanding and practical scenarios.'}
                      {level === 'Advanced' && 'In-depth technical challenges and architecture.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Topics Selection */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <HelpCircle className="text-indigo-400" size={20} />
                Specific Topics
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && topicInput.trim()) {
                        setSelectedTopics([...selectedTopics, topicInput.trim()]);
                        setTopicInput('');
                      }
                    }}
                    placeholder="e.g. React Hooks, SQL"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (topicInput.trim()) {
                        setSelectedTopics([...selectedTopics, topicInput.trim()]);
                        setTopicInput('');
                      }
                    }}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTopics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-sm font-medium flex items-center gap-2">
                      {topic}
                      <button onClick={() => setSelectedTopics(selectedTopics.filter((_, idx) => idx !== i))} className="hover:text-white">×</button>
                    </span>
                  ))}
                  {selectedTopics.length === 0 && <p className="text-slate-500 text-sm italic">No specific topics added. We'll use your profile.</p>}
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={isQuizMode}
                        onChange={(e) => setIsQuizMode(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-all ${isQuizMode ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${isQuizMode ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <span className="text-white font-bold group-hover:text-indigo-400 transition-colors">Enable Quiz Mode</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-2">Multiple choice questions with a 5-second timer.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={startCalibration}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-4 group"
            >
              Start Interview Session
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {status === 'calibrating' && (
        <div className="relative h-[600px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="absolute inset-0">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/80" />
          </div>
          
          <div className="relative h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="max-w-xl w-full">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                <Eye size={14} />
                Precision Calibration
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Eye & Gesture Setup</h2>
              <p className="text-slate-400 mb-12 text-lg">
                Ensure your face is well-lit and centered. Look directly at the dots as they appear to calibrate our tracking system.
              </p>
              
              <div className="relative w-full aspect-video bg-slate-800/30 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Calibration Dots */}
                <AnimatePresence mode="wait">
                  {calibrationStep === 1 && (
                    <motion.button
                      key="dot-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={nextCalibrationStep}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                    >
                      1
                    </motion.button>
                  )}
                  {calibrationStep === 2 && (
                    <motion.button
                      key="dot-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={nextCalibrationStep}
                      className="absolute top-8 left-8 w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                    >
                      2
                    </motion.button>
                  )}
                  {calibrationStep === 3 && (
                    <motion.button
                      key="dot-3"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={nextCalibrationStep}
                      className="absolute top-8 right-8 w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                    >
                      3
                    </motion.button>
                  )}
                  {calibrationStep === 4 && (
                    <motion.button
                      key="dot-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={nextCalibrationStep}
                      className="absolute bottom-8 left-8 w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                    >
                      4
                    </motion.button>
                  )}
                  {calibrationStep === 5 && (
                    <motion.button
                      key="dot-5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={nextCalibrationStep}
                      className="absolute bottom-8 right-8 w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                    >
                      5
                    </motion.button>
                  )}
                  {calibrationStep === 6 && (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-600/20 backdrop-blur-sm"
                    >
                      <CheckCircle className="text-indigo-400 w-16 h-16 mb-4" />
                      <h3 className="text-2xl font-bold text-white">Calibration Complete!</h3>
                      <p className="text-indigo-200">Starting your interview session...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-col items-center gap-6">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div 
                      key={step}
                      className={`h-1.5 w-8 rounded-full transition-colors ${
                        step <= calibrationStep ? 'bg-indigo-500' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={restartCalibration}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Restart Calibration
                  </button>
                  <button 
                    onClick={() => {
                      setStatus('idle');
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                        streamRef.current = null;
                      }
                    }}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(status === 'preparing' || status === 'analyzing') && (
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
          <h3 className="text-2xl font-bold text-white">
            {status === 'preparing' ? 'Preparing your session...' : 'Analyzing your performance...'}
          </h3>
          <p className="text-slate-400 mt-2">
            {status === 'preparing' 
              ? 'Connecting to AI Interviewer' 
              : isUploading 
                ? 'Uploading interview video...' 
                : 'Generating detailed feedback'}
          </p>
        </div>
      )}

      {status === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} width="320" height="240" className="hidden" />
              
              <div className="absolute top-6 left-6 flex flex-col gap-3">
                <div className="px-4 py-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-full flex items-center gap-2 w-fit">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Analysis</span>
                </div>
                <div className="px-4 py-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 rounded-full flex items-center gap-2 w-fit">
                  <Activity size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Level: {interviewLevel}</span>
                </div>
              </div>

              {/* Quiz Mode Overlay */}
              <AnimatePresence>
                {isQuizMode && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-8"
                  >
                    <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-indigo-500/20 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="transparent"
                              className="text-slate-800"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="transparent"
                              strokeDasharray={226}
                              strokeDashoffset={226 - (226 * (quizTimer || 0)) / 5}
                              className="text-indigo-500 transition-all duration-1000"
                            />
                          </svg>
                          <span className="absolute text-2xl font-black text-white">{quizTimer}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-center gap-2">
                        <Timer className="text-indigo-400" />
                        Quick Quiz!
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {quizOptions.map((option, idx) => (
                          <div 
                            key={idx}
                            className="px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold text-lg hover:bg-indigo-600 hover:border-indigo-500 transition-all cursor-pointer"
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div className="space-y-2 max-w-[70%]">
                   <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Current Question</p>
                      <p className="text-white font-semibold line-clamp-2">{questions[currentQuestionIndex] || "Please introduce yourself."}</p>
                   </div>
                </div>
                {responseTime !== null && (
                  <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl flex items-center gap-2">
                    <Activity size={16} className="text-indigo-400" />
                    <span className="text-xs text-slate-400 uppercase font-bold">Response Time:</span>
                    <span className="text-white font-bold">{responseTime.toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button 
                onClick={nextQuestion}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all flex items-center gap-3 shadow-lg shadow-indigo-500/20"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                <Play size={20} />
              </button>
              <button 
                onClick={stopInterview}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center gap-3"
              >
                Stop Interview
                <StopIcon size={20} className="text-red-500" />
              </button>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="text-indigo-400" size={20} />
                Live Performance
              </h3>
              
              <div className="space-y-6">
                {[
                  { label: 'Eye Contact', value: realtimeMetrics.eyeContact, icon: Eye, color: 'text-blue-400' },
                  { label: 'Voice Pitch', value: realtimeMetrics.voice.pitch, icon: Volume2, color: 'text-purple-400' },
                  { label: 'Voice Pace', value: realtimeMetrics.voice.pace, icon: Activity, color: 'text-pink-400' },
                  { label: 'Hand Gestures', value: realtimeMetrics.gestures.hands, icon: Activity, color: 'text-green-400' },
                  { label: 'Head Nods', value: realtimeMetrics.gestures.head, icon: CheckCircle, color: 'text-teal-400' },
                  { label: 'Fillers Used', value: realtimeMetrics.fillers, icon: AlertCircle, color: 'text-orange-400', isCount: true },
                ].map((metric, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-slate-400">
                        <metric.icon size={16} className={metric.color} />
                        <span className="text-sm font-medium">{metric.label}</span>
                      </div>
                      <span className="text-white font-bold">{metric.value}{metric.isCount ? '' : '%'}</span>
                    </div>
                    {!metric.isCount && (
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          className={`h-full rounded-full ${
                            metric.value > 80 ? 'bg-green-500' : metric.value > 50 ? 'bg-indigo-500' : 'bg-orange-500'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tone</p>
                    <p className="text-white font-bold">{realtimeMetrics.voice.tone}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Posture</p>
                    <p className="text-white font-bold">{realtimeMetrics.gestures.posture}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                <AlertCircle size={16} />
                AI Tip
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Try to maintain more consistent eye contact with the camera. It builds trust and shows confidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30"
            >
              <CheckCircle className="text-green-400 w-10 h-10" />
            </motion.div>
            <h2 className="text-4xl font-bold text-white mb-4">Interview Complete!</h2>
            <p className="text-slate-400 text-lg">
              Here's a quick summary of your performance. Detailed analytics are saved to your dashboard.
            </p>
          </div>

          {finalSummary && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center">
                    <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">Overall Score</p>
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                      {finalSummary.overallScore}
                    </div>
                    {finalSummary.positiveQuote && (
                      <p className="mt-4 text-lg text-indigo-200 italic">"{finalSummary.positiveQuote}"</p>
                    )}
                  </div>

                  {videoUrl && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <Video size={18} className="text-indigo-400" />
                          Interview Recording
                        </h3>
                        <a 
                          href={videoUrl} 
                          download={`Interview_${Date.now()}.webm`}
                          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors"
                        >
                          <Download size={16} />
                          Download Video
                        </a>
                      </div>
                      <video src={videoUrl} controls className="w-full aspect-video bg-black" />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                      <FileText size={18} className="text-indigo-400" />
                      Download Reports
                    </h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => generatePDFReport({ ...finalSummary, id: Date.now().toString(), timestamp: new Date().toISOString() }, user)}
                        className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3"
                      >
                        <FileText size={18} />
                        Download PDF
                      </button>
                      <button 
                        onClick={() => generateExcelReport({ ...finalSummary, id: Date.now().toString(), timestamp: new Date().toISOString() }, user)}
                        className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 border border-slate-700"
                      >
                        <Table size={18} />
                        Download Excel
                      </button>
                    </div>
                  </div>

                  <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6">
                    <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                      <HelpCircle size={16} />
                      Next Steps
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Review your fumbling and stuttering feedback to improve your delivery. Practice the STAR method for technical questions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Volume2 className="text-purple-400" />
                    <h3 className="text-lg font-bold text-white">Voice & Delivery</h3>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {finalSummary.feedback?.voice || "Good vocal projection and pace. Try to minimize filler words."}
                  </p>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="text-green-400" />
                    <h3 className="text-lg font-bold text-white">Body Language</h3>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {finalSummary.feedback?.gestures || "Maintained good eye contact. Use more deliberate hand gestures."}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Content & Answers</h3>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {finalSummary.feedback?.content || "Strong technical answers. Structure responses using the STAR method."}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="text-orange-400" />
                    <h3 className="text-lg font-bold text-white">Fluency</h3>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {finalSummary.feedback?.stutteringAndFumbling || "Good fluency. Keep practicing to reduce minor fumbles and stuttering."}
                  </p>
                </div>
              </div>

              <div className="flex justify-center mt-12">
                <button 
                  onClick={onComplete}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  View Full Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
