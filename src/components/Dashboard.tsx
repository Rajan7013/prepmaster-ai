import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
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
  Video
} from 'lucide-react';
import { motion } from 'motion/react';
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
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface DashboardProps {
  user: User;
  userProfile?: any;
  setActiveTab: (tab: string) => void;
  showPerformanceOnly?: boolean;
}

export default function Dashboard({ user, userProfile, setActiveTab, showPerformanceOnly }: DashboardProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'sessions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp?.toDate().toLocaleDateString() || 'N/A'
      }));
      setSessions(sessionData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user.uid]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Interview Performance');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Overall Score', key: 'overallScore', width: 15 },
      { header: 'Subject Knowledge', key: 'subjectKnowledge', width: 20 },
      { header: 'Vocabulary', key: 'vocabulary', width: 15 },
      { header: 'Communication', key: 'communication', width: 20 },
      { header: 'Fumbling', key: 'fumbling', width: 15 },
      { header: 'Stuttering', key: 'stuttering', width: 15 },
    ];

    sessions.forEach(session => {
      worksheet.addRow({
        date: session.date,
        role: session.role,
        overallScore: session.overallScore,
        ...session.metrics
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PrepMaster_Report_${user.displayName}.xlsx`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.text('Interview Performance Report', 14, 15);
    doc.autoTable({
      head: [['Date', 'Role', 'Score', 'Feedback']],
      body: sessions.map(s => [s.date, s.role, s.overallScore, s.feedback?.substring(0, 50) + '...']),
      startY: 20,
    });
    doc.save(`PrepMaster_Report_${user.displayName}.pdf`);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {showPerformanceOnly ? 'Performance Analytics' : `Welcome back, ${user.displayName?.split(' ')[0]}!`}
          </h2>
          <p className="text-slate-400">Track your progress and master your interview skills.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700"
          >
            <FileSpreadsheet size={18} className="text-green-400" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700"
          >
            <FilePdf size={18} className="text-red-400" />
            PDF
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
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
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-800/30 transition-all">
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
      )}
    </div>
  );
}
