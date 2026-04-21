require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const { chatWithLesson, recommendNextLesson, getAIRecommendations } = require('./services/aiService')

/**
 * Article rows per course — matches product copy:
 * JavaScript Basics → JavaScript articles; React Hooks → React articles;
 * Payment Integration → ATM, JazzCash, wallets, etc.; Smart Contracts → blockchain basics;
 * AI Recommender → exactly 50 learning recommendations; Deployment → deployment methods.
 */
function getCourseArticleSeedRows() {
  const rows = []

  // 1 — JavaScript Basics → JavaScript articles
  rows.push(
    [1, 'JavaScript article: how the language runs in the browser', 'Scripts, the event loop, and why JS is single-threaded.', null],
    [1, 'JavaScript article: variables with let, const, and var', 'Block scope, reassignment, and choosing const by default.', null],
    [1, 'JavaScript article: functions and the this keyword', 'Regular vs arrow functions, binding, and call/apply.', null],
    [1, 'JavaScript article: objects, arrays, and JSON', 'Literals, destructuring, spread/rest, and serialising data.', null],
    [1, 'JavaScript article: loops, conditionals, and switch', 'for…of, while, early returns, and readable control flow.', null],
    [1, 'JavaScript article: Promises and async/await', 'Chaining, try/catch with await, and parallel Promise.all.', null],
    [1, 'JavaScript article: ES modules (import / export)', 'Default vs named exports and tree-shaking basics.', null],
    [1, 'JavaScript article: debugging in DevTools', 'Breakpoints, watch expressions, and console techniques.', null]
  )

  // 2 — React Hooks → React articles
  rows.push(
    [2, 'React article: useState for component state', 'Primitive vs object state, lazy init, and functional updates.', null],
    [2, 'React article: useEffect for side effects', 'Dependencies, cleanup for subscriptions, and stale closures.', null],
    [2, 'React article: useMemo and useCallback', 'When to memoise and when it hurts readability.', null],
    [2, 'React article: useRef for DOM and mutable boxes', 'Refs vs state, useImperativeHandle, and focus management.', null],
    [2, 'React article: useContext to avoid prop drilling', 'Providers, splitting contexts, and performance caveats.', null],
    [2, 'React article: useReducer for complex UI flows', 'Dispatch patterns vs many useState calls.', null],
    [2, 'React article: building custom hooks', 'Naming, reuse, and testing hooks in isolation.', null],
    [2, 'React article: rules of hooks (and how to break them by mistake)', 'Call order, conditions, and keys that reset subtree state.', null]
  )

  // 3 — Payment Integration → payment methods (ATM, JazzCash, etc.)
  rows.push(
    [3, 'Payment method: pay through ATM (card / cash deposit)', 'Card-present flows, deposit slips, matching amounts to orders.', null],
    [3, 'Payment method: JazzCash mobile wallet', 'Send money, merchant payments, QR, and SMS confirmations.', null],
    [3, 'Payment method: Easypaisa and similar wallets', 'Mobile account top-up, bill pay, and retail QR checkout.', null],
    [3, 'Payment method: bank transfer (IBFT / account-to-account)', 'Reference IDs, batch settlement, and failed transfer retries.', null],
    [3, 'Payment method: debit / credit cards (online)', 'Hosted fields, 3-D Secure, and PCI scope reduction.', null],
    [3, 'Payment method: in-store QR payments', 'Static vs dynamic QR, expiry, and reconciliation.', null],
    [3, 'Payment method: cash on delivery (COD)', 'Rider proof, partial acceptance, and refund rules.', null],
    [3, 'Payment method: USDC / stablecoin settlement', 'Confirmations, gas, and showing fiat equivalents.', null],
    [3, 'Payment method: international cards via Stripe (or similar)', 'Webhooks, idempotency keys, and dispute handling.', null],
    [3, 'Payment method: reconciling JazzCash, ATM, and cards in one ledger', 'One source of truth per order across channels.', null]
  )

  // 4 — Smart Contracts → blockchain basics
  rows.push(
    [4, 'Blockchain basics: what is a blockchain?', 'Distributed ledger, blocks linked by hash, and immutability.', null],
    [4, 'Blockchain basics: consensus in plain language', 'Why many nodes agree on the next block without one boss.', null],
    [4, 'Blockchain basics: what is a smart contract?', 'Code on-chain, deploy once, deterministic execution.', null],
    [4, 'Blockchain basics: transactions, gas, and fees', 'Signing, broadcasting, confirmations, and fee spikes.', null],
    [4, 'Blockchain basics: wallets, keys, and addresses', 'Seed phrases, never share private keys, hardware wallets.', null],
    [4, 'Blockchain basics: reading chain data vs sending transactions', 'Calls, writes, events (logs), and explorers.', null],
    [4, 'Blockchain basics: EVM and Solidity first steps', 'Contracts, storage layout, and simple patterns.', null],
    [4, 'Blockchain basics: security mindset', 'Reentrancy, access control, and upgrade patterns.', null]
  )

  // 5 — AI Recommender → 50 learning recommendations
  const fiftySummaries = [
    'Spend 20 minutes on JavaScript variables and types before moving on.',
    'Complete a short exercise on functions and scope.',
    'Review closures with one real-world callback example.',
    'Practice this binding with both arrows and regular functions.',
    'Sketch prototypes vs classes on a whiteboard, then code one.',
    'Implement async/await error handling with try/catch.',
    'Fetch JSON from a public API and render it in React.',
    'Add a global error boundary around a small route tree.',
    'Refactor a component to use a custom hook for data loading.',
    'Memoise one expensive child list and measure render counts.',
    'Build a form with controlled inputs and validation messages.',
    'Introduce React Router with two nested routes.',
    'Replace prop drilling with context for theme or locale.',
    'Use useReducer for a multi-step wizard state machine.',
    'Write one unit test for a pure utility function.',
    'Write one integration test for a checkout happy path.',
    'Design a REST endpoint naming scheme for your resources.',
    'Add pagination to a list endpoint and client.',
    'Hash passwords with bcrypt; never store plain text.',
    'Issue and verify JWTs; understand expiry and refresh.',
    'Draw your Git branching model for a two-developer team.',
    'Configure GitHub Actions to run lint and test on PRs.',
    'Containerise the API with Docker and a slim base image.',
    'Externalise secrets with environment variables per stage.',
    'Add structured logging with request IDs.',
    'Define SLOs for API latency and error rate.',
    'Implement rate limiting on a sensitive POST route.',
    'Add Redis caching for a hot read endpoint.',
    'Prototype WebSockets for live notifications.',
    'Improve keyboard navigation on one complex widget.',
    'Audit colour contrast on primary buttons and links.',
    'Lay out a dashboard with CSS Grid instead of floats.',
    'Introduce TypeScript on one module at a time.',
    'Model API inputs with Zod and return typed errors.',
    'Document one OpenAPI path with request/response examples.',
    'Verify Stripe webhook signatures in middleware.',
    'Make purchase flows idempotent with client keys.',
    'Add basic metrics: request count and latency histogram.',
    'Run a tabletop incident exercise for payment failures.',
    'Threat-model one new feature before coding.',
    'Triage OWASP Top 10 items relevant to your stack.',
    'Automate dependency updates with a weekly bot PR.',
    'Follow semver strictly for your internal packages.',
    'Ship a CHANGELOG entry with every user-facing release.',
    'Write a one-page ADR for a major tech decision.',
    'Pair on a bug for one hour with screen sharing.',
    'Time-box debugging: 25 minutes, then ask for help.',
    'Break a large story into three shippable slices.',
    'Refactor duplicated validation into one shared module.',
    'Profile one slow page load with DevTools Performance.'
  ]
  for (let i = 0; i < 50; i++) {
    rows.push([
      5,
      `Learning recommendation ${i + 1} of 50`,
      fiftySummaries[i],
      null
    ])
  }

  // 6 — Deployment → deployment methods
  rows.push(
    [6, 'Deployment method: Vercel (Git-connected)', 'Build command, output dir, preview deployments per branch.', null],
    [6, 'Deployment method: Netlify (continuous deploy)', 'Build hooks, split testing, and edge functions.', null],
    [6, 'Deployment method: GitHub Actions → cloud run / VM', 'Workflow YAML, secrets, and artefact promotion.', null],
    [6, 'Deployment method: Docker image to a registry', 'Tagging semver images and rolling updates.', null],
    [6, 'Deployment method: static hosting (S3 + CDN or similar)', 'Cache headers, invalidation, and HTTPS.', null],
    [6, 'Deployment method: Node on a VPS (systemd + reverse proxy)', 'Nginx, TLS certificates, and process restarts.', null],
    [6, 'Deployment method: blue/green or canary releases', 'Traffic shifting and fast rollback.', null],
    [6, 'Deployment method: environment promotion (dev → staging → prod)', 'Checklists and who approves production.', null]
  )

  return rows
}

