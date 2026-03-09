import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Link2, BookOpen, Shield, Code, Cpu, Compass, Search, Loader2, Play, CheckCircle } from 'lucide-react';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";

const defaultPaths = [
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    desc: 'Learn problem solving and algorithms used in technical interviews.',
    skills: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming'],
    resources: [
      { name: 'leetcode.com', url: 'https://leetcode.com' },
      { name: 'www.geeksforgeeks.org', url: 'https://www.geeksforgeeks.org' }
    ]
  },
  {
    id: 'cyber',
    title: 'Cyber Security',
    desc: 'Learn how to protect systems and perform penetration testing.',
    skills: ['Network Fundamentals', 'Cryptography', 'Penetration Testing'],
    resources: [
      { name: 'tryhackme.com', url: 'https://tryhackme.com' },
      { name: 'hackthebox.com', url: 'https://hackthebox.com' }
    ]
  }
];

const CareerView = ({ username }) => {
  const [paths, setPaths] = useState(defaultPaths);
  const [activePathId, setActivePathId] = useState('dsa');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [enrolledTopics, setEnrolledTopics] = useState([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  useEffect(() => {
    // Load saved career paths from backend
    const loadPaths = async () => {
      try {
        const res = await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'career_paths' })
        });
        const data = await res.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setPaths(data.data);
          setActivePathId(data.data[0].id);
        }
      } catch (e) {
        console.error("Failed to load paths", e);
      }
    };
    
    const fetchEnrolled = async () => {
      try {
        const res = await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'learning_progress_topics' })
        });
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setEnrolledTopics(data.data.map(t => t.name));
        }
      } catch (e) {
        console.error("Failed to load enrolled topics", e);
      }
    };
    
    loadPaths();
    fetchEnrolled();
  }, [username]);

  const savePaths = async (newPaths) => {
    try {
      await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_USER_DATA', username, data_type: 'career_paths', payload: newPaths })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_CAREER_ROADMAP', username, topic: searchQuery })
      });
      const data = await response.json();
      
      if (data.data && data.data.id) {
        const newPath = data.data;
        const updatedPaths = [...paths, newPath];
        setPaths(updatedPaths);
        setActivePathId(newPath.id);
        savePaths(updatedPaths);
        setSearchQuery('');
      }
    } catch (error) {
      console.error("Error generating roadmap:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartCourse = async (path) => {
    setIsEnrolling(true);
    try {
        const res = await fetch(LAMBDA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'learning_progress_topics' })
        });
        const data = await res.json();
        let currentTopics = (data.data && Array.isArray(data.data)) ? data.data : [];
        
        let topicsToAdd = path.modules && path.modules.length > 0 ? path.modules : [path.title];
        let newAdded = false;
        
        topicsToAdd.forEach(topicStr => {
           if (!currentTopics.find(t => t.name === topicStr)) {
               currentTopics.unshift({
                   id: Date.now().toString() + Math.random().toString().substring(2,6),
                   name: topicStr,
                   completed: false,
                   dateAdded: new Date().toLocaleDateString()
               });
               newAdded = true;
           }
        });
        
        if (newAdded) {
            await fetch(LAMBDA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'SAVE_USER_DATA', 
                    username, 
                    data_type: 'learning_progress_topics', 
                    payload: currentTopics 
                })
            });
            setEnrolledTopics(prev => [...prev, ...topicsToAdd]);
        }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnrolling(false);
    }
  };

  const activePath = paths.find(p => p.id === activePathId) || paths[0];
  const isEnrolled = activePath ? (activePath.modules && activePath.modules.length > 0 ? activePath.modules.some(mod => enrolledTopics.includes(mod)) : enrolledTopics.includes(activePath.title)) : false;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        padding: 'clamp(4rem,8vw,5rem) clamp(1rem,4vw,3rem) 2rem clamp(1rem,4vw,3rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        height: '100%',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .career-split {
            flex-direction: column !important;
          }
          .career-sidebar {
            flex: none !important;
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid var(--engine-border) !important;
            max-height: 200px !important;
            padding: 1rem !important;
          }
          .career-sidebar h3 {
            display: none !important;
          }
          .career-sidebar-list {
            flex-direction: row !important;
            overflow-x: auto !important;
            padding-bottom: 0.5rem !important;
            scroll-snap-type: x mandatory !important;
          }
          .career-sidebar-item {
            min-width: 260px !important;
            scroll-snap-align: start !important;
          }
        }
      `}</style>
      <div className="career-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--engine-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'clamp(1.4rem,4vw,2rem)', whiteSpace: 'nowrap' }}>
          <Compass size={24} color="var(--engine-accent)" /> Career Roadmaps
        </h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
          <div style={{
            flex: 1,
            backgroundColor: 'var(--engine-panel-bg)',
            border: '1px solid var(--engine-border)',
            borderRadius: '99px',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Search size={16} color="var(--engine-text-muted)" />
            <input 
              type="text" 
              placeholder="Generate roadmap for a topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--engine-text-main)',
                width: '100%',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <button 
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            style={{
              backgroundColor: isSearching ? 'var(--engine-border)' : 'var(--engine-accent)',
              border: 'none',
              borderRadius: '99px',
              color: '#fff',
              padding: '0 1.2rem',
              fontWeight: 600,
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isSearching ? <Loader2 size={16} className="spin" /> : 'Create'}
          </button>
        </form>
      </div>

      <div className="career-split" style={{
          flex: 1,
          backgroundColor: 'var(--engine-panel-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--engine-border)',
          display: 'flex',
          overflow: 'hidden',
          minHeight: '400px'
      }}>
        
        {/* Sidebar: Explore Paths */}
        <div className="career-sidebar" style={{
          flex: '0 0 300px',
          borderRight: '1px solid var(--engine-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          maxHeight: '100%'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--engine-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>Your Roadmaps</h3>
          
          <div className="career-sidebar-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {paths.map(path => (
              <div 
                key={path.id}
                className="career-sidebar-item"
                onClick={() => setActivePathId(path.id)}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  backgroundColor: activePathId === path.id ? 'color-mix(in srgb, var(--engine-accent) 15%, transparent)' : 'transparent',
                  border: activePathId === path.id ? '1px solid var(--engine-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <h4 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1rem', fontWeight: 600 }}>{path.title}</h4>
                <p style={{ margin: 0, color: 'var(--engine-text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>{path.desc.substring(0, 60)}...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: '1 1 500px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <AnimatePresence mode="wait">
            {activePath && (
              <motion.div
                key={activePath.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {activePath.title}
                  </h2>
                  <button 
                    onClick={() => handleStartCourse(activePath)}
                    disabled={isEnrolling || isEnrolled}
                    style={{
                      backgroundColor: isEnrolled ? '#22c55e' : 'var(--engine-accent)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      cursor: (isEnrolling || isEnrolled) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                      {isEnrolling ? <Loader2 size={16} className="spin" /> : (isEnrolled ? <CheckCircle size={16} /> : <Play size={16} fill="currentColor" />)}
                      {isEnrolled ? 'Course Details Sent to Progress' : 'Start Course'}
                  </button>
                </div>
                <p style={{ margin: '0 0 2rem 0', color: 'var(--engine-text-muted)', fontSize: '1rem' }}>
                  {activePath.desc}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Required Skills */}
                  <div style={{
                    backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 10%, transparent)',
                    border: '1px solid var(--engine-border)',
                    borderRadius: '16px',
                    padding: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--engine-accent)' }}>
                      <Activity size={18} />
                      <h3 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>Required Skills</h3>
                    </div>
                    <ul style={{ margin: 0, padding: '0 0 0 1.25rem', color: 'var(--engine-text-muted)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                      {activePath.skills && activePath.skills.map((skill, idx) => (
                        <li key={idx} style={{ paddingLeft: '0.5rem' }}>{skill}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Learning Resources */}
                  <div style={{
                    backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 10%, transparent)',
                    border: '1px solid var(--engine-border)',
                    borderRadius: '16px',
                    padding: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--engine-accent)' }}>
                      <Link2 size={18} />
                      <h3 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>Learning Resources</h3>
                    </div>
                    <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                      {activePath.resources && activePath.resources.map((res, idx) => (
                        <li key={idx} style={{ paddingLeft: '0.5rem', color: 'var(--engine-text-muted)' }}>
                          <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--engine-accent)', textDecoration: 'none' }}>{res.name}</a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Course Modules */}
                  {activePath.modules && activePath.modules.length > 0 && (
                      <div style={{
                        backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 10%, transparent)',
                        border: '1px solid var(--engine-border)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        gridColumn: '1 / -1' // Span full width
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--engine-accent)' }}>
                          <BookOpen size={18} />
                          <h3 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>Course Modules</h3>
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 1.25rem', color: 'var(--engine-text-muted)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                          {activePath.modules.map((mod, idx) => (
                            <li key={idx} style={{ paddingLeft: '0.5rem' }}>{mod}</li>
                          ))}
                        </ul>
                      </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default CareerView;
