import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, PlaySquare, Calendar, CheckSquare, Maximize2, FileText, ChevronDown, Sparkles, User, BrainCircuit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";

const MOCK_DATA = {
  courses: [
    { id: 1, title: 'Speak with Confidence', desc: 'Learn how to communicate clearly and confidently under pressure.', date: '27 Apr 2025', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)' },
    { id: 2, title: 'Master the Basics', desc: 'Build a strong foundation in core engineering principles.', date: '30 Apr 2025', bg: 'rgba(14, 165, 233, 0.1)', border: 'rgba(14, 165, 233, 0.2)' },
    { id: 3, title: 'Sound Like a Native', desc: 'Perfect your technical communication and natural phrasing.', date: '15 May 2025', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' }
  ],
  chartData: [
    { name: 'Sun', theory: 20, practice: 30, lexicon: 25 },
    { name: 'Mon', theory: 40, practice: 45, lexicon: 35 },
    { name: 'Tue', theory: 60, practice: 70, lexicon: 50 },
    { name: 'Wed', theory: 55, practice: 60, lexicon: 65 },
    { name: 'Thu', theory: 85, practice: 95, lexicon: 80 },
    { name: 'Fri', theory: 90, practice: 85, lexicon: 95 },
    { name: 'Sat', theory: 70, practice: 65, lexicon: 75 },
  ],
  homework: [
    { id: 1, title: 'Learn 10 new concepts today', progress: 57, color: '#3b82f6', icon: 'file' },
    { id: 2, title: 'Do 1 system design task', progress: 42, color: '#06b6d4', icon: 'check' },
    { id: 3, title: 'Watch a video, take notes', progress: 31, color: '#10b981', icon: 'play' },
    { id: 4, title: 'Write 3 architecture drafts', progress: 84, color: '#8b5cf6', icon: 'file' }
  ],
  friends: [
    { id: 1, name: 'Anna Morgan', score: '10,568', hours: 832, tasks: 48, avatar: 'https://i.pravatar.cc/150?u=11' },
    { id: 2, name: 'Jake Thompson', score: '10,234', hours: 778, tasks: 39, avatar: 'https://i.pravatar.cc/150?u=12' },
    { id: 3, name: 'Sofia Bennett', score: '9,892', hours: 742, tasks: 33, avatar: 'https://i.pravatar.cc/150?u=13' },
    { id: 4, name: 'Emily Carter', score: '9,322', hours: 643, tasks: 28, avatar: 'https://i.pravatar.cc/150?u=14' }
  ]
};

const ProgressView = ({ username }) => {
  const [data, setData] = useState(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, [username]);

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'progress_dash' })
      });
      const res = await response.json();
      
      let currentData = MOCK_DATA;
      if (res.data && res.data.courses) {
        currentData = res.data;
        setData(res.data);
      } else {
        // Seed default
        await fetch(LAMBDA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SAVE_USER_DATA', username, data_type: 'progress_dash', payload: MOCK_DATA })
        });
      }

      // Automatically trigger AI analysis
      triggerAIAnalysis(currentData);

    } catch (e) {
      console.error(e);
      triggerAIAnalysis(MOCK_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAIAnalysis = async (currentData) => {
    setIsAiLoading(true);
    try {
      const payloadString = `Courses: ${currentData.courses.length}, Homework Avg Completion: ${Math.round(currentData.homework.reduce((acc, curr) => acc + curr.progress, 0) / currentData.homework.length)}%`;
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ANALYZE_DATA', data_type: 'progress', payload: payloadString })
      });
      const res = await response.json();
      if (res.data && res.data.content) {
        setAiAnalysis(res.data.content);
      }
    } catch (e) {
      console.error(e);
      setAiAnalysis("Excellent work maintaining a consistent schedule this week! Focus heavily on 'System Design' for your next milestone.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--engine-panel-bg)', border: '1px solid var(--engine-border)', padding: '0.75rem', borderRadius: '12px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--engine-text-main)', marginBottom: '0.5rem' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--engine-text-muted)', marginBottom: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
              <span style={{ textTransform: 'capitalize' }}>{entry.name}:</span>
              <span style={{ fontWeight: 'bold' }}>{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--engine-text-muted)' }}>
        <Loader2 size={32} className="spin" />
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        flex: 1,
        padding: '6rem 2.5rem 2rem 2.5rem',
        display: 'flex',
        gap: '2rem',
        height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {/* LEFT SIDEBAR - Select a Course */}
      <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--engine-text-main)', fontWeight: 600 }}>Select a course</h2>
            <p style={{ color: 'var(--engine-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Start learning today.</p>
          </div>
          <button style={{ background: 'var(--engine-panel-bg)', border: '1px solid var(--engine-border)', padding: '0.5rem', borderRadius: '50%', color: 'var(--engine-text-main)', cursor: 'pointer' }}>
            <Maximize2 size={16} />
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--engine-text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search courses..." 
            style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.75rem', borderRadius: '99px', border: '1px solid var(--engine-border)', backgroundColor: 'var(--engine-panel-bg)', color: 'var(--engine-text-main)', fontSize: '0.9rem', outline: 'none' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.courses.map((course) => (
            <motion.div 
              key={course.id}
              whileHover={{ scale: 1.02 }}
              style={{
                backgroundColor: course.bg,
                border: `1px solid ${course.border}`,
                borderRadius: '24px',
                padding: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--engine-text-main)', fontWeight: 600 }}>{course.title}</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--engine-text-muted)', lineHeight: 1.4 }}>{course.desc}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.4rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 500, color: 'var(--engine-text-main)' }}>
                  <Calendar size={14} /> {course.date}
                </div>
                <div style={{ display: 'flex' }}>
                   <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fca5a5', border: '2px solid var(--engine-bg-color)', zIndex: 2 }}></div>
                   <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#93c5fd', border: '2px solid var(--engine-bg-color)', marginLeft: '-10px', zIndex: 1 }}></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
        
        {/* ROW 1: PERFORMANCE CHART */}
        <div style={{ backgroundColor: 'var(--engine-panel-bg)', border: '1px solid var(--engine-border)', borderRadius: '24px', padding: '1.5rem', flex: '1 1 auto', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--engine-text-main)', fontWeight: 600 }}>Performance Chart</h2>
              <p style={{ color: 'var(--engine-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 1rem 0' }}>Track results and watch your progress rise.</p>
              
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--engine-text-main)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CircleDot color="#3b82f6" /> Theory</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CircleDot color="#8b5cf6" /> Practice</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CircleDot color="#f43f5e" /> Lexicon</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--engine-border)', padding: '0.5rem 1rem', borderRadius: '99px', color: 'var(--engine-text-main)', fontSize: '0.9rem', cursor: 'pointer' }}>
                Weekly <ChevronDown size={14} />
              </button>
              <button style={{ background: 'transparent', border: '1px solid var(--engine-border)', padding: '0.5rem', borderRadius: '50%', color: 'var(--engine-text-main)', cursor: 'pointer' }}>
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--engine-text-muted)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--engine-text-muted)', fontSize: 12 }} dx={-10} tickFormatter={(val) => `${val}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--engine-border)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Line type="monotone" dataKey="theory" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="practice" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="lexicon" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2: HOMEWORK, FRIENDS SCORE, AI COACH */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', flex: '0 0 auto' }}>
          
          {/* Homework Card */}
          <div style={{ backgroundColor: 'var(--engine-panel-bg)', border: '1px solid var(--engine-border)', borderRadius: '24px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--engine-text-main)', fontWeight: 600 }}>Homework</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--engine-text-muted)' }}>Check and complete tasks</p>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'transparent', border: '1px solid var(--engine-border)', padding: '0.35rem 0.75rem', borderRadius: '99px', color: 'var(--engine-text-main)', fontSize: '0.8rem', cursor: 'pointer' }}>
                Day <ChevronDown size={14} />
              </button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--engine-bg-color)', border: '1px dashed var(--engine-border)', borderRadius: '16px', padding: '2rem', gap: '0.75rem', minHeight: '150px' }}>
              <div style={{ background: 'var(--engine-panel-bg)', padding: '0.75rem', borderRadius: '50%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <Sparkles size={24} color="var(--engine-text-muted)" />
              </div>
              <p style={{ margin: 0, color: 'var(--engine-text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>Upcoming Feature</p>
            </div>
          </div>

          {/* Friends Score Card */}
          <div style={{ backgroundColor: 'var(--engine-panel-bg)', border: '1px solid var(--engine-border)', borderRadius: '24px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--engine-text-main)', fontWeight: 600 }}>Friends Score</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--engine-text-muted)' }}>See how you rank</p>
              </div>
              <button style={{ background: 'transparent', border: '1px solid var(--engine-border)', padding: '0.35rem 0.75rem', borderRadius: '99px', color: 'var(--engine-text-main)', fontSize: '0.8rem', cursor: 'pointer' }}>
                All
              </button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--engine-bg-color)', border: '1px dashed var(--engine-border)', borderRadius: '16px', padding: '2rem', gap: '0.75rem', minHeight: '150px' }}>
              <div style={{ background: 'var(--engine-panel-bg)', padding: '0.75rem', borderRadius: '50%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <Sparkles size={24} color="var(--engine-text-muted)" />
              </div>
              <p style={{ margin: 0, color: 'var(--engine-text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>Upcoming Feature</p>
            </div>
          </div>

          {/* AI Coach Card */}
          <div style={{ backgroundColor: 'var(--engine-panel-bg)', border: '1px solid var(--engine-border)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--engine-accent), #ed8936)', padding: '0.4rem', borderRadius: '12px' }}>
                <BrainCircuit size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--engine-text-main)', fontWeight: 600 }}>AI Coach</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--engine-text-muted)' }}>Powered by AWS Bedrock</p>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--engine-bg-color)', border: '1px dashed var(--engine-border)', borderRadius: '16px', padding: '2rem', gap: '0.75rem', minHeight: '150px' }}>
              <div style={{ background: 'var(--engine-panel-bg)', padding: '0.75rem', borderRadius: '50%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <Sparkles size={24} color="var(--engine-text-muted)" />
              </div>
              <p style={{ margin: 0, color: 'var(--engine-text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>Upcoming Feature</p>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
};

// Helper component for small circles in legend
const CircleDot = ({ color }) => (
  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
);

export default ProgressView;
