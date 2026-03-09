import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Clock, Zap, Search, Plus, CheckCircle, Loader2, Target, Award, Trash2 } from 'lucide-react';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";

const ProgressView = ({ username }) => {
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('in-progress');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [username]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'learning_progress_topics' })
      });
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        setTopics(data.data);
        if (data.data.length > 0) {
          generateRecommendation(data.data);
        }
      }
    } catch (e) {
      console.error("Failed to load progress", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = async (updatedTopics) => {
    try {
      await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_USER_DATA',
          username,
          data_type: 'learning_progress_topics',
          payload: updatedTopics
        })
      });
    } catch (e) {
      console.error("Error saving progress:", e);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    const topicEntry = {
      id: Date.now().toString(),
      name: newTopic,
      completed: false,
      dateAdded: new Date().toLocaleDateString()
    };

    const updatedTopics = [topicEntry, ...topics];
    setTopics(updatedTopics);
    setNewTopic('');

    await saveProgress(updatedTopics);
    generateRecommendation(updatedTopics);
  };

  const toggleTopicComplete = async (id) => {
    const updatedTopics = topics.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTopics(updatedTopics);
    await saveProgress(updatedTopics);
  };

  const deleteTopic = async (id) => {
    const updatedTopics = topics.filter(t => t.id !== id);
    setTopics(updatedTopics);
    await saveProgress(updatedTopics);
    generateRecommendation(updatedTopics);
  };

  const generateRecommendation = async (currentTopics) => {
    if (currentTopics.length === 0) return;
    setIsAnalyzing(true);

    const topicNames = currentTopics.map(t => `${t.name} (${t.completed ? 'Completed' : 'In Progress'})`).join(', ');
    const payload = `User's Topics: ${topicNames}`;

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ANALYZE_DATA',
          username,
          data_type: 'progress',
          payload: payload
        })
      });
      const data = await response.json();
      if (data.data && data.data.content) {
        setRecommendation(data.data.content);
      }
    } catch (e) {
      console.error("Recommendation failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const completedCount = topics.filter(t => t.completed).length;
  const progressRatio = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

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
        overflowY: 'auto'
      }}
    >
      <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--engine-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'clamp(1.2rem,4vw,2rem)', whiteSpace: 'nowrap' }}>
          <TrendingUp size={isMobile ? 20 : 24} color="var(--engine-accent)" /> Learning Progress
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '2rem' }}>

        {/* Top Banner */}
        <div className="progress-banner" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1.5rem' : '2.0rem',
          backgroundColor: 'var(--engine-panel-bg)',
          border: '1px solid var(--engine-border)',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? '1.5rem' : '2rem 3rem',
          boxShadow: isMobile ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          alignItems: isMobile ? 'center' : 'stretch'
        }}>

          {/* Consistency */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--engine-text-main)', fontSize: '1rem', fontWeight: 600 }}>Account Standing</h3>

            <div style={{ display: 'flex', gap: isMobile ? '1.5rem' : '3rem', justifyContent: 'center', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 'bold', color: 'var(--engine-text-main)' }}>{topics.length}</span>
                  <Target size={isMobile ? 24 : 32} color="var(--engine-accent)" />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--engine-text-muted)', letterSpacing: '1px' }}>TOTAL</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 'bold', color: 'var(--engine-text-main)' }}>{completedCount}</span>
                  <Award size={isMobile ? 24 : 32} color="#eab308" />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--engine-text-muted)', letterSpacing: '1px' }}>DONE</span>
              </div>
            </div>
          </div>

          {!isMobile && <div style={{ width: '1px', backgroundColor: 'var(--engine-border)' }} />}

          {/* Progress Distribution */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--engine-text-main)', fontSize: '1rem', fontWeight: 600 }}>Mastery</h3>

            <div style={{
              position: 'relative',
              width: isMobile ? '90px' : '120px',
              height: isMobile ? '90px' : '120px',
              borderRadius: '50%',
              backgroundImage: `conic-gradient(var(--engine-accent) ${progressRatio}%, transparent 0)`,
              backgroundColor: 'var(--engine-panel-bg)',
              border: '1px solid var(--engine-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: isMobile ? '78px' : '104px',
                height: isMobile ? '78px' : '104px',
                borderRadius: '50%',
                backgroundColor: 'var(--engine-panel-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 'bold', color: 'var(--engine-text-main)' }}>{progressRatio}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Grid */}
        <div className="progress-bottom-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'var(--engine-panel-bg)',
            border: '1px solid var(--engine-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            minHeight: '200px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div className="course-tab-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={20} color="var(--engine-accent)" />
                <h3 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>Your Courses</h3>
              </div>
              <div className="course-tab-container-right" style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--engine-bg-color)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--engine-border)' }}>
                <button
                  onClick={() => setActiveTab('in-progress')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'in-progress' ? 'var(--engine-panel-bg)' : 'transparent',
                    color: activeTab === 'in-progress' ? 'var(--engine-text-main)' : 'var(--engine-text-muted)',
                    boxShadow: activeTab === 'in-progress' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'completed' ? 'var(--engine-panel-bg)' : 'transparent',
                    color: activeTab === 'completed' ? 'var(--engine-text-main)' : 'var(--engine-text-muted)',
                    boxShadow: activeTab === 'completed' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Completed
                </button>
              </div>
            </div>

            <form onSubmit={handleAddTopic} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{
                flex: 1,
                backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 10%, transparent)',
                border: '1px solid var(--engine-border)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Search size={16} color="var(--engine-text-muted)" />
                <input
                  type="text"
                  placeholder="Search and add a topic..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
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
                disabled={!newTopic.trim()}
                style={{
                  backgroundColor: 'var(--engine-accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0 1rem',
                  fontWeight: 600,
                  cursor: !newTopic.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: !newTopic.trim() ? 0.5 : 1
                }}
              >
                <Plus size={18} />
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '350px' }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <Loader2 size={24} className="spin" color="var(--engine-text-muted)" />
                </div>
              ) : topics.filter(t => activeTab === 'in-progress' ? !t.completed : t.completed).length === 0 ? (
                <p style={{ color: 'var(--engine-text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>
                  {activeTab === 'in-progress' ? "No courses in progress. Search and add one to get started!" : "No completed courses yet. Keep learning!"}
                </p>
              ) : (
                <AnimatePresence>
                  {topics.filter(t => activeTab === 'in-progress' ? !t.completed : t.completed).map(topic => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 5%, transparent)',
                        border: '1px solid var(--engine-border)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ color: 'var(--engine-text-main)', fontWeight: 500, fontSize: '0.95rem', textDecoration: topic.completed ? 'line-through' : 'none', opacity: topic.completed ? 0.6 : 1 }}>
                          {topic.name}
                        </span>
                        <span style={{ color: 'var(--engine-text-muted)', fontSize: '0.75rem' }}>Added: {topic.dateAdded}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => toggleTopicComplete(topic.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: topic.completed ? '#22c55e' : 'var(--engine-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.4rem',
                            borderRadius: '50%',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title={topic.completed ? "Mark as Incomplete" : "Mark as Completed"}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => deleteTopic(topic.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f43f5e',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.4rem',
                            borderRadius: '50%',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Delete Course"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* AI Recommendation */}
          <div style={{
            backgroundColor: 'var(--engine-panel-bg)',
            border: '1px solid var(--engine-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            minHeight: '200px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <Zap size={20} color="var(--engine-accent)" />
              <h3 style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>AI Roadmap Recommendation</h3>
              {isAnalyzing && <Loader2 size={16} className="spin" color="var(--engine-accent)" style={{ marginLeft: 'auto' }} />}
            </div>

            <div style={{
              backgroundColor: 'color-mix(in srgb, var(--engine-accent) 15%, transparent)',
              border: '1px solid var(--engine-border)',
              borderRadius: '8px',
              padding: '1.5rem',
              flex: 1,
              overflowY: 'auto'
            }}>
              <p style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {recommendation || "Add some topics to your recent activity to get a personalized AI learning roadmap prediction!"}
              </p>
            </div>
          </div>

        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; } 
        @keyframes spin { 100% { transform: rotate(360deg); } }
        /* Slim, matching scrollbar for the right side */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--engine-border); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--engine-text-muted); }
        
        @media (max-width: 768px) {
          .progress-banner {
            padding: 1.5rem 1rem !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .progress-bottom-grid {
            grid-template-columns: 1fr !important;
          }
          .course-tab-container {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
          }
          .course-tab-container-right {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .course-tab-container-right button {
            flex: 1 !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default ProgressView;