const app = express()
const PORT = 5000

app.use(cors())
app.use(bodyParser.json())

// ============ DATABASE SETUP ============
const db = new sqlite3.Database('./learning.db')

// Create tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      balance REAL DEFAULT 5.00,
      total_spent REAL DEFAULT 0,
      streak INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Modules table
  db.run(`
    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY,
      title TEXT,
      price REAL,
      description TEXT
    )
  `)

  // Reading list: articles linked to each course (module)
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      url TEXT,
      FOREIGN KEY (module_id) REFERENCES modules(id)
    )
  `)

  // User progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT,
      module_id INTEGER,
      unlocked BOOLEAN DEFAULT 0,
      completed BOOLEAN DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (module_id) REFERENCES modules(id),
      PRIMARY KEY (user_id, module_id)
    )
  `)

  // Transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      module_id INTEGER,
      type TEXT DEFAULT 'LESSON_PURCHASE',
      amount REAL,
      status TEXT,
      settled_on_arc BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // Backfill schema for older DB files
  db.run(`ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'LESSON_PURCHASE'`, () => { })

  const seedCourseArticles = () => {
    db.run('DELETE FROM articles', (delErr) => {
      if (delErr) return
      const rows = getCourseArticleSeedRows()
      const stmt = db.prepare(
        'INSERT INTO articles (module_id, title, summary, url) VALUES (?, ?, ?, ?)'
      )
      rows.forEach((r) => stmt.run(r))
      stmt.finalize()
    })
  }

  // Insert default modules if not exists
  db.get("SELECT COUNT(*) as count FROM modules", (err, row) => {
    if (err) {
      console.error('modules count failed:', err.message)
      seedCourseArticles()
      return
    }
    if (row && row.count === 0) {
      const modules = [
        [1, "JavaScript Basics", 0.50, "Master variables, functions, and loops"],
        [2, "React Hooks", 0.50, "useState, useEffect, and custom hooks"],
        [3, "Payment Integration", 0.50, "Stripe, USDC, nanopayments"],
        [4, "Smart Contracts", 0.50, "Arc Network, blockchain basics"],
        [5, "AI Recommender", 0.50, "Smart learning suggestions"],
        [6, "Deployment", 0.50, "Vercel, Netlify, production"]
      ]
      modules.forEach(m => {
        db.run("INSERT INTO modules (id, title, price, description) VALUES (?, ?, ?, ?)", m)
      })
    }
    seedCourseArticles()
  })

  // Insert default user if not exists
  db.get("SELECT COUNT(*) as count FROM users WHERE id = 'user123'", (err, row) => {
    if (err || !row || row.count !== 0) return
    db.run("INSERT INTO users (id, name, email, balance, total_spent, streak) VALUES (?, ?, ?, ?, ?, ?)",
      ['user123', 'John Doe', 'john@example.com', 5.00, 1.00, 3])

    db.run("INSERT INTO user_progress (user_id, module_id, unlocked, completed) VALUES (?, ?, ?, ?)", ['user123', 1, 1, 1])
    db.run("INSERT INTO user_progress (user_id, module_id, unlocked, completed) VALUES (?, ?, ?, ?)", ['user123', 2, 1, 0])
    db.run("INSERT INTO user_progress (user_id, module_id, unlocked, completed) VALUES (?, ?, ?, ?)", ['user123', 3, 0, 0])
    db.run("INSERT INTO user_progress (user_id, module_id, unlocked, completed) VALUES (?, ?, ?, ?)", ['user123', 4, 0, 0])
    db.run("INSERT INTO user_progress (user_id, module_id, unlocked, completed) VALUES (?, ?, ?, ?)", ['user123', 5, 0, 0])
    db.run("INSERT INTO user_progress (user_id, module_id, unlocked, completed) VALUES (?, ?, ?, ?)", ['user123', 6, 0, 0])
  })
})

