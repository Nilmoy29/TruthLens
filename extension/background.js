function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'tl_fact_check_selection', title: 'TruthLens: Fact check selection', contexts: ['selection'] })
    chrome.contextMenus.create({ id: 'tl_bias_selection', title: 'TruthLens: Bias analyze selection', contexts: ['selection'] })
    chrome.contextMenus.create({ id: 'tl_fact_check_page', title: 'TruthLens: Fact check page URL', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'tl_bias_page', title: 'TruthLens: Bias analyze page URL', contexts: ['page'] })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.get({ apiBaseUrl: 'http://localhost:3000' }, () => {})
  createContextMenus()
})

chrome.runtime.onStartup.addListener(() => {
  createContextMenus()
})

async function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiBaseUrl: 'http://localhost:3000' }, (res) => resolve(res.apiBaseUrl))
  })
}

async function postJson(path, body) {
  const base = await getBaseUrl()
  const res = await fetch(`${base}/api/extension${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

// Handle automatic content analysis and logging
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    if (message.type === 'ANALYZE_CONTENT') {
      // Perform automatic content analysis
      const analysisPromises = [
        postJson('/fact-check', { content: message.content, metadata: message.metadata }),
        postJson('/bias-analysis', { content: message.content, metadata: message.metadata })
      ]
      
      const [factCheck, biasAnalysis] = await Promise.allSettled(analysisPromises)
      
      // Store analysis results
      const analysisData = {
        url: message.metadata.url,
        timestamp: new Date().toISOString(),
        factCheck: factCheck.status === 'fulfilled' ? factCheck.value.data : null,
        biasAnalysis: biasAnalysis.status === 'fulfilled' ? biasAnalysis.value.data : null,
        metadata: message.metadata,
        engagement: message.engagement
      }
      
      // Store in local storage for later sync
      chrome.storage.local.get({ analysisHistory: [] }, (result) => {
        const history = result.analysisHistory
        history.push(analysisData)
        // Keep only last 100 analyses
        if (history.length > 100) {
          history.splice(0, history.length - 100)
        }
        chrome.storage.local.set({ analysisHistory: history })
      })
      
      // Send notification if significant bias or credibility issues detected
      if (biasAnalysis.status === 'fulfilled' && biasAnalysis.value.data?.bias_detected) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'TL_RESULT',
          label: 'Bias Detected',
          ok: false,
          data: biasAnalysis.value.data
        })
      }
    }
    
    if (message.type === 'LOG_CONSUMPTION') {
      // Log consumption data to the content calendar
      const consumptionData = {
        ...message.data,
        source: message.data.domain,
        credibility_score: 0.8, // Default score, will be updated by analysis
        bias_score: 0.5 // Default score, will be updated by analysis
      }
      
      // Send to content calendar API
      const { ok, data } = await postJson('/content-calendar/consumption', consumptionData)
      
      // Store locally as backup
      chrome.storage.local.get({ consumptionLogs: [] }, (result) => {
        const logs = result.consumptionLogs
        logs.push(consumptionData)
        // Keep only last 500 logs
        if (logs.length > 500) {
          logs.splice(0, logs.length - 500)
        }
        chrome.storage.local.set({ consumptionLogs: logs })
      })
      
      console.log('Consumption logged:', consumptionData)
    }
  } catch (e) {
    console.error('Background script error:', e)
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab?.id) return

    if (info.menuItemId === 'tl_fact_check_selection' && info.selectionText) {
      const { ok, data } = await postJson('/fact-check', { content: info.selectionText })
      chrome.tabs.sendMessage(tab.id, { type: 'TL_RESULT', label: 'Fact Check (selection)', ok, data })
    }
    if (info.menuItemId === 'tl_bias_selection' && info.selectionText) {
      const { ok, data } = await postJson('/bias-analysis', { content: info.selectionText })
      chrome.tabs.sendMessage(tab.id, { type: 'TL_RESULT', label: 'Bias Analysis (selection)', ok, data })
    }
    if (info.menuItemId === 'tl_fact_check_page' && info.pageUrl) {
      const { ok, data } = await postJson('/fact-check', { content: info.pageUrl })
      chrome.tabs.sendMessage(tab.id, { type: 'TL_RESULT', label: 'Fact Check (page)', ok, data })
    }
    if (info.menuItemId === 'tl_bias_page' && info.pageUrl) {
      const { ok, data } = await postJson('/bias-analysis', { content: info.pageUrl })
      chrome.tabs.sendMessage(tab.id, { type: 'TL_RESULT', label: 'Bias Analysis (page)', ok, data })
    }
  } catch (e) {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'TL_RESULT', label: 'Error', ok: false, data: { error: e.message } })
  }
})