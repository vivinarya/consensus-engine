import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Loader2, Sparkles, X, Library, Gavel, ArrowLeft, ArrowRight, RotateCcw, StickyNote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";

const FlashcardUI = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // If there's an error parsing the string to JSON, it's caught outside here.
  let cards = [];
  try {
    cards = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    return <div>Error loading flashcards. Please try generating them again.</div>;
  }

  if (!cards || cards.length === 0) return <div>No flashcards generated.</div>;

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => Math.min(prev + 1, cards.length - 1)), 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), 150);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '1rem', width: '100%' }}>
      
      <div style={{ fontWeight: '600', color: 'var(--engine-text-muted)', marginBottom: '1rem' }}>
        Card {currentIndex + 1} of {cards.length}
      </div>

      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          width: '100%',
          maxWidth: '320px',
          height: '250px',
          perspective: '1000px',
          cursor: 'pointer',
          marginBottom: '2rem'
        }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundColor: 'var(--engine-panel-bg)',
            border: '2px solid var(--engine-border)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--engine-text-main)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--engine-accent)', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Question</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.5' }}>{currentCard?.q}</div>
            </div>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundColor: 'var(--engine-accent)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: '#fff',
            transform: 'rotateY(180deg)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Answer</div>
               <div style={{ fontSize: '1rem', fontWeight: '500', lineHeight: '1.5' }}>{currentCard?.a}</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '320px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={prevCard} 
          disabled={currentIndex === 0}
          style={{ background: 'var(--engine-border)', color: 'var(--engine-text-main)', border: 'none', padding: '0.75rem', borderRadius: '50%', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.3 : 1 }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <button 
          onClick={() => setIsFlipped(!isFlipped)} 
          style={{ background: 'transparent', color: 'var(--engine-text-muted)', border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}
        >
          <RotateCcw size={16} /> Flip
        </button>

        <button 
          onClick={nextCard} 
          disabled={currentIndex === cards.length - 1}
          style={{ background: 'var(--engine-border)', color: 'var(--engine-text-main)', border: 'none', padding: '0.75rem', borderRadius: '50%', cursor: currentIndex === cards.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIndex === cards.length - 1 ? 0.3 : 1 }}
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

const NotesView = ({ username }) => {
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('analyze'); // analyze, flashcards
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Consensus / Worker Switch State
  const [responses, setResponses] = useState([]);
  const [activeWorkerIdx, setActiveWorkerIdx] = useState(0);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [username]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'notes' })
      });
      const res = await response.json();
      if (res.data) setNoteContent(res.data.text || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteChange = (e) => {
    const text = e.target.value;
    setNoteContent(text);

    if (saveTimeout) clearTimeout(saveTimeout);
    
    setSaveTimeout(setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SAVE_USER_DATA', username, data_type: 'notes', payload: { text } })
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }, 1000));
  };

  const handleAnalyzeNotes = async (mode) => {
    if (!noteContent.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setResponses([]);
    setActiveWorkerIdx(0);
    setAnalysisMode(mode);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ANALYZE_DATA', username, data_type: 'notes', mode, payload: noteContent })
      });
      const res = await response.json();
      
      if (mode === 'flashcards' && res.data && res.data.status === 'FLASHCARDS_RESULT') {
        setResponses([]); // Flush worker responses for flashcards
        setAnalysisResult(res.data.content || "[]");
      } else if (res.data && res.data.status === 'NOTES_CONCENSUS_RESULT') {
        setResponses(res.data.responses);
        setAnalysisResult(res.data.responses[0].content || "Empty response from AI");
      } else if (res.data) {
        setAnalysisResult(res.data.content || "Empty response from AI");
      }
    } catch (e) {
      console.error(e);
      setAnalysisResult("Error occurred while analyzing.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeepDive = async () => {
    if (responses.length < 2) return;
    setIsDeepDiveLoading(true);
    setActiveWorkerIdx(2); // 2 means Judge
    setAnalysisResult("Consulting the Judge...");
    
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JUDGE_DEEP_DIVE',
          query: `Evaluate the following ${analysisMode === 'flashcards' ? 'flashcards' : 'analysis'} for clarity and factual correctness:`,
          llama_content: responses.find(r => r.model_name.includes('Llama'))?.content || responses[0].content,
          ministral_content: responses.find(r => r.model_name.includes('Ministral'))?.content || responses[1].content
        })
      });
      const data = await response.json();
      if (data && data.data) {
        setAnalysisResult(data.data.content || "Judge has made their ruling.");
      }
    } catch (e) {
      console.error("Deep dive error:", e);
      setAnalysisResult("Network error consulting the judge.");
    } finally {
      setIsDeepDiveLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--engine-text-muted)' }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        padding: '5rem 3rem 2rem 3rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--engine-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StickyNote size={28} color="var(--engine-accent)" /> Notes Hub
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ color: 'var(--engine-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Saved'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleAnalyzeNotes('analyze')}
              disabled={isAnalyzing || !noteContent.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: isAnalyzing ? 'var(--engine-border)' : 'var(--engine-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: (isAnalyzing || !noteContent.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: (!noteContent.trim()) ? 0.5 : 1
              }}
            >
              {isAnalyzing && analysisMode === 'analyze' ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} 
              {isAnalyzing && analysisMode === 'analyze' ? 'Analyzing...' : 'AI Analyze'}
            </button>
            <button 
              onClick={() => handleAnalyzeNotes('flashcards')}
              disabled={isAnalyzing || !noteContent.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: isAnalyzing ? 'var(--engine-border)' : 'transparent',
                color: isAnalyzing ? '#fff' : 'var(--engine-text-main)',
                border: '1px solid var(--engine-border)',
                borderRadius: '8px',
                cursor: (isAnalyzing || !noteContent.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: (!noteContent.trim()) ? 0.5 : 1
              }}
            >
              {isAnalyzing && analysisMode === 'flashcards' ? <Loader2 size={16} className="spin" /> : <Library size={16} />} 
              {isAnalyzing && analysisMode === 'flashcards' ? 'Generating...' : 'Flashcards'}
            </button>
          </div>
        </div>
      </div>
      
      <div style={{
          flex: 1,
          backgroundColor: 'var(--engine-panel-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--engine-border)',
          display: 'flex',
          overflow: 'hidden'
      }}>
        <textarea
          value={noteContent}
          onChange={handleNoteChange}
          placeholder="Start typing your hackathon notes here... Progress is auto-saved."
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            padding: '2rem',
            backgroundColor: 'transparent',
            color: 'var(--engine-text-main)',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            lineHeight: '1.6',
            resize: 'none'
          }}
        />
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '400px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              style={{
                borderLeft: '1px solid var(--engine-border)',
                backgroundColor: 'rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--engine-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--engine-accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} /> {analysisMode === 'flashcards' ? 'Revision Flashcards' : 'AI Study Analysis'}
                  </span>
                  
                  {responses.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {responses.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveWorkerIdx(idx);
                            setAnalysisResult(responses[idx].content);
                          }}
                          style={{
                            background: activeWorkerIdx === idx ? 'var(--engine-accent)' : 'var(--engine-border)',
                            color: activeWorkerIdx === idx ? '#fff' : 'var(--engine-text-main)',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7em',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {r.model_name.includes('Llama') ? 'Llama 3' : 'Ministral' }
                          <span style={{ color: activeWorkerIdx === idx ? '#fff' : 'var(--engine-accent)' }}>
                            {r.consensus_score}
                          </span>
                        </button>
                      ))}
                      
                      <button
                        onClick={handleDeepDive}
                        disabled={isDeepDiveLoading}
                        style={{
                          background: activeWorkerIdx === 2 ? '#d29922' : 'var(--engine-border)',
                          color: activeWorkerIdx === 2 ? '#fff' : '#d29922',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7em',
                          cursor: isDeepDiveLoading ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isDeepDiveLoading ? <Loader2 size={12} className="spin" /> : <Gavel size={12} />}
                        Judge
                      </button>
                    </div>
                  )}

                </div>
                <button onClick={() => setAnalysisResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--engine-text-muted)' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '0 0', overflowY: 'auto', flex: 1, fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--engine-text-main)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {analysisMode === 'flashcards' ? (
                  <FlashcardUI data={analysisResult} />
                ) : (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p style={{ margin: '0 0 1rem 0' }} {...props} />,
                        h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5rem', margin: '1rem 0 0.5rem 0', color: 'var(--engine-accent)' }} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{ fontSize: '1.25rem', margin: '1rem 0 0.5rem 0', color: 'var(--engine-accent)' }} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: 'var(--engine-accent)' }} {...props} />,
                        ul: ({node, ...props}) => <ul style={{ margin: '0 0 1rem 1.5rem', padding: 0 }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ margin: '0 0 1rem 1.5rem', padding: 0 }} {...props} />,
                        li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                        code: ({node, inline, ...props}) => (
                          inline ? 
                          <code style={{ background: 'var(--engine-border)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'monospace' }} {...props} />
                          : 
                          <pre style={{ background: 'var(--engine-border)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85em', fontFamily: 'monospace', marginBottom: '1rem' }}>
                            <code {...props} />
                          </pre>
                        )
                      }}
                    >
                      {analysisResult}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

export default NotesView;