// ============ API ENDPOINTS ============

// Quick health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'learning-api', port: PORT })
})

// Get user data
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params
  db.get("SELECT id, name, balance, total_spent, streak FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(user)
  })
})

// Articles for a course (module)
app.get('/api/modules/:moduleId/articles', (req, res) => {
  const moduleId = parseInt(req.params.moduleId, 10)
  if (!Number.isFinite(moduleId)) {
    return res.status(400).json({ error: 'Invalid module id' })
  }

  db.get('SELECT id, title FROM modules WHERE id = ?', [moduleId], (err, mod) => {
    if (err) return res.status(500).json({ error: err.message })
    if (!mod) return res.status(404).json({ error: 'Module not found' })

    db.all(
      `SELECT id, module_id as moduleId, title, summary, url
       FROM articles WHERE module_id = ? ORDER BY id ASC`,
      [moduleId],
      (aErr, articles) => {
        if (aErr) return res.status(500).json({ error: aErr.message })
        res.json({ module: mod, articles: articles || [] })
      }
    )
  })
})

// Get all modules with user progress
app.get('/api/modules', (req, res) => {
  const { userId } = req.query

  db.all(`
    SELECT m.id, m.title, m.price, m.description,
      COALESCE(up.unlocked, 0) as unlocked,
      COALESCE(up.completed, 0) as completed
    FROM modules m
    LEFT JOIN user_progress up ON m.id = up.module_id AND up.user_id = ?
  `, [userId], (err, modules) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }
    res.json(modules)
  })
})

