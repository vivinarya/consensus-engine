import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Save, Loader2, Sparkles, X, Code2, Play } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import ReactMarkdown from 'react-markdown';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/themes/prism-tomorrow.css';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";
const LANGUAGES = ['C', 'C++', 'Python', 'Java'];

const BOILERPLATES = {
  'Python': 'def main():\n    print("Hello, Consensus!")\n\nif __name__ == "__main__":\n    main()\n',
  'C': '#include <stdio.h>\n\nint main() {\n    printf("Hello, Consensus!\\n");\n    return 0;\n}\n',
  'C++': '#include <iostream>\n\nint main() {\n    std::cout << "Hello, Consensus!" << std::endl;\n    return 0;\n}\n',
  'Java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Consensus!");\n    }\n}\n'
};

const CodeHubView = ({ username }) => {
  const [code, setCode] = useState(BOILERPLATES['Python']);
  const [language, setLanguage] = useState('Python');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [outputResult, setOutputResult] = useState(null);

  useEffect(() => {
    fetchCode();
  }, [username]);

  const fetchCode = async () => {
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_USER_DATA', username, data_type: 'code_hub_cli' })
      });
      const res = await response.json();
      if (res.data && res.data.code) {
        setCode(res.data.code);
        if (res.data.language) setLanguage(res.data.language);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);

    if (saveTimeout) clearTimeout(saveTimeout);
    
    setSaveTimeout(setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SAVE_USER_DATA', username, data_type: 'code_hub_cli', payload: { code: newCode, language } })
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }, 1000));
  };
  
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    
    // Check if current code is empty or matches any existing boilerplate
    let newCode = code;
    const isBoilerplate = code.trim() === '' || code === '// Write your code here...\n' || Object.values(BOILERPLATES).includes(code);
    
    if (isBoilerplate) {
      newCode = BOILERPLATES[lang];
      setCode(newCode);
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SAVE_USER_DATA', username, data_type: 'code_hub_cli', payload: { code: newCode, language: lang } })
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }, 1000));
  }

  const handleAnalyzeCode = async () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ANALYZE_DATA', username, data_type: 'code_hub', language, payload: code })
      });
      const res = await response.json();
      if (res.data) setAnalysisResult(res.data.content || "Empty response from AI");
    } catch (e) {
      console.error(e);
      setAnalysisResult("Error occurred while analyzing.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteCode = async () => {
    if (!code.trim()) return;
    setIsExecuting(true);
    setOutputResult(null);
    setAnalysisResult(null);

    try {
      const resp = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXECUTE_CODE',
          username,
          language: language,
          code: code
        })
      });
      const data = await resp.json();
      if (data && data.data && data.data.output) {
        setOutputResult(data.data.output || "Program finished with no output.");
      } else {
        setOutputResult("Execution failed or unsupported syntax.");
      }
    } catch (e) {
      console.error(e);
      setOutputResult("Network error computing the code execution.");
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--engine-text-muted)' }}>
        <Loader2 size={24} className="spin" />
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        flex: 1,
        padding: 'clamp(4rem,8vw,5rem) clamp(1rem,4vw,3rem) 2rem clamp(1rem,4vw,3rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        height: '100%',
        overflowY: 'hidden'
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .codehub-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
          .codehub-toolbar { flex-wrap: wrap !important; gap: 0.5rem !important; }
          .codehub-run-btn span { display: none; }
          .codehub-ai-btn span { display: none; }
        }
      `}</style>
      <div className="codehub-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--engine-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'clamp(1.4rem,4vw,2rem)', whiteSpace: 'nowrap' }}>
          <Code size={24} color="var(--engine-accent)" /> Code Hub
        </h1>
        <div className="codehub-toolbar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--engine-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isSaving ? 'Syncing...' : 'Synced'}
          </div>
          
          <div style={{ backgroundColor: 'var(--engine-panel-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--engine-border)', display: 'flex', gap: '2px', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                style={{
                  background: language === lang ? 'var(--engine-bg-color)' : 'transparent',
                  color: language === lang ? 'var(--engine-text-main)' : 'var(--engine-text-muted)',
                  border: language === lang ? '1px solid var(--engine-border)' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.85rem',
                  fontWeight: language === lang ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  boxShadow: language === lang ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {lang}
              </button>
            ))}
          </div>

          <button 
            className="codehub-run-btn"
            onClick={handleExecuteCode}
            disabled={isExecuting || !code.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: isExecuting ? 'var(--engine-border)' : '#27c93f',
              color: isExecuting ? '#fff' : '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: (isExecuting || !code.trim()) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              opacity: (!code.trim()) ? 0.5 : 1
            }}
          >
            {isExecuting ? <Loader2 size={15} className="spin" /> : <Play size={15} fill="currentColor" />} 
            <span>{isExecuting ? 'Running...' : 'Run'}</span>
          </button>

          <button 
            className="codehub-ai-btn"
            onClick={handleAnalyzeCode}
            disabled={isAnalyzing || !code.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: isAnalyzing ? 'var(--engine-border)' : 'var(--engine-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: (isAnalyzing || !code.trim()) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              opacity: (!code.trim()) ? 0.5 : 1
            }}
          >
            {isAnalyzing ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} 
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Check'}</span>
          </button>
        </div>
      </div>
      
      <div style={{
          flex: 1,
          backgroundColor: '#0d1117', /* Dark terminal background */
          borderRadius: '12px',
          border: '1px solid #30363d',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative'
      }}>
        {/* Fake Terminal Top Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '36px', backgroundColor: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', padding: '0 1rem', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          </div>
          <div style={{ color: '#8b949e', fontSize: '0.8rem', flex: 1, textAlign: 'center', fontFamily: 'monospace' }}>
            {username} ~ code_hub ~ {language.toLowerCase()}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '48px 1rem 1rem 1rem' }}>
          <Editor
            value={code}
            onValueChange={handleCodeChange}
            highlight={code => {
              let syntax = 'python';
              if (language === 'C') syntax = 'c';
              if (language === 'C++') syntax = 'cpp';
              if (language === 'Java') syntax = 'java';
              return Prism.highlight(code, Prism.languages[syntax] || Prism.languages.clike, syntax);
            }}
            padding={16}
            style={{
              fontFamily: "'Fira Code', 'Consolas', monospace",
              fontSize: '1.05rem',
              lineHeight: '1.6',
              minHeight: '100%',
              color: '#c9d1d9',
              outline: 'none',
              border: 'none',
            }}
            textareaClassName="code-hub-textarea"
          />
          <style>{`
            .code-hub-textarea:focus { outline: none !important; }
            .code-hub-textarea { outline: none !important; border: none !important; }
          `}</style>
          <AnimatePresence>
            {outputResult !== null && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '30%', minHeight: '150px', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  borderTop: '1px solid #30363d',
                  backgroundColor: '#090c10',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ height: '30px', padding: '0 1rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: '600', color: '#8b949e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Output Console</span>
                  <button onClick={() => setOutputResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={14} /></button>
                </div>
                <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, fontSize: '0.9rem', color: '#c9d1d9', whiteSpace: 'pre-wrap', fontFamily: "'Fira Code', 'Consolas', monospace" }}>
                  {outputResult}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '500px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              style={{
                borderLeft: '1px solid #30363d',
                backgroundColor: '#161b22',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 11
              }}
            >
              <div style={{ height: '36px', padding: '0 1rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: '600', color: 'var(--engine-accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Code2 size={16} /> Analysis Report</span>
                <button onClick={() => setAnalysisResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, fontSize: '0.95rem', lineHeight: '1.6', color: '#c9d1d9', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p style={{ margin: '0 0 1rem 0' }} {...props} />,
                    h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5rem', margin: '1rem 0 0.5rem 0', color: '#58a6ff' }} {...props} />,
                    h2: ({node, ...props}) => <h2 style={{ fontSize: '1.25rem', margin: '1rem 0 0.5rem 0', color: '#58a6ff' }} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: '#58a6ff' }} {...props} />,
                    ul: ({node, ...props}) => <ul style={{ margin: '0 0 1rem 1.5rem', padding: 0 }} {...props} />,
                    ol: ({node, ...props}) => <ol style={{ margin: '0 0 1rem 1.5rem', padding: 0 }} {...props} />,
                    li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                    code: ({node, inline, ...props}) => (
                      inline ? 
                      <code style={{ background: '#30363d', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'monospace' }} {...props} />
                      : 
                      <pre style={{ background: '#30363d', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85em', fontFamily: 'monospace', marginBottom: '1rem' }}>
                        <code {...props} />
                      </pre>
                    )
                  }}
                >
                  {analysisResult}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CodeHubView;
