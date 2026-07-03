import { useState, useEffect } from 'react'
import type { SiteReport, RiskFlag } from '../Types'
import puter from '@heyputer/puter.js'

// ─── Puter initialization with auth persistence ────────────────────────────────

let puterInitialized = false
let puterAuthToken: string | null = null

async function initializePuter() {
  if (puterInitialized) return

  // Try to restore auth token from storage
  puterAuthToken = await new Promise((resolve) => {
    chrome.storage.sync.get('puterAuthToken', (result) => {
      resolve((result.puterAuthToken as string | undefined) ?? null)
    })
  })

  // Initialize puter
  try {
    await (puter as any).auth.init()

    // Try to sign in with stored token if available
    if (puterAuthToken) {
      try {
        // If token exists, validate it
        const user = await (puter as any).auth.getUser?.()
        if (user) {
          console.log('[Securefy] Puter authenticated with stored session')
        }
      } catch {
        // Token expired, clear it
        puterAuthToken = null
        await chrome.storage.sync.remove('puterAuthToken')
      }
    }

    // Listen for auth changes and save token
    (puter as any).on?.('auth.login', async () => {
      try {
        const user = await (puter as any).auth.getUser?.()
        if (user) {
          puterAuthToken = user.token || 'authenticated'
          await chrome.storage.sync.set({ puterAuthToken })
          console.log('[Securefy] Puter session saved')
        }
      } catch (err) {
        console.error('[Securefy] Failed to save puter session:', err)
      }
    })

      (puter as any).on?.('auth.logout', async () => {
        puterAuthToken = null
        await chrome.storage.sync.remove('puterAuthToken')
        console.log('[Securefy] Puter session cleared')
      })

    puterInitialized = true
  } catch (err) {
    console.error('[Securefy] Failed to initialize Puter:', err)
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<RiskFlag['category'], { label: string; emoji: string }> = {
  phishing: { label: 'Phishing / Scam', emoji: '🎣' },
  malware: { label: 'Malware', emoji: '🦠' },
  impersonation: { label: 'Impersonation', emoji: '🎭' },
  fake_news: { label: 'Fake News', emoji: '📰' },
  ponzi: { label: 'Ponzi / Investment Fraud', emoji: '💸' },
}

const RISK_CONFIG = {
  safe: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', emoji: '✅', label: 'Safe' },
  suspicious: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '⚠️', label: 'Suspicious' },
  dangerous: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '🚨', label: 'Dangerous' },
}

// ─── Puter AI call ────────────────────────────────────────────────────────────