// Purchase a lesson
app.post('/api/purchase', (req, res) => {
  const { userId, moduleId } = req.body

  db.get("SELECT balance, total_spent FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: "User not found" })
    }

    db.get("SELECT price FROM modules WHERE id = ?", [moduleId], (err, module) => {
      if (err || !module) {
        return res.status(404).json({ error: "Module not found" })
      }

      if (user.balance < module.price) {
        return res.status(400).json({ error: "Insufficient balance" })
      }

      const newBalance = user.balance - module.price
      const transactionId = `tx_${Date.now()}_${moduleId}`

      db.run("UPDATE users SET balance = ?, total_spent = total_spent + ? WHERE id = ?",
        [newBalance, module.price, userId])

      db.run(`INSERT OR REPLACE INTO user_progress (user_id, module_id, unlocked, completed) 
              VALUES (?, ?, 1, COALESCE((SELECT completed FROM user_progress WHERE user_id = ? AND module_id = ?), 0))`,
        [userId, moduleId, userId, moduleId])

      db.run("INSERT INTO transactions (id, user_id, module_id, type, amount, status, settled_on_arc) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [transactionId, userId, moduleId, 'LESSON_PURCHASE', module.price, 'confirmed', 1])

      res.json({
        success: true,
        newBalance: newBalance,
        totalSpent: user.total_spent + module.price,
        transactionId: transactionId,
        settledOnArc: true
      })
    })
  })
})

