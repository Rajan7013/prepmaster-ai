import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Code, 
  Save, 
  RefreshCw,
  FileText,
  Plus,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileProps {
  user: any;
  userProfile: any;
  onUpdate: () => void;
  onReupload: () => void;
}

export default function Profile({ user, userProfile, onUpdate, onReupload }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    displayName: user.displayName || '',
    email: user.email || '',
    targetRole: userProfile?.targetRole || '',
    targetIndustry: userProfile?.targetIndustry || '',
    skills: userProfile?.resumeData?.skills || [],
    degree: userProfile?.resumeData?.degree || [],
    projects: userProfile?.resumeData?.projects || [],
    certificates: userProfile?.resumeData?.certificates || []
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || user.displayName || '',
        email: userProfile.email || user.email || '',
        targetRole: userProfile.targetRole || '',
        targetIndustry: userProfile.targetIndustry || '',
        skills: userProfile.resumeData?.skills || [],
        degree: userProfile.resumeData?.degree || [],
        projects: userProfile.resumeData?.projects || [],
        certificates: userProfile.resumeData?.certificates || []
      });
    }
  }, [userProfile, user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedProfile = {
        ...userProfile,
        displayName: formData.displayName,
        targetRole: formData.targetRole,
        targetIndustry: formData.targetIndustry,
        resumeData: {
          ...userProfile?.resumeData,
          skills: formData.skills,
          degree: formData.degree,
          projects: formData.projects,
          certificates: formData.certificates
        },
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`userProfile_${user.uid}`, JSON.stringify(updatedProfile));
      
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (field: string) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeItem = (field: string, index: number) => {
    const newList = [...formData[field]];
    newList.splice(index, 1);
    setFormData({ ...formData, [field]: newList });
  };

  const updateItem = (field: string, index: number, value: string) => {
    const newList = [...formData[field]];
    newList[index] = value;
    setFormData({ ...formData, [field]: newList });
  };

  const Section = ({ title, icon: Icon, field, items }: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Icon className="text-indigo-400" size={20} />
          {title}
        </h3>
        {isEditing && (
          <button 
            onClick={() => addItem(field)}
            className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg hover:bg-indigo-600/20 transition-all"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item: string, i: number) => (
          <div key={i} className="flex gap-2">
            {isEditing ? (
              <>
                <input 
                  type="text" 
                  value={item}
                  onChange={(e) => updateItem(field, i, e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={() => removeItem(field, i)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <div className="flex-1 bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300">
                {item}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && !isEditing && (
          <p className="text-sm text-slate-500 italic">No information provided.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img 
              src={user.photoURL || ''} 
              alt="" 
              className="w-24 h-24 rounded-3xl border-4 border-slate-800 shadow-2xl" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-950" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">{formData.displayName}</h2>
            <p className="text-slate-400 flex items-center gap-2">
              <Mail size={16} />
              {formData.email}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onReupload}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 border border-slate-700"
          >
            <RefreshCw size={18} />
            Re-upload Resume
          </button>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg ${
              isEditing 
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {isSaving ? <RefreshCw className="animate-spin" size={18} /> : isEditing ? <Save size={18} /> : <UserIcon size={18} />}
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <Briefcase className="text-indigo-400" size={24} />
              Career Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Role</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-lg font-semibold text-white">{formData.targetRole || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Industry</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.targetIndustry}
                    onChange={(e) => setFormData({ ...formData, targetIndustry: e.target.value })}
                    placeholder="e.g. Fintech, Healthcare"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-lg font-semibold text-white">{formData.targetIndustry || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section title="Education" icon={GraduationCap} field="degree" items={formData.degree} />
            <Section title="Skills" icon={Code} field="skills" items={formData.skills} />
          </div>

          <Section title="Key Projects" icon={FileText} field="projects" items={formData.projects} />
          <Section title="Certifications" icon={Award} field="certificates" items={formData.certificates} />
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-indigo-400 mb-4">Resume Status</h3>
            {userProfile?.resumeText ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle size={20} />
                  <span className="font-semibold">Resume Uploaded</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Your resume has been parsed and used to tailor your interview experience. You can re-upload anytime to update your profile.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-orange-400">
                  <AlertCircle size={20} />
                  <span className="font-semibold">Missing Resume</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Please upload your resume to unlock personalized interview questions and profile auto-fill.
                </p>
                <button 
                  onClick={onReupload}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                >
                  Upload Now
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-6">Profile Completion</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Overall Progress</span>
                <span className="text-white font-bold">75%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-3/4 rounded-full" />
              </div>
              <ul className="space-y-3 pt-4">
                {[
                  { label: 'Resume Uploaded', done: !!userProfile?.resumeText },
                  { label: 'Target Role Set', done: !!formData.targetRole },
                  { label: 'Skills Added', done: formData.skills.length > 0 },
                  { label: 'Education Details', done: formData.degree.length > 0 },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle size={16} className={item.done ? 'text-green-500' : 'text-slate-700'} />
                    <span className={item.done ? 'text-slate-300' : 'text-slate-500'}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AlertCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
