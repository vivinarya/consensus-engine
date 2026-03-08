import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckCircle, Cpu, ShieldCheck, Paperclip, HelpCircle, Sparkles, Loader2, ArrowRight, Zap } from 'lucide-react';
import styles from './ChatMessage.module.css';

const TypewriterAI = ({ content, speed = 10, onComplete, onChar }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const startTimeRef = React.useRef(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setDisplayedContent('');
  }, [content]);

  useEffect(() => {
    if (!startTimeRef.current) return;

    if (displayedContent.length < content.length) {
      const timeout = setTimeout(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const charsToShow = Math.max(1, Math.floor(elapsed / speed));
        
        if (charsToShow < content.length) {
          setDisplayedContent(content.slice(0, charsToShow));
          if (onChar) onChar(); 
        } else {
          setDisplayedContent(content);
          if (onComplete) onComplete();
        }
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [content, displayedContent, speed, onComplete, onChar]);

  return <ReactMarkdown>{displayedContent}</ReactMarkdown>;
};

const ChatMessage = ({ message, onSelect, onDeepDive, onScroll }) => {
  const [isTyping, setIsTyping] = useState(!message.hasTyped && message.role === 'ai');
  const isUser = message.role === 'user';
  
  const handleTypingComplete = () => {
    setIsTyping(false);
    message.hasTyped = true;
  };

  // Auto-scroll handler passed from parent
  const handleCharTyped = () => {
    if (onScroll) onScroll();
  };

  if (isUser) {
    return (
      <div className={`${styles.messageRow} ${styles.userRow}`}>
        <div className={styles.userContent}>
          <div style={{ marginBottom: message.attachments?.length > 0 ? '0.5rem' : 0 }}>
            {message.content}
          </div>
          {message.attachments && message.attachments.length > 0 && (
            <div className={styles.msgAttachments}>
              {message.attachments.map((a, i) => (
                <div key={i} className={styles.msgAttChip}>
                  <Paperclip size={12} />
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle Deep Dive Result
  if (message.status === 'DEEP_DIVE_RESULT') {
    return (
      <div className={`${styles.messageRow} ${styles.aiRow}`}>
        <div className={styles.aiContent}>
          <div className={styles.aiAvatar} style={{ backgroundColor: '#8b5cf6' }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div className={styles.aiText}>
            <div className={styles.deepDiveBadge}>Expert Deep Dive Analysis</div>
            {isTyping ? (
              <TypewriterAI 
                content={message.content} 
                speed={5} // Fast for deep dive
                onComplete={handleTypingComplete} 
                onChar={handleCharTyped}
              />
            ) : (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle Judge Improvement
  if (message.status === 'IMPROVED_BY_JUDGE') {
    return (
      <div className={`${styles.messageRow} ${styles.aiRow}`}>
        <div className={styles.aiContent}>
          <div className={`${styles.aiAvatar} ${styles.judgeAvatar}`} style={{ backgroundColor: '#ff8a65' }}>
            <ShieldCheck size= {20} color="#fff" />
          </div>
          <div className={styles.aiText}>
            <div className={styles.judgeBlock} style={{ marginBottom: '1rem' }}>
              <div className={styles.judgeHeader}>Judge Decision</div>
              <p>{message.judge_explanation}</p>
            </div>
            {isTyping ? (
              <TypewriterAI 
                content={message.content} 
                speed={5} // Fast for Judge
                onComplete={handleTypingComplete} 
                onChar={handleCharTyped}
              />
            ) : (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle Comparison Flow
  if (message.status === 'COMPARISON') {
    const canToggle = message.isLatestComparison;
    
    return (
      <div className={`${styles.messageRow} ${styles.comparisonRow}`}>
        <div className={styles.aiContent}>
          <div className={`${styles.aiAvatar} ${styles.judgeAvatar}`} style={{ backgroundColor: '#ff8a65' }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div className={styles.aiText}>
            <div className={styles.judgeBlock} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.judgeHeader}>
                <span>{canToggle ? "Selection Active" : "Final Selection"}</span>
                {message.deepDiveLoading && (
                  <div className={styles.deepDiveLoading}>
                    <Loader2 size={14} className={styles.spinner} />
                    Analyzing deeper...
                  </div>
                )}
              </div>
              <p>{message.judge_explanation}</p>
            </div>
          </div>
        </div>

        <div className={styles.comparisonContainer}>
          <div className={styles.dualOptions}>
            {message.responses.map((resp, idx) => (
              <div 
                key={idx} 
                className={`${styles.optionCard} ${message.selectedIdx === idx ? styles.selected : ''}`}
                onClick={() => onSelect && canToggle && onSelect(message.id, idx)}
              >
                <div className={styles.modelBadge}>{resp.model_name}</div>
                <div className={styles.aiText}>
                  {isTyping ? (
                    <TypewriterAI 
                        content={resp.content} 
                        speed={5} 
                        onComplete={idx === message.responses.length - 1 ? handleTypingComplete : null} 
                        onChar={handleCharTyped}
                    />
                  ) : (
                    <ReactMarkdown>{resp.content}</ReactMarkdown>
                  )}
                </div>
                {!message.finalized && (
                  <div className={styles.selectIndicator}>
                    <CheckCircle size={16} />
                    <span>Select this answer</span>
                  </div>
                )}
                {message.finalized && message.selectedIdx === idx && (
                  <div className={styles.selectIndicator} style={{ opacity: 1 }}>
                    <CheckCircle size={16} />
                    <span>Final Answer Selection</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {canToggle && !message.deepDiveLoading && (
            <div className={styles.comparisonActions}>
              <button 
                className={styles.deepDiveButton}
                onClick={() => onDeepDive && onDeepDive(message.id)}
              >
                <Sparkles size={16} />
                <span>Not satisfied? Get an Expert Deep Dive</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default Standard AI Message
  return (
    <div className={`${styles.messageRow} ${styles.aiRow}`}>
      <div className={styles.aiContent}>
        <div className={styles.aiAvatar}>
          <Cpu size={20} color="#fff" />
        </div>
        <div className={styles.aiText}>
          {message.isFromCache && (
            <div className={styles.cacheBadge}>
              <Zap size={12} fill="currentColor" />
              <span>Cached Response</span>
            </div>
          )}
          {isTyping ? (
            <TypewriterAI 
                content={message.content} 
                speed={5} 
                onComplete={handleTypingComplete} 
                onChar={handleCharTyped}
            />
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