// AI Chat
app.post('/api/ai/chat', async (req, res) => {
  const { message, lesson } = req.body || {}
  const userId = (req.body && req.body.userId) ? req.body.userId : 'user123'

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Missing 'message' (string)" })
  }

  db.all(`
    SELECT m.id, m.title, m.price, m.description,
      COALESCE(up.unlocked, 0) as unlocked,
      COALESCE(up.completed, 0) as completed
    FROM modules m
    LEFT JOIN user_progress up ON m.id = up.module_id AND up.user_id = ?
    ORDER BY m.id ASC
  `, [userId], async (err, modules) => {
    try {
      const ai = await chatWithLesson({ message, lesson, modules })

      db.get("SELECT balance, total_spent FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: "User not found" })
        }

        const cost = Number(ai?.cost?.totalCostUsd || 0)
        if (user.balance < cost) {
          return res.status(400).json({
            error: "Insufficient balance",
            balance: user.balance,
            cost,
          })
        }

        const newBalance = user.balance - cost
        const transactionId = `tx_ai_${Date.now()}`

        db.run(
          "UPDATE users SET balance = ?, total_spent = total_spent + ? WHERE id = ?",
          [newBalance, cost, userId]
        )

        db.run(
          "INSERT INTO transactions (id, user_id, module_id, type, amount, status, settled_on_arc) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [transactionId, userId, null, 'AI_HELP', cost, 'confirmed', 1]
        )

        res.json({
          success: true,
          message: ai.text,
          model: ai.model,
          usage: ai.usage,
          cost: ai.cost,
          transactionId,
          newBalance,
        })
      })
    } catch (e) {
      const status = e && e.statusCode ? e.statusCode : 500
      res.status(status).json({ error: e.message || 'AI error' })
    }
  })
})

// Complete a lesson
app.post('/api/complete', (req, res) => {
  const { userId, moduleId } = req.body

  db.run(`UPDATE user_progress SET completed = 1, completed_at = CURRENT_TIMESTAMP 
          WHERE user_id = ? AND module_id = ? AND unlocked = 1`,
    [userId, moduleId], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message })
      }

      db.run("UPDATE users SET streak = streak + 1 WHERE id = ?", [userId])

      res.json({
        success: true,
        message: "Lesson completed! +10 XP"
      })
    })
})

// AI Recommendation
app.get('/api/recommend/:userId', (req, res) => {
  const { userId } = req.params

  db.get("SELECT id, name, email, balance, total_spent, streak FROM users WHERE id = ?", [userId], (uErr, user) => {
    if (uErr || !user) {
      return res.status(404).json({ error: "User not found" })
    }

    db.all(`
      SELECT m.id, m.title, m.price, m.description,
        COALESCE(up.unlocked, 0) as unlocked,
        COALESCE(up.completed, 0) as completed
      FROM modules m
      LEFT JOIN user_progress up ON m.id = up.module_id AND up.user_id = ?
      ORDER BY m.id ASC
    `, [userId], async (mErr, modules) => {
      if (mErr) return res.status(500).json({ error: mErr.message })

      db.all(
        `SELECT module_id, unlocked, completed, completed_at FROM user_progress WHERE user_id = ? ORDER BY module_id ASC`,
        [userId],
        async (pErr, progressRows) => {
          if (pErr) return res.status(500).json({ error: pErr.message })

          let aiPick = null
          try {
            aiPick = await recommendNextLesson({ user, modules, progressRows })
          } catch {
            aiPick = null
          }

          if (aiPick && aiPick.moduleId) {
            const picked = modules.find(m => m.id === aiPick.moduleId) || null
            if (picked) {
              return res.json({
                recommendedModule: { id: picked.id, title: picked.title, price: picked.price, description: picked.description },
                reason: aiPick.reason || `Recommended next: "${picked.title}"`,
                ai: true,
              })
            }
          }

          const fallback = modules.find(m => !m.unlocked)
          if (!fallback) {
            return res.json({
              recommendedModule: null,
              reason: "Congratulations! You've completed all lessons!",
              ai: false,
            })
          }

          res.json({
            recommendedModule: { id: fallback.id, title: fallback.title, price: fallback.price, description: fallback.description },
            reason: `Based on your progress, we recommend "${fallback.title}" for $${fallback.price}`,
            ai: false,
          })
        }
      )
    })
  })
})

