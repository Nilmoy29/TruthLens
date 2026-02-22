const $ = (sel) => document.querySelector(sel)

async function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiBaseUrl: 'http://localhost:3000' }, (res) => resolve(res.apiBaseUrl))
  })
}

function show(elements, visible) {
  if (NodeList.prototype.isPrototypeOf(elements) || Array.isArray(elements)) {
    elements.forEach(el => el.style.display = visible ? '' : 'none')
  } else {
    elements.style.display = visible ? '' : 'none'
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const factCheckBtn = document.getElementById('factCheckBtn');
  const biasAnalysisBtn = document.getElementById('biasAnalysisBtn');
  const mediaVerifyBtn = document.getElementById('mediaVerifyBtn');
  const input = document.getElementById('input');
  const mediaFile = document.getElementById('mediaFile');
  const result = document.getElementById('result');
  const resultContent = document.querySelector('.result-content');
  const resultHeader = document.querySelector('.result-header');
  const copyBtn = document.getElementById('copyBtn');
  const densityToggle = document.getElementById('densityToggle');
  const container = document.querySelector('.container');
  const openOptions = document.getElementById('openOptions');

  // Load density preference
  chrome.storage.sync.get(['density'], function(result) {
    const density = result.density || 'comfortable';
    if (density === 'compact') {
      container.classList.add('compact');
      densityToggle.classList.add('active');
    }
  });

  // Density toggle functionality
  densityToggle.addEventListener('click', function() {
    const isCompact = container.classList.contains('compact');
    if (isCompact) {
      container.classList.remove('compact');
      densityToggle.classList.remove('active');
      chrome.storage.sync.set({ density: 'comfortable' });
    } else {
      container.classList.add('compact');
      densityToggle.classList.add('active');
      chrome.storage.sync.set({ density: 'compact' });
    }
  });

  // Copy to clipboard functionality
  copyBtn.addEventListener('click', async function() {
    const text = resultContent.textContent;
    try {
      await navigator.clipboard.writeText(text);
      
      // Show success state
      const originalIcon = copyBtn.innerHTML;
      copyBtn.classList.add('success');
      copyBtn.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      `;
      
      setTimeout(() => {
        copyBtn.classList.remove('success');
        copyBtn.innerHTML = originalIcon;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  });

  function displayResult(text) {
    // Check if text is a JSON string and format it nicely
    try {
      const data = typeof text === 'string' ? JSON.parse(text) : text;
      if (typeof data === 'object' && data !== null) {
        resultContent.innerHTML = formatAnalysisResult(data);
      } else {
        resultContent.textContent = text;
      }
    } catch (e) {
      resultContent.textContent = text;
    }
    result.classList.remove('empty');
    result.classList.add('visible');
    resultHeader.style.display = 'flex';
  }

  function formatAnalysisResult(data) {
    let html = '';
    
    // Handle different types of analysis results
    if (data.analysis) {
      html += `<p><strong>Analysis:</strong></p>`;
      html += `<p>${data.analysis}</p>`;
    }
    
    if (data.score !== undefined) {
      html += `<p><strong>Score:</strong> ${data.score}</p>`;
    }
    
    if (data.confidence !== undefined) {
      html += `<p><strong>Confidence:</strong> ${data.confidence}%</p>`;
    }
    
    if (data.bias_detected !== undefined) {
      html += `<p><strong>Bias Detected:</strong> ${data.bias_detected ? 'Yes' : 'No'}</p>`;
    }
    
    if (data.political_leaning) {
      html += `<p><strong>Political Leaning:</strong> ${data.political_leaning}</p>`;
    }
    
    if (data.emotional_tone) {
      html += `<p><strong>Emotional Tone:</strong> ${data.emotional_tone}</p>`;
    }
    
    if (data.summary) {
      html += `<p><strong>Summary:</strong></p>`;
      html += `<p>${data.summary}</p>`;
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
      html += `<p><strong>Recommendations:</strong></p>`;
      html += '<ul>';
      data.recommendations.forEach(rec => {
        html += `<li>${rec}</li>`;
      });
      html += '</ul>';
    }
    
    if (data.sources && data.sources.length > 0) {
      html += `<p><strong>Sources:</strong></p>`;
      html += '<ul>';
      data.sources.forEach(source => {
        html += `<li><a href="${source}" target="_blank">${source}</a></li>`;
      });
      html += '</ul>';
    }
    
    // If no specific formatting was applied, show formatted JSON
    if (!html) {
      html = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    }
    
    return html;
  }

  function showError(message) {
     resultContent.textContent = `Error: ${message}`;
     result.classList.remove('empty');
     result.classList.add('visible');
     resultHeader.style.display = 'flex';
   }

   // Mode selector functionality
   const modeButtons = document.querySelectorAll('.mode-selector button');
   const textInputs = document.querySelectorAll('.text-input');
   const mediaInputs = document.querySelectorAll('.media-input');

   modeButtons.forEach(btn => {
     btn.addEventListener('click', () => {
       modeButtons.forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       const mode = btn.dataset.mode;
       show(textInputs, mode !== 'media-verify');
       show(mediaInputs, mode === 'media-verify');
       // Hide result section when switching modes
       result.classList.remove('visible');
       result.classList.add('empty');
       resultHeader.style.display = 'none';
       resultContent.textContent = 'Results will appear here.';
     });
   });

   // Use selection functionality
   document.getElementById('useSelection').addEventListener('click', async () => {
     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (resp) => {
       if (chrome.runtime.lastError) return;
       if (resp?.selection) input.value = resp.selection;
     });
   });

   // Use URL functionality
   document.getElementById('useUrl').addEventListener('click', async () => {
     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     input.value = tab.url || '';
   });

   // Analysis functionality
   async function analyzeText(endpoint) {
     const baseUrl = await getBaseUrl();
     const content = input.value.trim();
     if (!content) { showError('Please provide text or URL.'); return; }
     displayResult('Analyzing...');
     try {
       const res = await fetch(`${baseUrl}/api/extension/${endpoint}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ content })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data?.error || 'Request failed');
       displayResult(data);
     } catch (e) {
       showError(e.message);
     }
   }

   document.getElementById('analyze').addEventListener('click', async () => {
     const activeMode = document.querySelector('.mode-selector .active')?.dataset.mode;
     if (activeMode === 'fact-check') return analyzeText('fact-check');
     if (activeMode === 'bias-analysis') return analyzeText('bias-analysis');
   });

   // Media verification functionality
   document.getElementById('verifyMedia').addEventListener('click', async () => {
     const baseUrl = await getBaseUrl();
     const file = mediaFile.files?.[0];
     if (!file) { showError('Please choose an image or video file.'); return; }
     displayResult('Uploading and analyzing media...');
     try {
       const fd = new FormData();
       fd.append('file', file);
       const res = await fetch(`${baseUrl}/api/extension/media-verify`, { method: 'POST', body: fd });
       const data = await res.json();
       if (!res.ok) throw new Error(data?.error || 'Request failed');
       displayResult(data);
     } catch (e) {
       showError(e.message);
     }
   });

   // Options page functionality
   openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
 });