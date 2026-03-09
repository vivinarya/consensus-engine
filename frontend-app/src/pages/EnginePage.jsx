import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Search, Archive, Plus, ArrowUp, Loader2, FileText, Image, X, Paperclip, Moon, Sun,
  Code, TrendingUp, History, StickyNote, Home, PieChart, Folder, Settings, MessageSquare, Mic, MicOff, LogOut, Trash2, Users, Compass
} from 'lucide-react';
import styles from './EnginePage.module.css';
import ChatMessage from '../components/ChatMessage';
import Logo from '../components/Logo';
import NotesView from '../components/NotesView';
import CodeHubView from '../components/CodeHubView';
import ProgressView from '../components/ProgressView';
import CareerView from '../components/CareerView';
import CommunityView from '../components/CommunityView';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";

const TypewriterGreeting = ({ phrases }) => {
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!phrases || phrases.length === 0) return;
    const currentPhrase = phrases[phraseIndex];
    let timeout;
    
    if (!isDeleting && displayText.length < currentPhrase.length) {
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.slice(0, displayText.length + 1));
      }, 70);
    } else if (!isDeleting && displayText.length === currentPhrase.length) {
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 3000);
    } else if (isDeleting && displayText.length > 0) {
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.slice(0, displayText.length - 1));
      }, 35);
    } else if (isDeleting && displayText.length === 0) {
      setIsDeleting(false);
      setPhraseIndex((phraseIndex + 1) % phrases.length);
    }
    
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex, phrases]);

  return <h2 className={styles.greetingTitle}>{displayText}</h2>;
};

