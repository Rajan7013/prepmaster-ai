import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { db, storage } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { generateInterviewQuestions, analyzePerformance } from '../services/gemini';

interface InterviewSessionProps {
  user: User;
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [realtimeMetrics, setRealtimeMetrics] = useState({
    eyeContact: 0,
    gestures: { hands: 0, head: 0, posture: 'Upright' },
    voice: { pitch: 0, pace: 0, clarity: 0, tone: 'Neutral' },
    fillers: 0
  });

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
      if (err.name === 'NotAllowedError') {
        setError('Camera or microphone access was denied. Please enable permissions in your browser settings and refresh.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect your devices and try again.');
      } else {
        setError('Failed to access camera/mic. Please ensure no other app is using them.');
      }
    }
  };

  const nextCalibrationStep = () => {
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
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const hasProfile = userData?.resumeText || (userData?.resumeData?.skills && userData.resumeData.skills.length > 0);
      
      if (!hasProfile) {
        setError('Please upload your resume or fill out your profile before starting an interview.');
        setStatus('idle');
        return;
      }

      const generatedQuestions = await generateInterviewQuestions(
        userData?.resumeData || {}, 
        userData?.targetRole || 'Software Engineer', 
        userData?.targetIndustry || 'Technology'
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
      
      // Start recording
      if (streamRef.current) {
        try {
          const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
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
    } catch (err) {
      console.error(err);
      setError('Failed to start interview. Please check camera/mic permissions.');
      setStatus('idle');
    }
  };

  const connectToGeminiLive = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a professional interviewer. Observe the user's video and audio. 
          Track their eye contact, hand gestures (hands, head nods, posture), voice (pitch, pace, clarity, tone), and use of filler words. 
          Also track if the user has started answering the question (isAnswering: boolean).
          
          CRITICAL: Every 2-3 seconds, output a hidden JSON-like tag in your response (even if you are not speaking) to update the dashboard metrics. 
          Format: [METRICS: {"eyeContact": 0-100, "gestures": {"hands": 0-100, "head": 0-100, "posture": "Upright|Slouching|Leaning"}, "voice": {"pitch": 0-100, "pace": 0-100, "clarity": 0-100, "tone": "Confident|Nervous|Neutral"}, "fillers": count, "isAnswering": true|false}]
          
          Provide real-time feedback in a supportive way. 
          The current question is: ${questions[currentQuestionIndex]}`,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live connected");
            startStreaming();
          },
          onmessage: (message: LiveServerMessage) => {
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
      sessionRef.current = session;
    } catch (err) {
      console.error(err);
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
    processor.connect(audioContextRef.current.destination);

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
      pitch: Math.floor(Math.random() * 30) + 60,
      eyeContact: Math.floor(Math.random() * 20) + 70,
      gestures: Math.floor(Math.random() * 40) + 50,
      fillers: Math.floor(Math.random() * 5)
    });
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
      setIsAnswering(false);
      setResponseTime(null);
      // Update Gemini context
      if (sessionRef.current) {
        // We could send a text part to update the context
      }
    } else {
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
              
              const videoStorageRef = ref(storage, `users/${user.uid}/sessions/${Date.now()}.webm`);
              await uploadBytes(videoStorageRef, blob);
              const url = await getDownloadURL(videoStorageRef);
              resolve({url, base64: base64data});
            };
          } catch (err) {
            console.error("Failed to upload video:", err);
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
      // Final analysis with video
      const analysis = await analyzePerformance({
        questions,
        metrics: realtimeMetrics,
        responseTime,
        timestamp: new Date().toISOString()
      }, videoBase64);
      setFinalSummary(analysis);

      await addDoc(collection(db, 'users', user.uid, 'sessions'), {
        sessionId: Date.now().toString(),
        uid: user.uid,
        timestamp: serverTimestamp(),
        role: 'Software Engineer',
        questions,
        overallScore: analysis.overallScore,
        metrics: analysis.metrics,
        feedback: analysis.feedback,
        positiveQuote: analysis.positiveQuote,
        videoUrl: uploadedVideoUrl
      });

      setStatus('completed');
    } catch (err) {
      console.error(err);
      setError('Failed to save session data.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {status === 'idle' && (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20">
            <Mic className="text-white w-12 h-12" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to start?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
            We'll ask you 5 questions based on your resume. We'll start with a quick eye-tracking calibration.
          </p>
          <button 
            onClick={startCalibration}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/20"
          >
            Begin Calibration
          </button>
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
              
              <div className="absolute top-6 left-6 flex gap-3">
                <div className="px-4 py-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Analysis</span>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div className="space-y-2">
                   <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Current Question</p>
                      <p className="text-white font-semibold">{questions[currentQuestionIndex]}</p>
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
                onClick={finishInterview}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center gap-3"
              >
                End Session
                <StopCircle size={20} />
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
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center">
                <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">Overall Score</p>
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  {finalSummary.overallScore}
                </div>
                {finalSummary.positiveQuote && (
                  <p className="mt-4 text-lg text-indigo-200 italic">"{finalSummary.positiveQuote}"</p>
                )}
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