// Get multiple recommendations
app.get('/api/recommendations', (req, res) => {
  const userId = req.query.userId || req.body.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId parameter" });
  }

  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: "User not found" });

    db.all(`
      SELECT m.id, m.title, m.price, m.description,
        COALESCE(up.unlocked, 0) as unlocked,
        COALESCE(up.completed, 0) as completed
      FROM modules m
      LEFT JOIN user_progress up ON m.id = up.module_id AND up.user_id = ?
      ORDER BY m.id ASC
    `, [userId], async (err, modules) => {
      if (err) return res.status(500).json({ error: err.message });

      try {
        const aiRecs = await getAIRecommendations(user, modules);
        if (aiRecs && aiRecs.recommendations && aiRecs.recommendations.length > 0) {
          const enriched = aiRecs.recommendations.map(r => {
            const mod = modules.find(m => m.title.toLowerCase() === (r.title || '').toLowerCase())
            return {
              lessonId: mod ? mod.id : null,
              title: r.title,
              price: mod ? mod.price : 0.50,
              reason: r.reason,
              priority: r.priority
            }
          }).filter(r => r.lessonId !== null);
          return res.json({ recommendations: enriched });
        }
      } catch (e) {
        console.error("AI Recommendations failed:", e);
      }

      const recommendations = [];
      const uncompleted = modules.filter(m => !m.completed);
      const nextLogical = uncompleted[0];
      if (nextLogical) {
        recommendations.push({
          lessonId: nextLogical.id,
          title: nextLogical.title,
          price: nextLogical.price,
          reason: "Next logical lesson"
        });
      }

      const related = uncompleted.find(m => m.id !== nextLogical?.id);
      if (related) {
        recommendations.push({
          lessonId: related.id,
          title: related.title,
          price: related.price,
          reason: "Related lesson"
        });
      }

      const popular = modules.find(m => m.id !== nextLogical?.id && m.id !== related?.id);
      if (popular) {
        recommendations.push({
          lessonId: popular.id,
          title: popular.title,
          price: popular.price,
          reason: "Popular lesson"
        });
      }

      res.json({ recommendations: recommendations.slice(0, 3) });
    });
  });
});

// Get transaction history
app.get('/api/transactions/:userId', (req, res) => {
  const { userId } = req.params

  db.all(`
    SELECT
      t.*,
      COALESCE(m.title, t.type) as module_title
    FROM transactions t
    LEFT JOIN modules m ON t.module_id = m.id
    WHERE t.user_id = ?
    ORDER BY t.timestamp DESC
  `, [userId], (err, transactions) => {
    res.json(transactions || [])
  })
})

// Get user statistics
app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params

  db.get(`
    SELECT 
      COUNT(CASE WHEN completed = 1 THEN 1 END) as completed_count,
      COUNT(CASE WHEN unlocked = 1 THEN 1 END) as unlocked_count,
      ROUND(AVG(CASE WHEN completed = 1 THEN (julianday('now') - julianday(completed_at)) END)) as avg_completion_days
    FROM user_progress
    WHERE user_id = ?
  `, [userId], (err, stats) => {
    res.json(stats || { completed_count: 0, unlocked_count: 0, avg_completion_days: 0 })
  })
})

// Root route
app.get('/', (_req, res) => {
  res.json({ 
    name: 'Pay-As-You-Learn Academy API',
    status: 'running',
    version: '1.0.0',
    endpoints: [
      'GET  /api/health',
      'GET  /api/user/:userId',
      'GET  /api/modules?userId=xxx',
      'GET  /api/modules/:moduleId/articles',
      'POST /api/purchase',
      'POST /api/complete',
      'POST /api/ai/chat',
      'GET  /api/recommend/:userId',
      'GET  /api/recommendations?userId=xxx',
      'GET  /api/transactions/:userId',
      'GET  /api/stats/:userId'
    ]
  })
})

// Start server
app.listen(PORT, () => {
  console.log('🚀 Pay-As-You-Learn Academy Backend')
  console.log('📍 Running at http://localhost:' + PORT)
  console.log('📚 Database: SQLite (learning.db)')
  console.log('')
  console.log('📋 Available API Endpoints:')
  console.log('   GET  /api/health')
  console.log('   GET  /api/user/:userId')
  console.log('   GET  /api/modules?userId=xxx')
  console.log('   GET  /api/modules/:moduleId/articles')
  console.log('   POST /api/purchase')
  console.log('   POST /api/complete')
  console.log('   POST /api/ai/chat')
  console.log('   GET  /api/recommend/:userId')
  console.log('   GET  /api/recommendations?userId=xxx')
  console.log('   GET  /api/transactions/:userId')
  console.log('   GET  /api/stats/:userId')
  console.log('')
  console.log('🎯 Frontend should run on http://localhost:5173')
})