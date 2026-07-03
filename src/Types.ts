export type RiskLevel = 'safe' | 'suspicious' | 'dangerous';

export interface RiskFlag {
  category: 'phishing' | 'malware' | 'impersonation' | 'fake_news' | 'ponzi';
  detected: boolean;
  reasoning: string;
}

export interface SiteReport {
  url: string;
  domain: string;
  scannedAt: number;
  riskLevel: RiskLevel;
  riskScore: number;
  flags: RiskFlag[];
  summary: string;
  aiModel: string;
}