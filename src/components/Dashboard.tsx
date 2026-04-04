import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  ChevronRight, 
  Star, 
  Clock, 
  FileSpreadsheet, 
  FileText as FilePdf,
  Search,
  Filter,
  Video,
  Activity,
  Mic2,
  BookOpen,
  FileText,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { getSessions, getVideo, deleteSession } from '../services/storage';
import { generatePDFReport, generateExcelReport } from '../services/reports';

interface DashboardProps {
  user: any;
  userProfile?: any;
  setActiveTab: (tab: string) => void;
  showPerformanceOnly?: boolean;
}

export default function Dashboard({ user, userProfile, setActiveTab, showPerformanceOnly }: DashboardProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'interview' | 'practice'>('interview');

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [previewSession, setPreviewSession] = useState<any>(null);
  const [previewType, setPreviewType] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load interview sessions from IndexedDB
        const storedSessions = await getSessions(user.uid);
        
        const sessionData = await Promise.all(storedSessions.map(async (doc: any) => {
          // Try to get video blob if it exists
          let videoUrl = doc.videoUrl;
          if (!videoUrl) {
            const blob = await getVideo(doc.id);
            if (blob) {
              videoUrl = URL.createObjectURL(blob);
            }
          }
          return {
            ...doc,
            videoUrl,
            date: new Date(doc.timestamp).toLocaleDateString() || 'N/A'
          };
        }));
        setSessions(sessionData);

        // Load practice sessions
        const storedPracticeSessions = JSON.parse(localStorage.getItem(`practice_sessions_${user.uid}`) || '[]');
        setPracticeSessions(storedPracticeSessions);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.uid]);

  const handleDeleteSession = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      await deleteSession(id, user.uid);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
    }
  };

  const exportToExcel = async () => {
    if (sessions.length === 0) return;
    const userData = JSON.parse(localStorage.getItem(`userProfile_${user.uid}`) || '{}');
    await generateExcelReport(sessions[0], userData);
  };

  const exportToPDF = async () => {
    if (sessions.length === 0) return;
    const userData = JSON.parse(localStorage.getItem(`userProfile_${user.uid}`) || '{}');
    await generatePDFReport(sessions[0], userData);
  };

  if (loading) return null;

  const lastSession = sessions[0];
  const trendData = [...sessions].reverse().map(s => ({
    name: s.date,
    score: s.overallScore
  }));

  const radarData = lastSession ? [
    { subject: 'Knowledge', A: lastSession.metrics?.subjectKnowledge || 0, fullMark: 100 },
    { subject: 'Voice', A: lastSession.metrics?.voicePitch || 0, fullMark: 100 },
    { subject: 'Vocabulary', A: lastSession.metrics?.vocabulary || 0, fullMark: 100 },
    { subject: 'Gestures', A: lastSession.metrics?.gestures || 0, fullMark: 100 },
    { subject: 'Fluency', A: ((lastSession.metrics?.fumbling || 0) + (lastSession.metrics?.stuttering || 0)) / 2 || 0, fullMark: 100 },
    { subject: 'Eye Contact', A: lastSession.metrics?.eyeMovement || 0, fullMark: 100 },
  ] : [];

  const filteredSessions = sessions.filter(s => 
    s.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.date?.includes(searchTerm)
  );

  if (selectedSession) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedSession(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="rotate-180" size={20} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setPreviewSession(selectedSession);
                setPreviewType('pdf');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <FilePdf size={18} />
              PDF Report
            </button>
            <button 
              onClick={() => {
                setPreviewSession(selectedSession);
                setPreviewType('excel');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700"
            >
              <FileSpreadsheet size={18} className="text-green-400" />
              Excel Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center">
              <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">Overall Score</p>
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                {selectedSession.overallScore}
              </div>
              {selectedSession.positiveQuote && (
                <p className="mt-4 text-lg text-indigo-200 italic">"{selectedSession.positiveQuote}"</p>
              )}
            </div>

            {selectedSession.videoUrl && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Video size={18} className="text-indigo-400" />
                    Interview Recording
                  </h3>
                  <a 
                    href={selectedSession.videoUrl} 
                    download={`Interview_${selectedSession.id}.webm`}
                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors"
                  >
                    <Download size={16} />
                    Download Video
                  </a>
                </div>
                <video src={selectedSession.videoUrl} controls className="w-full aspect-video bg-black" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Star className="text-purple-400" size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Voice & Delivery</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {selectedSession.feedback?.voice || "Good vocal projection and pace. Try to minimize filler words."}
              </p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-green-400" size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Body Language</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {selectedSession.feedback?.gestures || "Maintained good eye contact. Use more deliberate hand gestures."}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <FilePdf className="text-blue-400" size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Content & Answers</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {selectedSession.feedback?.content || "Strong technical answers. Structure responses using the STAR method."}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Activity className="text-orange-400" size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Fluency</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {selectedSession.feedback?.stutteringAndFumbling || "Good fluency. Keep practicing to reduce minor fumbles and stuttering."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {showPerformanceOnly ? 'Performance Analytics' : `Welcome back, ${user.displayName?.split(' ')[0]}!`}
          </h2>
          <p className="text-slate-400">
            {showPerformanceOnly ? 'Deep dive into your interview and practice metrics.' : 'Track your progress and master your interview skills.'}
          </p>
        </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => {
                setPreviewSession(sessions[0]);
                setPreviewType('pdf');
              }}
              disabled={sessions.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FilePdf size={18} />
              Latest PDF
            </button>
            <button 
              onClick={() => {
                setPreviewSession(sessions[0]);
                setPreviewType('excel');
              }}
              disabled={sessions.length === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              <FileSpreadsheet size={18} className="text-green-400" />
              Latest Excel
            </button>
          </div>
      </div>

      {!showPerformanceOnly ? (
        <>
          {/* Dashboard View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Overall Score', value: lastSession?.overallScore || '-', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { label: 'Total Sessions', value: sessions.length, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'Practice Sessions', value: practiceSessions.length, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
              { label: 'Improvement', value: sessions.length > 1 ? '+12%' : '-', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl"
              >
                <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                <h4 className="text-3xl font-bold text-white">{stat.value}</h4>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.button 
              whileHover={{ y: -5 }}
              onClick={() => setActiveTab('interview')}
              className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <Mic2 className="text-white w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Start Interview</h3>
              <p className="text-slate-400 text-sm">Take a full mock interview with AI.</p>
            </motion.button>

            <motion.button 
              whileHover={{ y: -5 }}
              onClick={() => setActiveTab('practice')}
              className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-left hover:border-purple-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <BookOpen className="text-white w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Practice Skills</h3>
              <p className="text-slate-400 text-sm">Improve reading and speech delivery.</p>
            </motion.button>

            <motion.button 
              whileHover={{ y: -5 }}
              onClick={() => setActiveTab('resume')}
              className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-left hover:border-blue-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <FileText className="text-white w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Update Resume</h3>
              <p className="text-slate-400 text-sm">Upload a new resume to tailor questions.</p>
            </motion.button>
          </div>

          {sessions.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Recent Interviews</h3>
                <button 
                  onClick={() => setActiveTab('performance')}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-800">
                    {sessions.slice(0, 3).map((session, index) => (
                      <tr 
                        key={session.sessionId || index} 
                        className="hover:bg-slate-800/30 transition-all cursor-pointer"
                        onClick={() => setSelectedSession(session)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                              <Calendar className="text-indigo-400" size={20} />
                            </div>
                            <span className="text-white font-medium">{session.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{session.role}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{session.overallScore}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Performance Analytics View */
        viewMode === 'interview' ? (
        sessions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
            <div className="w-20 h-20 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="text-indigo-500 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No sessions yet</h3>
            <p className="text-slate-400 mb-8">Start your first interview to see your performance analytics.</p>
            <button 
              onClick={() => {
                const hasProfile = userProfile?.resumeText || (userProfile?.resumeData?.skills && userProfile.resumeData.skills.length > 0);
                setActiveTab(hasProfile ? 'interview' : 'resume');
              }}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
            >
              Get Started
            </button>
          </div>
        ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Overall Score', value: lastSession.overallScore, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { label: 'Total Sessions', value: sessions.length, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'Avg. Response Time', value: '2.4s', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
              { label: 'Improvement', value: '+12%', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl"
              >
                <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                <h4 className="text-3xl font-bold text-white">{stat.value}</h4>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-8">Performance Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-8">Last Session Breakdown</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={12} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={10} />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-xl font-bold text-white">Interview History</h3>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <button className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all">
                  <Filter size={20} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredSessions.map((session, index) => (
                    <tr 
                      key={session.sessionId || index} 
                      className="hover:bg-slate-800/30 transition-all cursor-pointer"
                      onClick={() => setSelectedSession(session)}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                            <Calendar className="text-indigo-400" size={20} />
                          </div>
                          <span className="text-white font-medium">{session.date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-300 font-medium">{session.role}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${session.overallScore}%` }}
                            />
                          </div>
                          <span className="text-white font-bold">{session.overallScore}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">
                          Completed
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right flex justify-end gap-2">
                        {session.videoUrl && (
                          <a 
                            href={session.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all"
                            title="Watch Recording"
                          >
                            <Video size={20} />
                          </a>
                        )}
                        <button className="p-2 text-slate-500 hover:text-white transition-all">
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
        )
      ) : (
        practiceSessions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
            <div className="w-20 h-20 bg-purple-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Activity className="text-purple-500 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No practice sessions yet</h3>
            <p className="text-slate-400 mb-8">Start practicing your communication skills to see your history here.</p>
            <button 
              onClick={() => setActiveTab('practice')}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all"
            >
              Start Practice
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-xl font-bold text-white">Practice History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mode</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Topic</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Score</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {practiceSessions.map((session, index) => (
                    <tr key={session.sessionId || index} className="hover:bg-slate-800/30 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-600/10 rounded-lg flex items-center justify-center">
                            <Calendar className="text-purple-400" size={20} />
                          </div>
                          <span className="text-white font-medium">{session.date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                          session.mode === 'reading' 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {session.mode}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-slate-300 font-medium max-w-xs truncate" title={session.topic}>
                        {session.topic}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full" 
                              style={{ width: `${session.overallScore}%` }}
                            />
                          </div>
                          <span className="text-white font-bold">{session.overallScore}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-400 text-sm max-w-md truncate" title={session.feedback}>
                        {session.feedback}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ))}
      {/* Report Preview Modal */}
      <AnimatePresence>
        {previewSession && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-indigo-600/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                    {previewType === 'pdf' ? <FilePdf className="text-white" /> : <FileSpreadsheet className="text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Report Preview</h3>
                    <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider">
                      Confirm your {previewType?.toUpperCase()} download
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setPreviewSession(null);
                    setPreviewType(null);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
                >
                  <RefreshCw size={20} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Logo & Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-6">
                  <div>
                    <h4 className="text-2xl font-black text-white tracking-tighter">PREPMASTER AI</h4>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Performance Report</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">ID: {previewSession.id}</p>
                    <p className="text-slate-500 text-xs">{new Date(previewSession.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Candidate</p>
                    <p className="text-white font-semibold">{userProfile?.displayName || user.displayName || 'User'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Target Role</p>
                    <p className="text-white font-semibold">{previewSession.role || userProfile?.targetRole || 'Software Engineer'}</p>
                  </div>
                </div>

                {/* Score Summary */}
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 text-center">
                  <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">Overall Performance Score</p>
                  <div className="text-5xl font-black text-white">{previewSession.overallScore}</div>
                  <div className="mt-4 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={16} 
                        className={star <= Math.round(previewSession.overallScore / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'} 
                      />
                    ))}
                  </div>
                </div>

                {/* Metrics Preview */}
                <div className="space-y-4">
                  <h5 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-indigo-400" />
                    Key Metrics
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(previewSession.metrics).slice(0, 4).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                        <span className="text-slate-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-white font-bold text-xs">{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback Preview */}
                <div className="space-y-4">
                  <h5 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-indigo-400" />
                    AI Analysis Snippet
                  </h5>
                  <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-800 italic text-slate-400 text-sm leading-relaxed">
                    "{previewSession.feedback.content.substring(0, 150)}..."
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-4">
                <button 
                  onClick={() => {
                    setPreviewSession(null);
                    setPreviewType(null);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (previewType === 'pdf') {
                      generatePDFReport(previewSession, userProfile || user);
                    } else {
                      generateExcelReport(previewSession, userProfile || user);
                    }
                    setPreviewSession(null);
                    setPreviewType(null);
                  }}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Confirm Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