const EnginePage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(localStorage.getItem('hackathon_username') || '');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [inputValue, setInputValue] = useState('');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
  const [globalStopSignal, setGlobalStopSignal] = useState(0);
  const [isAnyTyping, setIsAnyTyping] = useState(false);
  const [greetings, setGreetings] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const currentTab = hoveredTab || activeTab;
  const [activePopup, setActivePopup] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const feedRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceTimeoutRef = useRef(null);

  useEffect(() => {
    if (!username) {
      const stored = localStorage.getItem('hackathon_username');
      if (stored) {
        setUsername(stored);
      } else {
        navigate('/');
      }
    }
  }, [username, navigate]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (username) {
      setGreetings([`Welcome, ${username}`, "Let's get started"]);
    }
  }, [username]);

  // Handle Resize for Mobile Detection
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Helper: detect any kind of error/empty AI message that should NOT be persisted
  const isErrorMessage = (msg) => {
    if (msg.role !== 'ai') return false;
    const txt = (msg.content || '').toLowerCase();
    return (
      txt.includes('blocked by aws') ||
      txt.includes('accessdeniedexception') ||
      txt.includes('invalid_payment_instrument') ||
      txt.includes('error occurred') ||
      txt.includes('unable to connect') ||
      txt.includes('engine error') ||
      txt.includes('unexpected response') ||
      txt.includes('network error') ||
      txt.includes('timed out') ||
      txt.includes('service unavailable') ||
      txt.startsWith('error:') ||
      (txt.trim() === '') 
    );
  };

  useEffect(() => {
    if (username) {
      const fetchHistory = async () => {
        try {
          const response = await fetch(LAMBDA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'chat_sessions' })
          });
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            // Strip any persisted error messages from loaded history
            const cleaned = result.data
              .map(s => ({
                ...s,
                messages: (s.messages || []).filter(m => !isErrorMessage(m))
              }))
              .filter(s => s.messages && s.messages.length > 0);
            setSessions(cleaned);
          }
        } catch (error) {
          console.error("Error fetching sessions:", error);
        }
      };
      fetchHistory();
    }
  }, [username]);

  useEffect(() => {
    if (username && sessions.length > 0 && !isLoading) {
      const saveHistory = async () => {
        try {
          // Sanitize before saving: strip all error AI messages
          const sessionsToSave = sessions
            .map(s => ({
              ...s,
              messages: (s.messages || []).filter(m => !isErrorMessage(m))
            }))
            .filter(s => s.messages && s.messages.length > 0);

          if (sessionsToSave.length === 0) return;

          await fetch(LAMBDA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'SAVE_USER_DATA', 
              username, 
              data_type: 'chat_sessions',
              payload: sessionsToSave 
            })
          });
        } catch (error) {
          console.error("Error saving sessions:", error);
        }
      };
      const timeout = setTimeout(saveHistory, 1500);
      return () => clearTimeout(timeout);
    }
  }, [sessions, username, isLoading]);


  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

  const updateCurrentMessages = (updater) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: typeof updater === 'function' ? updater(s.messages) : updater };
      }
      return s;
    }));
  };

  const handleNewChat = () => {
    const newId = Date.now();
    const newSession = { id: newId, title: 'New Conversation', messages: [], timestamp: new Date().toISOString() };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setActiveTab('chat');
  };

  const loadSession = (id) => {
    setCurrentSessionId(id);
    setActiveTab('chat');
    setActivePopup(null);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
         handleNewChat();
      }
      
      const payload = sessions.filter(s => s.id !== sessionId && s.messages && s.messages.length > 0);
      
      await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'SAVE_USER_DATA', 
          username, 
          data_type: 'chat_sessions',
          payload 
        })
      });
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [sessions, currentSessionId, isLoading]);

  const handleSelectAnswer = (messageId, selectedIdx) => {
    updateCurrentMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return { ...m, selectedIdx, finalized: true, hasTyped: true };
      }
      return m;
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result.split(',')[1];
        const type = file.type.startsWith('image/') ? 'image' : 'document';
        const format = file.type.split('/')[1];

        setAttachments(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name,
          type: type,
          format: format === 'vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' : format,
          data: base64Data
        }]);
      };
      reader.readAsDataURL(file);
    }
    setShowPlusMenu(false);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDeepDive = async (messageId) => {
    const msg = currentMessages.find(m => m.id === messageId);
    if (!msg || msg.deepDiveLoading) return;

    updateCurrentMessages(prev => prev.map(m => m.id === messageId ? { ...m, deepDiveLoading: true } : m));
    setIsDeepDiveLoading(true);

    try {
      const parentUserMsg = currentMessages.find((m, idx) => {
        const nextMsg = currentMessages[idx + 1];
        return nextMsg && nextMsg.id === messageId;
      });

      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: parentUserMsg ? parentUserMsg.content : "General Query",
          action: "JUDGE_DEEP_DIVE",
          llama_content: msg.responses[0].content,
          ministral_content: msg.responses[1].content,
          username
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Server Error (${response.status})`);
      }
      
      const data = result.data;
      if (!data || !data.content) {
        throw new Error("Expert Judge returned empty or invalid analysis.");
      }

      const deepDiveMsg = {
        id: Date.now(),
        role: 'ai',
        status: 'DEEP_DIVE_RESULT',
        content: data.content,
        hasTyped: false
      };

      updateCurrentMessages(prev => [...prev, deepDiveMsg]);
    } catch (error) {
      console.error("Deep dive error:", error);
      const errorMsg = {
        id: Date.now(),
        role: 'ai',
        status: 'DEEP_DIVE_RESULT',
        content: `### ⚠️ Analysis Failed\n\n${error.message}\n\nPlease check your internet connection or try again in a few moments.`,
        hasTyped: false
      };
      updateCurrentMessages(prev => [...prev, errorMsg]);
    } finally {
      updateCurrentMessages(prev => prev.map(m => m.id === messageId ? { ...m, deepDiveLoading: false } : m));
      setIsDeepDiveLoading(false);
    }
  };

  const submitChatQuery = async (queryText, queryAttachments) => {
    if ((!queryText.trim() && queryAttachments.length === 0) || isLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Date.now();
      const newSess = { id: sessionId, title: 'New Conversation', messages: [], timestamp: new Date().toISOString() };
      setSessions(prev => [newSess, ...prev]);
      setCurrentSessionId(sessionId);
    }

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.role === 'ai' ? { ...m, isLatestComparison: false, hasTyped: true } : m)
        };
      }
      return s;
    }));

    const userQuery = queryText;
    const currentAttachments = [...queryAttachments];
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userQuery,
      attachments: currentAttachments.map(a => ({ name: a.name }))
    };

    // Update title if first message
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const title = s.messages.length === 0 ? (userQuery.length > 25 ? userQuery.slice(0, 25) + '...' : userQuery) : s.title;
        return { ...s, title, messages: [...s.messages, userMsg] };
      }
      return s;
    }));

    setInputValue('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          username,
          attachments: currentAttachments.map(a => ({
            type: a.type,
            format: a.format,
            name: a.name,
            data: a.data
          }))
        })
      });

      const result = await response.json();
      const data = result.data;

      let aiMsg = { id: Date.now() + 1, role: 'ai', hasTyped: false };
      aiMsg.isFromCache = result.cached;

      if (data.status === 'IMPROVED_BY_JUDGE') {
        aiMsg.status = 'IMPROVED_BY_JUDGE';
        aiMsg.judge_explanation = data.judge_explanation;
        aiMsg.content = data.judge_response.content;
      } else if (data.status === 'COMPARISON') {
        aiMsg.status = 'COMPARISON';
        aiMsg.judge_explanation = data.judge_explanation;
        aiMsg.responses = data.responses;
        aiMsg.finalized = false;
        aiMsg.selectedIdx = null;
        aiMsg.isLatestComparison = true;
      } else {
        // Handle legacy cache entries or any other response shape
        if (data.responses && data.responses.length > 0) {
          aiMsg.status = 'COMPARISON';
          aiMsg.judge_explanation = data.judge_explanation || null;
          aiMsg.responses = data.responses;
          aiMsg.finalized = false;
          aiMsg.selectedIdx = null;
          aiMsg.isLatestComparison = true;
        } else if (data.content) {
          aiMsg.content = data.content;
        } else if (data.error_msg) {
          aiMsg.content = `Engine error: ${data.error_msg}`;
        } else {
          // Last resort: stringify whatever came back so it's visible
          aiMsg.content = "The engine returned an unexpected response. Please try again.";
        }
      }

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, aiMsg] };
        }
        return s;
      }));
    } catch (error) {
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { 
            ...s, 
            messages: [...s.messages, {
              id: Date.now() + 1,
              role: 'ai',
              content: "Error: Unable to connect to the consensus engine."
            }] 
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    submitChatQuery(inputValue, attachments);
  };

  const handleSignOut = () => {
    localStorage.removeItem('hackathon_username');
    setUsername('');
    navigate('/');
  };

  const handleMouseMove = (e) => {
    if (isMobile) return; // Disable expensive move tracking on mobile devices
    if (!e.currentTarget) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();
    if (!width || !height) return;
    const x = (clientX / width) * 100;
    const y = (clientY / height) * 100;
    setMousePos({ x, y });
  };

  const handleTouchMove = (e) => {
    if (!e.touches[0]) return;
    const touch = e.touches[0];
    const { width, height } = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX / width) * 100;
    const y = (touch.clientY / height) * 100;
    setMousePos({ x, y });
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Try Google Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      setInputValue(''); 
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    setIsListening(true);
    let finalTranscript = '';
    setInputValue("Recording active... Speak now.");

    const resetSilenceTimeout = () => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
      voiceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
           recognitionRef.current.stop();
        }
        setIsListening(false);
        setInputValue("Recording off. Submitting...");
        
        const cleanTranscript = finalTranscript.trim();
        
        if (cleanTranscript) {
           setInputValue(cleanTranscript);
           setTimeout(() => submitChatQuery(cleanTranscript, []), 100);
        } else {
           setInputValue('');
        }
      }, 5000);
    };

    resetSilenceTimeout();

    recognition.onresult = (event) => {
      let combinedFinal = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          combinedFinal += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      finalTranscript += combinedFinal;
      
      if (finalTranscript || interimTranscript) {
        setInputValue(`${finalTranscript} ${interimTranscript}`);
      }
      resetSilenceTimeout();
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInputValue('');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    };

    recognition.start();
  };

  if (!username) return null;

  return (
    <div
      className={`${styles.engineContainer} ${isMobile ? 'is-mobile' : ''}`}
      onMouseMove={handleMouseMove}
      onTouchMove={isMobile ? undefined : handleTouchMove}
      style={{
        '--mouse-x': `${mousePos.x}%`,
        '--mouse-y': `${mousePos.y}%`
      }}
    >
      <div className={styles.ambientBackground} />

      {/* FULL TOP HEADER BAR */}
      <header className={styles.appHeader}>
        <div className={styles.headerLeft}>
          <motion.button 
            className={styles.menuTriggerStyle}
            onClick={() => setIsNavOpen(!isNavOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Menu size={24} color="var(--engine-text-main)" />
          </motion.button>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.themeToggleBtn}
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex' }}>
            <Logo style={{ height: '32px', color: 'var(--engine-text-main)', opacity: 0.8 }} />
          </div>
        </div>
      </header>

      {/* BUBBLY FLOATING NAVIGATOR (FLY-OUT) */}
      <AnimatePresence>
        {isNavOpen && (
          <div className={styles.navWrapper} onClick={() => setIsNavOpen(false)}>
            <motion.nav 
              className={styles.bubblyNav}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.navStack}>
                {/* TOP ITEM - HOME/NEW CHAT */}
                <div 
                  className={styles.navItem}
                  onMouseEnter={() => setHoveredTab('chat')}
                  onMouseLeave={() => setHoveredTab(null)}
                  onClick={() => { 
                    handleNewChat();
                    setIsNavOpen(false);
                  }}
                  title="Home / New Chat"
                >
                  {currentTab === 'chat' && (
                    <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                  )}
                  <Home size={22} className={styles.navIcon} style={{ color: currentTab === 'chat' ? '#fff' : 'currentColor' }} />
                </div>

                <div className={styles.navPillContainer}>
                  {/* COMMUNITY */}
                  <div 
                    className={styles.navItem}
                    onMouseEnter={() => setHoveredTab('community')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      setActiveTab('community'); 
                      setIsNavOpen(false); 
                    }}
                    title="Community"
                  >
                    {currentTab === 'community' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <Users size={22} className={styles.navIcon} style={{ color: currentTab === 'community' ? '#fff' : 'currentColor' }} />
                  </div>

                  {/* PROGRESS */}
                  <div 
                    className={styles.navItem}
                    onMouseEnter={() => setHoveredTab('progress')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      setActiveTab('progress'); 
                      setIsNavOpen(false); 
                    }}
                    title="Progress"
                  >
                    {currentTab === 'progress' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <TrendingUp size={22} className={styles.navIcon} style={{ color: currentTab === 'progress' ? '#fff' : 'currentColor' }} />
                  </div>

                  {/* CAREER */}
                  <div 
                    className={styles.navItem}
                    onMouseEnter={() => setHoveredTab('career')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      setActiveTab('career'); 
                      setIsNavOpen(false); 
                    }}
                    title="Career Roadmaps"
                  >
                    {currentTab === 'career' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <Compass size={22} className={styles.navIcon} style={{ color: currentTab === 'career' ? '#fff' : 'currentColor' }} />
                  </div>

                  {/* CODE HUB */}
                  <div 
                    className={styles.navItem}
                    onMouseEnter={() => setHoveredTab('code_hub')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      setActiveTab('code_hub'); 
                      setIsNavOpen(false); 
                    }}
                    title="Code Hub"
                  >
                    {currentTab === 'code_hub' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <Code size={22} className={styles.navIcon} style={{ color: currentTab === 'code_hub' ? '#fff' : 'currentColor' }} />
                  </div>

                  {/* NOTES */}
                  <div 
                    className={styles.navItem}
                    onMouseEnter={() => setHoveredTab('notes')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      setActiveTab('notes'); 
                      setIsNavOpen(false);
                    }}
                    title="Notes"
                  >
                    {currentTab === 'notes' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <StickyNote size={22} className={styles.navIcon} style={{ color: currentTab === 'notes' ? '#fff' : 'currentColor' }} />
                  </div>

                  {/* NEW CHAT ACTION - UNIFIED DESIGN */}
                  <div 
                    className={styles.navItem} 
                    onMouseEnter={() => setHoveredTab('new_chat')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      handleNewChat(); 
                      setIsNavOpen(false);
                    }}
                    title="New Chat"
                  >
                    {currentTab === 'new_chat' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <Plus size={22} className={styles.navIcon} style={{ color: currentTab === 'new_chat' ? '#fff' : 'currentColor' }} />
                  </div>

                  {/* HISTORY */}
                  <div 
                    className={styles.navItem}
                    onMouseEnter={() => setHoveredTab('history')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={() => { 
                      setActivePopup('Chat History'); 
                      setIsNavOpen(false);
                    }}
                    title="Chat History"
                  >
                    {currentTab === 'history' && (
                      <motion.div layoutId="activeBubble" className={styles.activeBubble} transition={{ type: 'spring', stiffness: 250, damping: 20 }} />
                    )}
                    <History size={22} className={styles.navIcon} style={{ color: currentTab === 'history' ? '#fff' : 'currentColor' }} />
                  </div>
                </div>

              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM OUTSIDE PROFILE - Desktop Only */}
      <div className={`${styles.bottomProfileWrapper} desktop-only`}>
        <AnimatePresence>
          {showAccountMenu && (
            <motion.div 
              className={styles.accountMenu}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
            >
              <div className={styles.accountMenuHeader}>
                <div className={styles.accountAvatarSmall}>{username.charAt(0).toUpperCase()}</div>
                <div className={styles.accountDetails}>
                  <p className={styles.accountName}>{username}</p>
                  <p className={styles.accountStatus}>Available</p>
                </div>
              </div>
              <button className={styles.accountMenuSignOut} onClick={handleSignOut}>
                <LogOut size={16} /> Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div 
          className={styles.bottomProfileBtn}
          onClick={() => setShowAccountMenu(!showAccountMenu)}
          title={`Account (${username})`}
        >
          <div className={styles.navAvatar}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Right-aligned Header Options - REMOVED since it's now in the appHeader */}

      <main className={styles.mainCanvas}>
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
            >
              <div
                className={styles.feedArea}
              ref={feedRef}
              style={{ justifyContent: currentMessages.length === 0 ? 'center' : 'flex-start' }}
            >
              {currentMessages.length === 0 ? (
                <div className={styles.greetingContainer}>
                  <TypewriterGreeting phrases={greetings} />
                </div>
              ) : (
                <div className={styles.chatFeed}>
                  {currentMessages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      onSelect={handleSelectAnswer}
                      onDeepDive={handleDeepDive}
                      stopSignal={globalStopSignal}
                      onTypingStatusChange={(status) => setIsAnyTyping(status)}
                      onScroll={() => {
                        if (feedRef.current) {
                          feedRef.current.scrollTop = feedRef.current.scrollHeight;
                        }
                      }}
                    />
                  ))}
                  {isLoading && (
                    <div className={styles.loadingRow}>
                      <Loader2 className={styles.spinner} size={20} />
                      <span>Consensus engine is pulsating...</span>
                    </div>
                  )}
                  {isDeepDiveLoading && (
                    <div className={styles.loadingRow} style={{ borderTop: '1px solid var(--engine-border)', margin: '1rem 0' }}>
                      <Loader2 className={styles.spinner} size={20} color="#8b5cf6" />
                      <span style={{ color: '#8b5cf6' }}>Expert Judge is calculating deep dive analysis...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.inputContainer}>
              <div className={styles.inputWrapper}>
                {attachments.length > 0 && (
                  <div className={styles.attachmentBar}>
                    {attachments.map(att => (
                      <div key={att.id} className={styles.attachmentChip}>
                        {att.type === 'image' ? <Image size={14} /> : <FileText size={14} />}
                        <span>{att.name}</span>
                        <button onClick={() => removeAttachment(att.id)}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <form className={styles.inputGroup} onSubmit={handleSubmit}>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="How can I help you today?"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className={styles.inputFooter}>
                    <div className={styles.footerLeft}>
                      <div className={styles.plusWrapper}>
                        <button
                          type="button"
                          className={styles.plusButton}
                          onClick={() => setShowPlusMenu(!showPlusMenu)}
                        >
                          <Plus size={20} />
                        </button>

                        <button
                          type="button"
                          className={styles.plusButton}
                          style={{ marginLeft: '12px',color: isListening ? '#f43f5e' : 'var(--engine-text-main)' }}
                          onClick={handleVoiceInput}
                          title="Voice Input"
                        >
                          {isListening ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <MicOff size={20} />
                               <span className={styles.pulsingDot} style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, backgroundColor: '#f43f5e', borderRadius: '50%' }}></span>
                               <style>{`
                                 .pulsingDot {
                                    animation: pulseDot 1s infinite alternate;
                                 }
                                 @keyframes pulseDot {
                                    from { transform: scale(0.8); opacity: 0.8; }
                                    to { transform: scale(1.4); opacity: 0; }
                                 }
                               `}</style>
                            </div>
                          ) : <Mic size={20} />}
                        </button>

                        <AnimatePresence>
                          {showPlusMenu && (
                            <motion.div
                              className={styles.plusMenu}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                            >
                              <button type="button" onClick={() => fileInputRef.current.click()}>
                                <FileText size={18} />
                                <span>Upload Document</span>
                              </button>
                              <button type="button" onClick={() => fileInputRef.current.click()}>
                                <Image size={18} />
                                <span>Upload Image</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {isAnyTyping ? (
                       <button type="button" onClick={() => setGlobalStopSignal(s => s + 1)} title="Stop Generating" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.5rem', display: 'flex', alignItems: 'center' }}>
                         <div style={{ width: 14, height: 14, backgroundColor: '#f43f5e', borderRadius: 2 }} />
                       </button>
                    ) : (
                       <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                         <ArrowUp size={20} color={(inputValue.trim() || attachments.length > 0) ? "#text-main" : "#666"} />
                       </button>
                    )}
                  </div>
                </form>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </motion.div>
        )}

          {activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: '100%', width: '100%' }}>
              <NotesView username={username} />
            </motion.div>
          )}
          {activeTab === 'code_hub' && (
            <motion.div key="code_hub" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: '100%', width: '100%' }}>
              <CodeHubView username={username} />
            </motion.div>
          )}
          {activeTab === 'progress' && (
            <motion.div key="progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: '100%', width: '100%' }}>
              <ProgressView username={username} />
            </motion.div>
          )}
          {activeTab === 'career' && (
            <motion.div key="career" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: '100%', width: '100%' }}>
              <CareerView username={username} />
            </motion.div>
          )}
          {activeTab === 'community' && (
            <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: '100%', width: '100%' }}>
              <CommunityView username={username} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FEATURE POPUP MODAL */}
      <AnimatePresence>
        {activePopup === 'Chat History' && (
          <div className={styles.modalOverlay} onClick={() => setActivePopup(null)} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
            <motion.div
              className={styles.modalContent}
              style={{ maxWidth: '500px', width: '90%' }}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Chat History</h2>
                <button onClick={() => setActivePopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--engine-text-muted)' }}><X size={20} /></button>
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {sessions.filter(s => s.messages && s.messages.length > 0).length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--engine-text-muted)', py: '2rem' }}>No history found. Start a new chat!</p>
                ) : (
                  sessions.filter(s => s.messages && s.messages.length > 0).map(sess => (
                    <div 
                      key={sess.id} 
                      className={styles.historyListItem} 
                      onClick={() => loadSession(sess.id)}
                    >
                      <div className={styles.historyListIcon}><History size={18} /></div>
                      <div className={styles.historyListContent}>
                        <div className={styles.historyListTitle}>{sess.title}</div>
                        <div className={styles.historyListDate}>{new Date(sess.timestamp).toLocaleDateString()}</div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteSession(e, sess.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--engine-text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                        title="Delete Session"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <button className={styles.modalBtn} style={{ marginTop: '1.5rem' }} onClick={handleNewChat}>Start New Chat</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SVG GOOEY FILTER DEFINITION */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
          <filter id="goo-mobile">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      {/* MOBILE BOTTOM NAV - Only visible on small screens */}
      <div className={`${styles.mobileBottomNav} mobile-only`}>

        {/* Mobile Account Menu - slides above nav bar */}
        <AnimatePresence>
          {showAccountMenu && (
            <>
              {/* tap-outside to dismiss */}
              <div
                onClick={() => setShowAccountMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 2099 }}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  bottom: '78px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '220px',
                  backgroundColor: 'var(--engine-panel-bg)',
                  border: '1px solid var(--engine-border)',
                  borderRadius: '16px',
                  padding: '1rem',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  zIndex: 2100,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--engine-border)' }}>
                  <div className={styles.accountAvatarSmall}>{username.charAt(0).toUpperCase()}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--engine-text-main)', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#10b981' }}>Available</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', padding: '0.4rem 0.2rem', borderRadius: '8px', width: '100%', textAlign: 'left' }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'chat' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'community' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <Users size={20} />
          <span>Community</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'progress' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <TrendingUp size={20} />
          <span>Insights</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'career' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('career')}
        >
          <Compass size={20} />
          <span>Career</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'notes' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <StickyNote size={20} />
          <span>Notes</span>
        </button>
        <button 
          className={styles.mobileNavItem}
          onClick={() => setActivePopup('Chat History')}
        >
          <History size={20} />
          <span>History</span>
        </button>
        <button 
          className={styles.mobileNavItem}
          onClick={() => setShowAccountMenu(!showAccountMenu)}
        >
          <div className={styles.accountAvatarNav}>
            {username.charAt(0).toUpperCase()}
          </div>
          <span>Account</span>
        </button>
      </div>


      <style>{`
        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EnginePage;
