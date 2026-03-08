import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Network, Database, CircleDashed } from 'lucide-react';
import styles from './LandingPage.module.css'; // Reusing Landing Page CSS
import Logo from '../components/Logo';

const ArchitecturePage = () => {
  const navigate = useNavigate();

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
        <motion.div className={styles.logo} variants={fadeIn} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Logo style={{ height: '36px', color: 'var(--landing-text-main)' }} />
        </motion.div>

        <div className={styles.contentWrapper}>
          <motion.h1 className={styles.headline} variants={fadeIn}>
            System <br />
            <span className={styles.highlight}>Architecture</span>.
          </motion.h1>

          <motion.p className={styles.description} variants={fadeIn}>
            A resilient multi-agent evaluation framework. Built on AWS Lambda, Aurora DB, and DynamoDB. LLMs running in consensus for absolute truth.
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
          backgroundColor: '#c2e9fb',
          backgroundImage: `
            radial-gradient(at 40% 20%, hsla(280,100%,74%,1) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(255,100%,93%,1) 0px, transparent 50%)
          `
        }}>
          <motion.div
            className={styles.topPills}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className={styles.pill} onClick={() => navigate('/metrics')} style={{ cursor: 'pointer' }}>Metrics</div>
            <a href="https://github.com/Dibya81/consensus-engine" target="_blank" rel="noopener noreferrer" className={`${styles.pill} ${styles.pillDark}`} style={{ textDecoration: 'none' }}>GitHub ↗</a>
          </motion.div>

          {/* Animated Glassmorphism Cards as Diagrams */}
          <motion.div
            className={styles.cardsContainer}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Card 1 */}
            <motion.div className={styles.glassCard} variants={cardVariant}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>Backend Services</span>
                <div className={styles.cardIcon}>
                  <Network size={18} color="#fff" />
                </div>
              </div>
              <div>
                <div className={styles.cardMain}>AWS Lambda</div>
                <div className={styles.cardSub}>Serverless computation</div>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div className={styles.glassCard} variants={cardVariant}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>Database Layer</span>
                <div className={styles.cardIcon}>
                  <Database size={18} color="#fff" />
                </div>
              </div>
              <div>
                <div className={styles.cardMain}>Aurora & Dynamo</div>
                <div className={styles.cardSub}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <CircleDashed size={24} color="#fff" />
                    <span>Hybrid persistent storage</span>
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

export default ArchitecturePage;
