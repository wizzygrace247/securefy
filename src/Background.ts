/// <reference types="chrome" />
import type { SiteReport, RiskFlag } from './Types';

// ─── Listen for messages from content.ts ─────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SCAN_URL') {
    handleScan(msg.url);
  }
});

// ─── Main scan handler ────────────────────────────────────────────────────────

async function handleScan(url: string) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  const domain = new URL(url).hostname;

  // Check cache first
  const cached = await getCachedReport(domain);
  if (cached) {
    await chrome.storage.local.set({ lastReport: cached, currentUrl: url });
    return;
  }

  // Store current URL for popup to pick up and scan
  await chrome.storage.local.set({ currentUrl: url, lastReport: null });

  // Run rule based scan immediately as baseline
  const report = ruleBasedScan(url, domain);
  await chrome.storage.local.set({
    [`report:${domain}`]: { ...report, cachedAt: Date.now() },
    lastReport: report,
  });

  // Notify if rule based scan already flags it
  if (report.riskLevel !== 'safe') {
    fireNotification(report);
  }
}

// ─── Rule based scanner ───────────────────────────────────────────────────────

function ruleBasedScan(url: string, domain: string): SiteReport {
  const flags: RiskFlag[] = [];
  let riskScore = 0;
  const reasons: string[] = [];

  const parsed = new URL(url);
  const path = parsed.pathname.toLowerCase();
  const fullText = (domain + path).toLowerCase();

  // Phishing signals
  const phishingKeywords = [
    'login', 'signin', 'verify', 'secure', 'account',
    'update', 'confirm', 'banking', 'password', 'credential',
  ];
  const phishingHits = phishingKeywords.filter(k => fullText.includes(k));
  const phishingDetected =
    phishingHits.length >= 2 ||
    (domain.includes('-') && phishingHits.length >= 1);
  if (phishingDetected) { riskScore += 30; reasons.push('phishing keywords detected'); }
  flags.push({
    category: 'phishing',
    detected: phishingDetected,
    reasoning: phishingDetected
      ? `Found suspicious keywords: ${phishingHits.join(', ')}`
      : 'No phishing signals found.',
  });

  // Malware signals
  const malwareKeywords = [
    'download', 'free', 'crack', 'keygen', 'patch',
    'warez', 'nulled', 'torrent', 'pirate',
  ];
  const malwareHits = malwareKeywords.filter(k => fullText.includes(k));
  const malwareDetected = malwareHits.length >= 2;
  if (malwareDetected) { riskScore += 25; reasons.push('malware keywords detected'); }
  flags.push({
    category: 'malware',
    detected: malwareDetected,
    reasoning: malwareDetected
      ? `Found suspicious keywords: ${malwareHits.join(', ')}`
      : 'No malware signals found.',
  });

  // Impersonation signals
  const brands = [
    'paypal', 'apple', 'microsoft', 'google', 'amazon',
    'netflix', 'facebook', 'instagram', 'twitter', 'whatsapp',
    'youtube', 'tiktok', 'snapchat', 'linkedin',
  ];
  const trustedDomains: Record<string, string> = {
    paypal: 'paypal.com', apple: 'apple.com', microsoft: 'microsoft.com',
    google: 'google.com', amazon: 'amazon.com', netflix: 'netflix.com',
    facebook: 'facebook.com', instagram: 'instagram.com', twitter: 'twitter.com',
    whatsapp: 'whatsapp.com', youtube: 'youtube.com', tiktok: 'tiktok.com',
    snapchat: 'snapchat.com', linkedin: 'linkedin.com',
  };
  const impersonatedBrand = brands.find(
    b => domain.includes(b) && !domain.endsWith(trustedDomains[b] ?? `${b}.com`)
  );
  const impersonationDetected = !!impersonatedBrand;
  if (impersonationDetected) { riskScore += 40; reasons.push(`impersonating ${impersonatedBrand}`); }
  flags.push({
    category: 'impersonation',
    detected: impersonationDetected,
    reasoning: impersonationDetected
      ? `Domain contains "${impersonatedBrand}" but is not the official site.`
      : 'No impersonation signals found.',
  });

  // Fake news signals
  const fakeNewsKeywords = [
    'fakenews', 'conspiracy', 'truth-exposed', 'they-dont-want',
    'banned-video', 'hidden-truth', 'deep-state', 'plandemic',
  ];
  const fakeNewsHits = fakeNewsKeywords.filter(k => fullText.includes(k));
  const fakeNewsDetected = fakeNewsHits.length >= 1;
  if (fakeNewsDetected) { riskScore += 20; reasons.push('misinformation signals'); }
  flags.push({
    category: 'fake_news',
    detected: fakeNewsDetected,
    reasoning: fakeNewsDetected
      ? `Found misinformation keywords: ${fakeNewsHits.join(', ')}`
      : 'No misinformation signals found.',
  });

  // Ponzi signals
  const ponziKeywords = [
    'invest', 'crypto', 'bitcoin', 'guaranteed', 'returns',
    'profit', 'passive-income', 'get-rich', 'double', 'forex',
    'trading-bot', 'roi', 'withdrawal',
  ];
  const ponziHits = ponziKeywords.filter(k => fullText.includes(k));
  const ponziDetected = ponziHits.length >= 3;
  if (ponziDetected) { riskScore += 30; reasons.push('investment fraud signals'); }
  flags.push({
    category: 'ponzi',
    detected: ponziDetected,
    reasoning: ponziDetected
      ? `Found fraud keywords: ${ponziHits.join(', ')}`
      : 'No investment fraud signals found.',
  });

  // Suspicious domain structure
  const hasNumbers = /\d/.test(domain);
  const hasMultipleHyphens = (domain.match(/-/g) ?? []).length > 1;
  const tooManySubdomains = domain.split('.').length > 4;
  if (hasNumbers && hasMultipleHyphens) { riskScore += 15; reasons.push('suspicious domain structure'); }
  if (tooManySubdomains) { riskScore += 10; reasons.push('too many subdomains'); }

  riskScore = Math.min(riskScore, 100);

  const riskLevel =
    riskScore >= 60 ? 'dangerous' :
    riskScore >= 30 ? 'suspicious' :
    'safe';

  return {
    url,
    domain,
    scannedAt: Date.now(),
    riskLevel,
    riskScore,
    summary: reasons.length > 0
      ? `Site flagged for: ${reasons.join(', ')}.`
      : 'No obvious risk signals detected.',
    flags,
    aiModel: 'rule-based',
  };
}

// ─── Notification ─────────────────────────────────────────────────────────────

function fireNotification(report: SiteReport) {
  const isDangerous = report.riskLevel === 'dangerous';
  chrome.notifications.create(`scan-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon32.png',
    title: isDangerous ? '🔴 Dangerous site detected' : '🟡 Suspicious site detected',
    message: report.summary,
    priority: isDangerous ? 2 : 1,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCachedReport(domain: string): Promise<SiteReport | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(`report:${domain}`, (r) => {
      const entry = r[`report:${domain}`] as (SiteReport & { cachedAt: number }) | undefined;
      if (!entry) return resolve(null);
      const expired = Date.now() - entry.cachedAt > 10 * 60 * 1000;
      resolve(expired ? null : entry);
    });
  });
}