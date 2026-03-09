import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Cpu, Zap, Box, CircleDashed } from 'lucide-react';
import styles from './LandingPage.module.css';
import Logo from '../components/Logo';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  return isMobile;
};

const LandingPage = () => {
  const [showInput, setShowInput] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLaunchClick = (e) => {
    e.preventDefault();
    setShowInput(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('hackathon_username', username.trim());
      navigate('/chat');
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
  };

  const cardVariant = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className={styles.container}>

      {/* Left Panel - Content */}
      <motion.div
        className={styles.leftPanel}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div className={styles.logo} variants={fadeIn} style={{ display: 'flex', alignItems: 'center' }}>
          <Logo style={{ height: isMobile ? '32px' : '36px', color: 'var(--landing-text-main)' }} />
        </motion.div>

        <div className={styles.contentWrapper}>
          <motion.h1 className={styles.headline} variants={fadeIn}>
            Unleash your <br />
            <span className={styles.highlight}>AI models</span> to <br />
            decide the truth.
          </motion.h1>

          <motion.p className={styles.description} variants={fadeIn}>
            Your multi-agent evaluator is here 24/7. Llama and Ministral debate. Amazon Nova Pro judges. Powered by a 7-metric consensus protocol.
          </motion.p>

          <motion.div variants={fadeIn}>
            <AnimatePresence mode="wait">
              {!showInput ? (
                <motion.div
                  key="launch-btn"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button onClick={handleLaunchClick} className={styles.ctaButton} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex' }}>
                    <span>LAUNCH ENGINE</span>
                    <div className={styles.ctaIcon}>
                      <ArrowUpRight size={isMobile ? 18 : 20} color="#fff" />
                    </div>
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="name-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  className={styles.ctaButton}
                  style={{ padding: isMobile ? '0.4rem 0.4rem 0.4rem 1.25rem' : '0.4rem 0.4rem 0.4rem 1.5rem', cursor: 'default' }}
                >
                  <input
                    type="text"
                    placeholder="Enter your name..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      background: 'transparent', border: 'none', color: '#fff',
                      fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '600', outline: 'none', width: isMobile ? '150px' : '200px',
                      fontFamily: 'inherit'
                    }}
                    autoFocus
                  />
                  <button type="submit" className={styles.ctaIcon} style={{ background: 'var(--landing-accent)', border: 'none', cursor: 'pointer' }}>
                    <ArrowUpRight size={isMobile ? 18 : 20} color="#fff" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>


      {/* Right Panel - Visuals */}
      <div className={styles.rightPanel}>
        <div className={styles.visualContainer}>

          {/* Top Floating Pills */}
          <motion.div
            className={styles.topPills}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Link to="/architecture" style={{ textDecoration: 'none' }}>
              <div className={styles.pill}>Architecture</div>
            </Link>
            <Link to="/metrics" style={{ textDecoration: 'none' }}>
              <div className={styles.pill}>Metrics</div>
            </Link>
            <a href="https://github.com/Dibya81/consensus-engine" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div className={`${styles.pill} ${styles.pillDark}`}>GitHub ↗</div>
            </a>
          </motion.div>

          {/* Animated Glassmorphism Cards */}
          <motion.div
            className={styles.cardsContainer}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Card 1 */}
            <motion.div className={styles.glassCard} variants={cardVariant}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>Evaluated continuously</span>
                <div className={styles.cardIcon}>
                  <ArrowUpRight size={isMobile ? 16 : 18} color="#fff" />
                </div>
              </div>
              <div>
                <div className={styles.cardMain}>7 Metrics</div>
                <div className={styles.cardSub}>in the consensus protocol</div>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div className={styles.glassCard} variants={cardVariant}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>Live Judge Resolution</span>
                <div className={styles.cardIcon}>
                  <Zap size={isMobile ? 16 : 18} fill="#fff" color="#fff" />
                </div>
              </div>
              <div>
                <div className={styles.cardMain}>Nova Pro</div>
                <div className={styles.cardSub}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <CircleDashed size={isMobile ? 20 : 24} color="#fff" />
                    <span>99% accuracy</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
