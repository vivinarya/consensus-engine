import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Heart, MessageSquare, Share2, Users, Trash2, Loader2 } from 'lucide-react';

const LAMBDA_URL = "https://6u6a3ub4qmn4qppzc7hdsnflqy0lkold.lambda-url.us-east-1.on.aws/";

const CommunityView = ({ username }) => {
  const [posts, setPosts] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_USER_DATA', username: 'GLOBAL_COMMUNITY', data_type: 'community_feed' })
      });
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        setPosts(data.data);
      }
    } catch (e) {
      console.error("Failed to load community feed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = async () => {
    if (!inputValue.trim() || isPosting) return;
    setIsPosting(true);
    
    const newPost = {
      id: Date.now().toString(),
      avatar: username ? username.charAt(0).toUpperCase() : 'U',
      avatarBg: 'var(--engine-accent)',
      author: username || 'Guest User',
      timestamp: new Date().toLocaleString(),
      content: inputValue,
      likes: 0
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    setInputValue('');

    try {
      await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'SAVE_USER_DATA', 
          username: 'GLOBAL_COMMUNITY', 
          data_type: 'community_feed', 
          payload: updatedPosts 
        })
      });
    } catch (e) {
      console.error("Error saving post:", e);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (postId) => {
    const updatedPosts = posts.filter(p => p.id !== postId);
    setPosts(updatedPosts);
    
    try {
      await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'SAVE_USER_DATA', 
          username: 'GLOBAL_COMMUNITY', 
          data_type: 'community_feed', 
          payload: updatedPosts 
        })
      });
    } catch (e) {
      console.error("Error deleting post:", e);
    }
  };

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
          .community-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
        }
      `}</style>
      <div className="community-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--engine-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'clamp(1.4rem,4vw,2rem)', whiteSpace: 'nowrap' }}>
          <Users size={24} color="var(--engine-accent)" /> Community Feed
        </h1>
      </div>

      <div style={{
          flex: 1,
          backgroundColor: 'var(--engine-panel-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--engine-border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '2rem',
          gap: '2rem'
      }}>
        
        {/* Input Box Card */}
        <div style={{
          backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 10%, transparent)',
          borderRadius: '16px',
          border: '1px solid var(--engine-border)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--engine-accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--engine-text-main)' }}>{username || 'Guest User'}</span>
          </div>

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Share your thoughts with the community..."
            disabled={isPosting}
            style={{
              width: '100%',
              minHeight: '80px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--engine-text-main)',
              fontSize: '1rem',
              resize: 'none',
              fontFamily: 'var(--font-body)',
              opacity: isPosting ? 0.5 : 1
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--engine-border)', paddingTop: '1rem' }}>
            <button
              onClick={handlePost}
              disabled={isPosting || !inputValue.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: isPosting ? 'var(--engine-border)' : 'var(--engine-accent)',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: (isPosting || !inputValue.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!inputValue.trim()) ? 0.5 : 1
              }}
            >
              {isPosting ? <Loader2 size={16} className="spin" /> : <Send size={16} />} 
              Post
            </button>
          </div>
        </div>

        {/* Feed Items */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 size={32} className="spin" color="var(--engine-text-muted)" />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--engine-text-muted)' }}>
            No posts yet. Be the first to share!
          </div>
        ) : (
          posts.map(post => (
            <motion.div
              layout
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--engine-text-muted) 10%, transparent)',
                borderRadius: '16px',
                border: '1px solid var(--engine-border)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: post.avatarBg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}>
                    {post.avatar}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--engine-text-main)', fontSize: '1rem' }}>{post.author}</span>
                    <span style={{ color: 'var(--engine-text-muted)', fontSize: '0.8rem' }}>{post.timestamp}</span>
                  </div>
                </div>

                {/* Delete Button (Only for author) */}
                {post.author === username && (
                  <button 
                    onClick={() => handleDelete(post.id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#ef4444', 
                      cursor: 'pointer',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete Post"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <p style={{ margin: 0, color: 'var(--engine-text-main)', fontSize: '1rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderTop: '1px solid var(--engine-border)', paddingTop: '1rem', color: 'var(--engine-text-muted)' }}>
                <button style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <Heart size={18} /> {post.likes || 0}
                </button>
                <button style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <MessageSquare size={18} /> Comment
                </button>
                <button style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <Share2 size={18} /> Share
                </button>
              </div>
            </motion.div>
          ))
        )}

      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

export default CommunityView;
