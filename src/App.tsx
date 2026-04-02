import React, { useState, useEffect } from 'react';
import { auth, db, signIn, signOut, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Mic2, 
  FileText, 
  TrendingUp, 
  LogOut, 
  User as UserIcon,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import ResumeUpload from './components/ResumeUpload';
import InterviewSession from './components/InterviewSession';
import Practice from './components/Practice';
import Profile from './components/Profile';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-indigo-500/20 shadow-lg">
            <Mic2 className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PrepMaster AI</h1>
          <p className="text-slate-400 mb-8">Master your interviews with real-time AI feedback on your voice, gestures, and content.</p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-3"
          >
            <UserIcon size={20} />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'resume', label: 'Resume', icon: FileText },
    { id: 'interview', label: 'Interview', icon: Mic2 },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-500/20 shadow-lg">
            <Mic2 className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-white">PrepMaster</span>
        </div>
        <button onClick={signOut} className="text-slate-400 hover:text-red-400 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-500/20 shadow-lg">
            <Mic2 className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white">PrepMaster</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <tab.icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 mb-4">
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard user={user} userProfile={userProfile} setActiveTab={setActiveTab} />}
            {activeTab === 'profile' && <Profile user={user} userProfile={userProfile} onUpdate={() => fetchProfile(user.uid)} onReupload={() => setActiveTab('resume')} />}
            {activeTab === 'resume' && <ResumeUpload user={user} onComplete={() => { fetchProfile(user.uid); setActiveTab('profile'); }} />}
            {activeTab === 'interview' && <InterviewSession user={user} onComplete={() => setActiveTab('performance')} />}
            {activeTab === 'practice' && <Practice user={user} />}
            {activeTab === 'performance' && <Dashboard user={user} userProfile={userProfile} setActiveTab={setActiveTab} showPerformanceOnly />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-50 pb-safe">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
              activeTab === tab.id 
                ? 'text-indigo-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-medium mt-1">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
