import { useMemo, useState, useEffect } from 'react'
import './App.css'
import {
  aiChat,
  completeLesson,
  getCourseArticles,
  getModules,
  getRecommendation,
  getRecommendations,
  getTransactions,
  getUser,
  purchaseLesson,
} from './api.js'

function App() {
  const USER_ID = 'user123'

  const [modules, setModules] = useState([])
  const [transactions, setTransactions] = useState([])

  const [balance, setBalance] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [streak, setStreak] = useState(0)
  const [purchasing, setPurchasing] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [notification, setNotification] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiReason, setAiReason] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [recsLoading, setRecsLoading] = useState(true)

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLesson, setChatLesson] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionCostUsd, setSessionCostUsd] = useState(0)
  const [lastAiCostUsd, setLastAiCostUsd] = useState(null)

  const [courseModal, setCourseModal] = useState(null)
  const [courseArticles, setCourseArticles] = useState([])
  const [articlesLoading, setArticlesLoading] = useState(false)

  const totalModules = modules.length
  const completedModules = modules.filter(m => m.completed).length
  const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0

  const unlockedModules = useMemo(() => modules.filter(m => m.unlocked), [modules])

  const refreshAll = async () => {
    setRecsLoading(true)
    try {
      const [user, moduleRows, rec, txs, multiRecs] = await Promise.all([
        getUser(USER_ID),
        getModules(USER_ID),
        getRecommendation(USER_ID),
        getTransactions(USER_ID),
        getRecommendations(USER_ID),
      ])

      setBalance(Number(user.balance || 0))
      setTotalSpent(Number(user.total_spent || 0))
      setStreak(Number(user.streak || 0))
      setModules(moduleRows || [])
      setTransactions(txs || [])

      setAiSuggestion(rec && rec.recommendedModule ? rec.recommendedModule : null)
      setAiReason((rec && rec.reason) ? rec.reason : '')
      setRecommendations(multiRecs?.recommendations || [])
    } finally {
      setRecsLoading(false)
    }
  }

  useEffect(() => {
    refreshAll().catch((e) => {
      setNotification({ message: e.message || 'Failed to load data', type: 'info' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showNotification = (message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handlePurchase = async (moduleId) => {
    setPurchasing(moduleId)

    try {
      const result = await purchaseLesson({ userId: USER_ID, moduleId })
      await refreshAll()

      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      showNotification(
        `✅ $${Number(result?.totalSpent ? (result.totalSpent - totalSpent) : 0.5).toFixed(2)} USDC paid! Lesson unlocked on Arc Network in < 1 second`,
        'success'
      )
    } catch (e) {
      showNotification(e.message || 'Purchase failed', 'info')
    } finally {
      setPurchasing(null)
    }
  }

  const openCourseArticles = async ({ moduleId, title }) => {
    if (!moduleId) return
    setCourseModal({ id: moduleId, title })
    setCourseArticles([])
    setArticlesLoading(true)
    try {
      const data = await getCourseArticles(moduleId)
      setCourseArticles(data?.articles || [])
    } catch (e) {
      showNotification(e.message || 'Could not load articles', 'info')
      setCourseModal(null)
    } finally {
      setArticlesLoading(false)
    }
  }

  const closeCourseModal = () => {
    setCourseModal(null)
    setCourseArticles([])
  }

  const handleComplete = async (moduleId) => {
    try {
      await completeLesson({ userId: USER_ID, moduleId })
      await refreshAll()
      showNotification('🎉 Amazing! +10 XP earned!', 'info')
    } catch (e) {
      showNotification(e.message || 'Complete failed', 'info')
    }
  }

  const handleSendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || sending) return

    const userMsg = { id: `m_${Date.now()}_u`, role: 'user', content: msg }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setSending(true)
    setLastAiCostUsd(null)

    try {
      const lessonContext = chatLesson || (aiSuggestion ? aiSuggestion.title : '')
      const result = await aiChat({ userId: USER_ID, message: msg, lesson: lessonContext })

      const costUsd = Number(result?.cost?.totalCostUsd || 0)
      const assistantMsg = {
        id: `m_${Date.now()}_a`,
        role: 'assistant',
        content: result?.message || '',
        costUsd,
        tokens: result?.usage?.totalTokens,
      }

      setChatMessages(prev => [...prev, assistantMsg])
      setSessionCostUsd(prev => Number((prev + costUsd).toFixed(6)))
      setLastAiCostUsd(costUsd)

      await refreshAll()

      showNotification(`⚡ AI help delivered. -$${costUsd.toFixed(4)} deducted automatically`, 'success')
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { id: `m_${Date.now()}_e`, role: 'assistant', content: `Error: ${e.message || 'AI request failed'}`, costUsd: 0 },
      ])
      showNotification(e.message || 'AI request failed', 'info')
    } finally {
      setSending(false)
    }
  }

  const Confetti = () => {
    if (!showConfetti) return null
    const confettiItems = []
    for (let i = 0; i < 100; i++) {
      confettiItems.push(
        <div 
          key={i} 
          className="confetti" 
          style={{
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 2 + 's',
            backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
            width: Math.random() * 8 + 4 + 'px',
            height: Math.random() * 8 + 4 + 'px'
          }}
        />
      )
    }
    return <div className="confetti-container">{confettiItems}</div>
  }

  return (
    <div className="container">
      <Confetti />
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-icon">{notification.type === 'success' ? '✅' : '🎉'}</span>
          {notification.message}
        </div>
      )}

      {courseModal && (
        <div
          className="course-modal-backdrop"
          role="presentation"
          onClick={closeCourseModal}
        >
          <div
            className="course-modal glass"
            role="dialog"
            aria-labelledby="course-modal-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="course-modal-close" onClick={closeCourseModal} aria-label="Close">
              ×
            </button>
            <h2 id="course-modal-title" className="course-modal-title">{courseModal.title}</h2>
            <p className="course-modal-sub">Articles for this lesson (click the lesson title or “Articles” on the card)</p>
            <div className="course-article-list">
              {articlesLoading ? (
                <div className="course-articles-loading">
                  <span className="loading-spinner-small" style={{ display: 'inline-block', marginRight: '10px', borderColor: 'var(--accent)' }} />
                  Loading articles…
                </div>
              ) : courseArticles.length === 0 ? (
                <p className="course-articles-empty">No articles linked to this course yet.</p>
              ) : (
                courseArticles.map((a) => (
                  <article key={a.id} className="course-article-card">
                    <h3 className="course-article-title">{a.title}</h3>
                    {a.summary ? <p className="course-article-summary">{a.summary}</p> : null}
                    {a.url ? (
                      <a className="course-article-link" href={a.url} target="_blank" rel="noreferrer">
                        Read more →
                      </a>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="gradient-text">Pay-As-You-Learn Academy</h1>
        <p className="tagline">Learn exactly what you need, pay only for what you use</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">Wallet Balance</span>
            <span className="stat-value">${balance.toFixed(2)} <span className="stat-sub">USDC</span></span>
          </div>
          <div className="stat-badge">Arc Network</div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <span className="stat-label">Total Spent</span>
            <span className="stat-value">${totalSpent.toFixed(2)}</span>
          </div>
          <div className="stat-badge">Lifetime</div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <span className="stat-label">Learning Streak</span>
            <span className="stat-value">{streak} <span className="stat-sub">days</span></span>
          </div>
          <div className="stat-badge">Keep going!</div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <span className="stat-label">Settlement</span>
            <span className="stat-value">&lt; 1 <span className="stat-sub">second</span></span>
          </div>
          <div className="stat-badge">Arc Network</div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <span className="stat-label">AI Session Spend</span>
            <span className="stat-value">${sessionCostUsd.toFixed(4)}</span>
          </div>
          <div className="stat-badge">Live</div>
        </div>
      </div>

      {/* AI Smart Recommender */}
      {aiSuggestion && (
        <div className="ai-card glow">
          <div className="ai-icon">🤖</div>
          <div className="ai-content">
            <span className="ai-badge">✨ AI RECOMMENDATION</span>
            <h3 className="ai-lesson-headline">
              Based on your progress, learn{' '}
              <button
                type="button"
                className="lesson-title-link lesson-title-link--inline"
                onClick={() => openCourseArticles({ moduleId: aiSuggestion.id, title: aiSuggestion.title })}
              >
                {aiSuggestion.title}
              </button>{' '}
              next!
            </h3>
            <p>{aiReason || 'Personalized next-lesson recommendation.'}</p>
            <div className="ai-price-row">
              <span className="ai-price">${aiSuggestion.price} USDC</span>
              <div className="ai-actions-row">
                <button
                  type="button"
                  className="btn-course"
                  onClick={() => openCourseArticles({ moduleId: aiSuggestion.id, title: aiSuggestion.title })}
                >
                  Articles
                </button>
                <button
                  type="button"
                  className="btn-ai"
                  onClick={() => handlePurchase(aiSuggestion.id)}
                  disabled={purchasing === aiSuggestion.id}
                >
                  {purchasing === aiSuggestion.id ? 'Processing...' : '🎯 Unlock Recommended'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tutor Chat + Real-time Cost Tracking */}
      <div className="chat-card glass">
        <div className="chat-header">
          <div>
            <h2>💬 AI Tutor Chat</h2>
            <p className="chat-subtitle">Ask questions, get answers, and pay per response automatically.</p>
          </div>
          <div className="chat-metrics">
            <div className="chat-metric">
              <span className="chat-metric-label">Last cost</span>
              <span className="chat-metric-value">{lastAiCostUsd == null ? '—' : `$${lastAiCostUsd.toFixed(4)}`}</span>
            </div>
            <div className="chat-metric">
              <span className="chat-metric-label">Session total</span>
              <span className="chat-metric-value">${sessionCostUsd.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div className="chat-controls">
          <label className="chat-label">
            Lesson context (optional)
            <select
              className="chat-select"
              value={chatLesson}
              onChange={(e) => setChatLesson(e.target.value)}
            >
              <option value="">Auto (recommended lesson)</option>
              {unlockedModules.map(m => (
                <option key={m.id} value={m.title}>{m.title}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="chat-history">
          {chatMessages.length === 0 ? (
            <div className="chat-empty">
              Try: “Explain useEffect cleanup” or “Help me integrate Stripe webhooks.”
            </div>
          ) : (
            chatMessages.map(m => (
              <div key={m.id} className={`chat-message ${m.role}`}>
                <div className="chat-bubble">
                  <div className="chat-role">{m.role === 'user' ? 'You' : 'AI'}</div>
                  <div className="chat-text">{m.content}</div>
                  {m.role === 'assistant' && (
                    <div className="chat-meta">
                      <span>Cost: ${Number(m.costUsd || 0).toFixed(4)}</span>
                      {m.tokens ? <span>• Tokens: {m.tokens}</span> : null}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Type your question…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendChat()
            }}
            disabled={sending}
          />
          <button className="chat-send" onClick={handleSendChat} disabled={sending || !chatInput.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <div className="chat-footnote">
          Each AI response triggers an <strong>AI_HELP</strong> transaction and deducts the cost instantly from your wallet.
        </div>
      </div>

      {/* Progress Section - Simple Bar Version */}
      <div className="progress-section glass">
        <div className="progress-header">
          <h3>Your Learning Journey</h3>
          <span className="xp-badge">🎓 {Math.floor(progress * 10)} XP Earned</span>
        </div>
        
        <div className="simple-progress-container">
          <div className="simple-progress-label">
            <span>{Math.round(progress)}% Complete</span>
            <span>{completedModules} of {totalModules} lessons mastered</span>
          </div>
          <div className="simple-progress-bar">
            <div className="simple-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        
        <div className="progress-stats">
          <span>✅ {completedModules} of {totalModules} lessons mastered</span>
          <span>⚡ Avg. completion time: 12 min</span>
        </div>
      </div>

      {/* Recommended for You Section */}
      {(recommendations.length > 0 || recsLoading) && (
        <div className="section">
          <div className="section-header">
            <h2>🎯 Recommended for You</h2>
            <span className="section-count">AI Curated</span>
          </div>
          {recsLoading ? (
            <div className="loading-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
              <span className="loading-spinner-small" style={{ display: 'inline-block', marginRight: '10px', borderColor: 'var(--accent)' }}></span>
              Analyzing your progress to find the best next lessons...
            </div>
          ) : (
            <div className="lessons-grid">
              {recommendations.map((rec, index) => (
                <div key={rec.lessonId || index} className={`lesson-card ${index === 0 ? 'glow' : 'locked-card'}`} style={index === 0 ? { border: '2px solid var(--accent)' } : {}}>
                  {index === 0 && <div className="card-badge" style={{ backgroundColor: 'var(--accent)', color: 'white', fontWeight: 'bold' }}>🌟 BEST NEXT STEP</div>}
                  <div className="price-tag">💎 ${rec.price} USDC</div>
                  <h3 className="lesson-card-heading">
                    <button
                      type="button"
                      className="lesson-title-link"
                      disabled={!rec.lessonId}
                      onClick={() => openCourseArticles({ moduleId: rec.lessonId, title: rec.title })}
                    >
                      {rec.title}
                    </button>
                  </h3>
                  <p className="lesson-description" style={{ fontStyle: 'italic', color: 'var(--text-light)' }}>
                    "{rec.reason}"
                  </p>
                  <div className="micro-info">
                    <span>⚡ Micro-transaction</span>
                    <span>&lt; 1 sec settlement</span>
                  </div>
                  <div className="lesson-actions">
                    <button
                      type="button"
                      className="btn-course"
                      disabled={!rec.lessonId}
                      onClick={() => openCourseArticles({ moduleId: rec.lessonId, title: rec.title })}
                    >
                      Articles
                    </button>
                    <button
                      type="button"
                      className="btn-buy"
                      style={index === 0 ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' } : {}}
                      onClick={() => handlePurchase(rec.lessonId)}
                      disabled={purchasing === rec.lessonId}
                    >
                      {purchasing === rec.lessonId ? (
                        <span className="loading-spinner-small"></span>
                      ) : (
                        <span>🔓 Unlock Now - ${rec.price}</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchased Lessons - Your Library */}
      <div className="section">
        <div className="section-header">
          <h2>📚 Your Library</h2>
          <span className="section-count">{modules.filter(m => m.unlocked).length} unlocked</span>
        </div>
        
        <div className="lessons-grid">
          {modules.filter(m => m.unlocked).map((module, index) => (
            <div key={module.id} className={`lesson-card ${module.completed ? 'completed-card' : 'purchased-card'}`}>
              <div className="card-badge">{module.completed ? '✓ COMPLETED' : '📖 UNLOCKED'}</div>
              <h3 className="lesson-card-heading">
                <button
                  type="button"
                  className="lesson-title-link"
                  onClick={() => openCourseArticles({ moduleId: module.id, title: module.title })}
                >
                  {module.title}
                </button>
              </h3>
              <p className="lesson-description">{module.description}</p>
              <div className="lesson-actions lesson-actions--tight">
                <button
                  type="button"
                  className="btn-course"
                  onClick={() => openCourseArticles({ moduleId: module.id, title: module.title })}
                >
                  Articles
                </button>
              </div>
              <div className="card-footer">
                {!module.completed ? (
                  <button type="button" className="btn-complete" onClick={() => handleComplete(module.id)}>
                    <span>✅</span> Mark Complete
                  </button>
                ) : (
                  <div className="completion-badge">
                    <span>🏆</span> Mastered
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace - Available Lessons */}
      <div className="section">
        <div className="section-header">
          <h2>🛒 Marketplace</h2>
          <span className="section-count">{modules.filter(m => !m.unlocked).length} available</span>
        </div>
        
        <div className="lessons-grid">
          {modules.filter(m => !m.unlocked).map((module, index) => (
            <div key={module.id} className="lesson-card locked-card">
              <div className="price-tag">💎 ${module.price} USDC</div>
              <h3 className="lesson-card-heading">
                <button
                  type="button"
                  className="lesson-title-link"
                  onClick={() => openCourseArticles({ moduleId: module.id, title: module.title })}
                >
                  {module.title}
                </button>
              </h3>
              <p className="lesson-description">{module.description}</p>
              <div className="micro-info">
                <span>⚡ Micro-transaction</span>
                <span>&lt; 1 sec settlement</span>
              </div>
              <div className="lesson-actions">
                <button
                  type="button"
                  className="btn-course"
                  onClick={() => openCourseArticles({ moduleId: module.id, title: module.title })}
                >
                  Articles
                </button>
                <button
                  type="button"
                  className="btn-buy"
                  onClick={() => handlePurchase(module.id)}
                  disabled={purchasing === module.id}
                >
                  {purchasing === module.id ? (
                    <span className="loading-spinner-small"></span>
                  ) : (
                    <span>🔓 Unlock for ${module.price}</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction / History */}
      <div className="section">
        <div className="section-header">
          <h2>🧾 Transaction History</h2>
          <span className="section-count">{transactions.length} total</span>
        </div>

        <div className="tx-list glass">
          {transactions.length === 0 ? (
            <div className="tx-empty">No transactions yet.</div>
          ) : (
            transactions.slice(0, 12).map(tx => (
              <div key={tx.id} className="tx-row">
                <div className="tx-left">
                  <div className="tx-title">{tx.type === 'AI_HELP' ? 'AI Help' : (tx.module_title || 'Lesson')}</div>
                  <div className="tx-sub">
                    <span className="tx-type">{tx.type}</span>
                    <span className="tx-dot">•</span>
                    <span className="tx-time">{tx.timestamp}</span>
                  </div>
                </div>
                <div className="tx-right">
                  <div className="tx-amount">-${Number(tx.amount || 0).toFixed(4)}</div>
                  <div className="tx-status">{tx.settled_on_arc ? 'Settled' : tx.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reset Demo Button */}
      <button className="reset-btn" onClick={() => window.location.reload()}>
        🔄 Reset Demo
      </button>

      {/* Impact Footer */}
      <div className="impact-footer glass">
        <div className="impact-quote">
          <span className="quote-mark">"</span>
          <p>Why pay $2000 for a degree when you can pay $0.50 for the exact skill you need?</p>
        </div>
        <div className="arc-badge">
          <span>⚡ Powered by Arc Network</span>
          <span>•</span>
          <span>USDC Nano-payments</span>
          <span>•</span>
          <span>&lt; 1 second settlement</span>
        </div>
      </div>
    </div>
  )
}

export default App