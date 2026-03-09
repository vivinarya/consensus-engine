import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Target, Activity } from 'lucide-react';
import styles from './LandingPage.module.css'; // Reusing Landing Page CSS
import Logo from '../components/Logo';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  return isMobile;
};

const MetricsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
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
        <motion.div className={styles.logo} variants={fadeIn} onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Logo style={{ height: isMobile ? '32px' : '36px', color: 'var(--landing-text-main)' }} />
        </motion.div>

        <div className={styles.contentWrapper}>
          <motion.h1 className={styles.headline} variants={fadeIn}>
            Evaluation <br />
            <span className={styles.highlight}>Metrics</span>.
          </motion.h1>

          <motion.p className={styles.description} variants={fadeIn}>
            Our consensus protocol scores responses across 7 rigorous dimensions: factuality, relevance, clarity, coherence, depth, logic, and safety.
          </motion.p>

          <motion.div variants={fadeIn}>
            <button onClick={() => navigate('/')} className={styles.ctaButton} style={{ background: 'transparent', border: '1px solid #ddd', color: 'var(--landing-text-main)' }}>
              <div className={styles.ctaIcon} style={{ background: '#eee' }}>
                <ArrowLeft size={20} color="var(--landing-text-main)" />
              </div>
              <span style={{ fontWeight: 600 }}>BACK TO HOME</span>
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Visuals */}
      <div className={styles.rightPanel}>
        <div className={styles.visualContainer} style={{ 
          backgroundColor: '#ffecd2',
          backgroundImage: `
            radial-gradient(at 20% 80%, hsla(38,100%,74%,1) 0px, transparent 50%),
            radial-gradient(at 80% 20%, hsla(11,100%,76%,1) 0px, transparent 50%),
            radial-gradient(at 50% 50%, hsla(343,100%,76%,1) 0px, transparent 50%)
          `
        }}>
          <motion.div
            className={styles.topPills}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className={styles.pill} onClick={() => navigate('/architecture')} style={{ cursor: 'pointer' }}>Architecture</div>
            <a href="https://github.com/Dibya81/consensus-engine" target="_blank" rel="noopener noreferrer" className={`${styles.pill} ${styles.pillDark}`} style={{ textDecoration: 'none' }}>GitHub ↗</a>
          </motion.div>

          <motion.div
            className={styles.cardsContainer}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Card 1 */}
            <motion.div className={styles.glassCard} variants={cardVariant}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>Factuality score</span>
                <div className={styles.cardIcon}>
                  <CheckCircle size={isMobile ? 16 : 18} color="#fff" />
                </div>
              </div>
              <div>
                <div className={styles.cardMain}>95+</div>
                <div className={styles.cardSub}>Average score out of 100</div>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div className={styles.glassCard} variants={cardVariant}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>Consensus Delta</span>
                <div className={styles.cardIcon}>
                  <Target size={isMobile ? 16 : 18} color="#fff" />
                </div>
              </div>
              <div>
                <div className={styles.cardMain}>&lt; 5%</div>
                <div className={styles.cardSub}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <Activity size={isMobile ? 20 : 24} color="#fff" />
                    <span>Margin of disagreement</span>
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

export default MetricsPage;
