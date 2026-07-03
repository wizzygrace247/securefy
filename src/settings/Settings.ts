/// <reference types="chrome" />

const input = document.getElementById('api-key') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

// ─── Load existing key on open ────────────────────────────────────────────────

chrome.storage.local.get('geminiApiKey', (result: { geminiApiKey?: string }) => {
  if (result.geminiApiKey) {
    input.value = result.geminiApiKey;
    setStatus('Key loaded from storage.', 'info');
  }
});

// ─── Save ─────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const key = input.value.trim();

  if (!key) {
    setStatus('Please enter an API key.', 'error');
    return;
  }

  if (key.length < 20 || !key.startsWith('AIza')) {
    setStatus('That does not look like a valid Gemini key. Gemini keys usually start with "AIza".', 'error');
    return;
  }

  chrome.storage.local.set({ geminiApiKey: key }, () => {
    setStatus('✅ Key saved successfully!', 'success');
  });
});

// ─── Clear ────────────────────────────────────────────────────────────────────

clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('geminiApiKey', () => {
    input.value = '';
    setStatus('Key cleared.', 'info');
  });
});

// ─── Status helper ────────────────────────────────────────────────────────────

function setStatus(msg: string, type: 'success' | 'error' | 'info') {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
}