async function scanWithPuter(url: string, domain: string): Promise<Partial<SiteReport>> {
  // Ensure puter is initialized before making calls
  await initializePuter()

  const prompt = `You are a cybersecurity expert. Analyze this website URL and return ONLY a JSON object. No markdown, no explanation, no code fences.

URL: ${url}
Domain: ${domain}

Evaluate for these 5 risk categories:
1. phishing — credential theft, fake login pages, scam emails
2. malware — delivers malicious scripts or downloads
3. impersonation — pretends to be a legitimate brand or service
4. fake_news — spreads disinformation or manipulated content
5. ponzi — fake investment, crypto fraud, or pyramid schemes

Scoring guide:
- 0-30: safe
- 31-60: suspicious
- 61-100: dangerous

Return ONLY this JSON:
{
  "riskLevel": "safe" | "suspicious" | "dangerous",
  "riskScore": <number 0-100>,
  "summary": "<one sentence finding>",
  "flags": [
    { "category": "phishing", "detected": <boolean>, "reasoning": "<explanation>" },
    { "category": "malware", "detected": <boolean>, "reasoning": "<explanation>" },
    { "category": "impersonation", "detected": <boolean>, "reasoning": "<explanation>" },
    { "category": "fake_news", "detected": <boolean>, "reasoning": "<explanation>" },
    { "category": "ponzi", "detected": <boolean>, "reasoning": "<explanation>" }
  ]
}`

  const response = await puter.ai.chat(prompt)
  const content = response?.message?.content as string | Array<unknown> | undefined
  const raw = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map(part => typeof part === 'string' ? part : '').join('')
      : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 36
  const stroke = 7
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={radius * 2} height={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={radius} cy={radius} r={normalizedRadius}
        fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
      <circle cx={radius} cy={radius} r={normalizedRadius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

// ─── Flag Card ────────────────────────────────────────────────────────────────

function FlagCard({ flag }: { flag: RiskFlag }) {
  const [open, setOpen] = useState(false)
  const meta = CATEGORY_LABELS[flag.category]

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: flag.detected ? 'var(--flag-danger-bg)' : 'var(--flag-safe-bg)',
        border: `1.5px solid ${flag.detected ? 'var(--flag-danger-border)' : 'var(--flag-safe-border)'}`,
        borderRadius: 10, padding: '10px 12px',
        marginBottom: 8, cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{meta.emoji}</span>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
            {meta.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
            borderRadius: 20, color: '#fff',
            background: flag.detected ? '#dc2626' : '#16a34a',
          }}>
            {flag.detected ? 'DETECTED' : 'CLEAR'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {flag.reasoning}
        </p>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [report, setReport] = useState<SiteReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiStatus, setAiStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  useEffect(() => {
    chrome.storage.local.get<{ lastReport?: SiteReport | null; currentUrl?: string | null }>(
      ['lastReport', 'currentUrl'],
      async (result) => {
        const baseReport = result.lastReport ?? null
        const currentUrl = result.currentUrl ?? null

        // Show rule-based report immediately
        setReport(baseReport)
        setLoading(false)

        // Initialize puter with saved authentication
        await initializePuter()

        // Then upgrade with Puter AI
        if (currentUrl && window.puter) {
          try {
            setAiStatus('scanning')
            const domain = new URL(currentUrl).hostname
            const aiResult = await scanWithPuter(currentUrl, domain)

            const enhanced: SiteReport = {
              ...(baseReport as SiteReport),
              ...aiResult,
              url: currentUrl,
              domain,
              scannedAt: Date.now(),
              aiModel: 'puter.js (free AI)',
            }

            // Save enhanced report
            await chrome.storage.local.set({
              [`report:${domain}`]: { ...enhanced, cachedAt: Date.now() },
              lastReport: enhanced,
            })

            setReport(enhanced)
            setAiStatus('done')

            // Fire notification if AI finds it risky and rule-based missed it
            if (enhanced.riskLevel !== 'safe' && baseReport?.riskLevel === 'safe') {
              chrome.notifications.create(`ai-scan-${Date.now()}`, {
                type: 'basic',
                iconUrl: 'icons/icon32.png',
                title: enhanced.riskLevel === 'dangerous' ? '🔴 Dangerous site detected' : '🟡 Suspicious site detected',
                message: enhanced.summary,
                priority: enhanced.riskLevel === 'dangerous' ? 2 : 1,
              })
            }
          } catch (err) {
            console.error('[URL Guardian] Puter AI failed:', err)
            setAiStatus('error')
          }
        }
      })
  }, [])

  const risk = report ? RISK_CONFIG[report.riskLevel] : null
  const detectedCount = report?.flags.filter(f => f.detected).length ?? 0

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: ${isDark ? '#1a1a2e' : '#f8f9ff'};
          color: ${isDark ? '#e8e8f0' : '#1a1a2e'};
          width: 340px;
        }
        :root {
          --text-primary:       ${isDark ? '#f0f0ff' : '#1a1a2e'};
          --text-secondary:     ${isDark ? '#a0a0c0' : '#444466'};
          --text-muted:         ${isDark ? '#6060a0' : '#8888aa'};
          --card-bg:            ${isDark ? '#16213e' : '#ffffff'};
          --card-border:        ${isDark ? '#2a2a5a' : '#e8e8f8'};
          --ring-track:         ${isDark ? '#2a2a4a' : '#e8e8f8'};
          --flag-danger-bg:     ${isDark ? '#2a1a1a' : '#fff5f5'};
          --flag-danger-border: ${isDark ? '#5a2020' : '#fecaca'};
          --flag-safe-bg:       ${isDark ? '#1a2a1a' : '#f0fff4'};
          --flag-safe-border:   ${isDark ? '#205a20' : '#bbf7d0'};
          --divider:            ${isDark ? '#2a2a4a' : '#e8e8f8'};
        }
      `}</style>

      <div style={{ padding: 16 }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
              URL Guardian
            </span>
          </div>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 18, opacity: 0.6, padding: 4,
            }}
            title="Settings"
          >⚙️</button>
        </div>

        {/* AI scanning banner */}
        {aiStatus === 'scanning' && (
          <div style={{
            background: '#eff6ff', border: '1.5px solid #bfdbfe',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            fontSize: 12, color: '#1d4ed8', textAlign: 'center',
          }}>
            🤖 AI is analyzing this site...
          </div>
        )}

        {aiStatus === 'error' && (
          <div style={{
            background: '#fef9c3', border: '1.5px solid #fde68a',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            fontSize: 12, color: '#92400e', textAlign: 'center',
          }}>
            ⚠️ AI scan failed — showing rule-based results
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 13 }}>Scanning...</div>
          </div>
        )}

        {/* No report */}
        {!loading && !report && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌐</div>
            <div style={{ fontSize: 13 }}>Visit a website to see its risk report.</div>
          </div>
        )}

        {/* Report */}
        {!loading && report && risk && (
          <>
            {/* Risk banner */}
            <div style={{
              background: risk.bg, border: `2px solid ${risk.border}`,
              borderRadius: 14, padding: '14px 16px',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <ScoreRing score={report.riskScore} color={risk.color} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: risk.color }}>
                    {report.riskScore}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{risk.emoji}</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: risk.color }}>
                    {risk.label}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {report.domain}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: 'var(--card-bg)', border: '1.5px solid var(--card-border)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 14,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 5,
              }}>
                {aiStatus === 'done' ? '🤖 AI Summary' : '📋 Summary'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {report.summary}
              </p>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Risk Score', value: `${report.riskScore}/100`, color: risk.color },
                { label: 'Threats Found', value: `${detectedCount}/5`, color: detectedCount > 0 ? '#dc2626' : '#16a34a' },
              ].map(stat => (
                <div key={stat.label} style={{
                  flex: 1, background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: 10, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Flags */}
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8,
            }}>
              Risk Categories — tap to expand
            </div>
            {report.flags.map(flag => (
              <FlagCard key={flag.category} flag={flag} />
            ))}

            {/* Footer */}
            <div style={{
              marginTop: 12, paddingTop: 10,
              borderTop: '1px solid var(--divider)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                🤖 {report.aiModel}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {new Date(report.scannedAt).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  )
}