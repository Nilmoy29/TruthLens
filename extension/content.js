// Automatic content monitoring variables
let contentMonitor = {
  startTime: Date.now(),
  lastActivity: Date.now(),
  scrollDepth: 0,
  timeSpent: 0,
  isActive: true,
  contentAnalyzed: false,
  pageContent: null
}

// Initialize automatic content detection
function initializeContentMonitoring() {
  // Track page visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      contentMonitor.isActive = false
      logCurrentSession()
    } else {
      contentMonitor.isActive = true
      contentMonitor.lastActivity = Date.now()
    }
  })

  // Track scroll depth for engagement
  let maxScroll = 0
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
    maxScroll = Math.max(maxScroll, scrollPercent)
    contentMonitor.scrollDepth = maxScroll
    contentMonitor.lastActivity = Date.now()
  })

  // Track mouse movement and clicks for activity
  document.addEventListener('mousemove', () => {
    contentMonitor.lastActivity = Date.now()
  })

  document.addEventListener('click', () => {
    contentMonitor.lastActivity = Date.now()
  })

  // Analyze page content automatically
  setTimeout(() => {
    analyzePageContent()
  }, 3000) // Wait 3 seconds for page to fully load

  // Log session every 30 seconds if active
  setInterval(() => {
    if (contentMonitor.isActive && (Date.now() - contentMonitor.lastActivity) < 30000) {
      updateTimeSpent()
    }
  }, 30000)
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'GET_SELECTION') {
    const selection = window.getSelection()?.toString() || ''
    sendResponse({ selection, url: location.href, title: document.title })
    return true
  }
  
  if (message && message.type === 'GET_PAGE_CONTENT') {
    const content = extractPageContent()
    sendResponse({ content, url: location.href, title: document.title, timeSpent: contentMonitor.timeSpent })
    return true
  }
})

// Listen for results from background (context menu actions)
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'TL_RESULT') {
    showTruthLensToast(message.label || 'TruthLens Result', message.ok, message.data)
  }
})

function getThemeColors() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  if (isDark) {
    return {
      cardBg: 'oklch(0.145 0 0)',
      cardFg: 'oklch(0.985 0 0)',
      border: 'oklch(0.269 0 0)',
      primary: 'oklch(0.985 0 0)',
      primaryFg: 'oklch(0.205 0 0)',
      popover: 'oklch(0.145 0 0)',
      popoverFg: 'oklch(0.985 0 0)'
    }
  }
  return {
    cardBg: 'oklch(1 0 0)',
    cardFg: 'oklch(0.145 0 0)',
    border: 'oklch(0.922 0 0)',
    primary: 'oklch(0.205 0 0)',
    primaryFg: 'oklch(0.985 0 0)',
    popover: 'oklch(1 0 0)',
    popoverFg: 'oklch(0.145 0 0)'
  }
}

function formatAnalysisResult(data) {
  if (!data || typeof data !== 'object') {
    return `<pre>${JSON.stringify(data, null, 2)}</pre>`
  }

  let html = ''
  
  if (data.analysis) {
    html += `<div><strong>Analysis:</strong> ${data.analysis}</div>`
  }
  
  if (data.score !== undefined) {
    html += `<div><strong>Score:</strong> ${data.score}</div>`
  }
  
  if (data.confidence !== undefined) {
    html += `<div><strong>Confidence:</strong> ${data.confidence}</div>`
  }
  
  if (data.bias_detected !== undefined) {
    html += `<div><strong>Bias Detected:</strong> ${data.bias_detected}</div>`
  }
  
  if (data.political_leaning) {
    html += `<div><strong>Political Leaning:</strong> ${data.political_leaning}</div>`
  }
  
  if (data.emotional_tone) {
    html += `<div><strong>Emotional Tone:</strong> ${data.emotional_tone}</div>`
  }
  
  if (data.summary) {
    html += `<div><strong>Summary:</strong> ${data.summary}</div>`
  }
  
  if (data.recommendations && Array.isArray(data.recommendations)) {
    html += '<div><strong>Recommendations:</strong><ul>'
    data.recommendations.forEach(rec => {
      html += `<li>${rec}</li>`
    })
    html += '</ul></div>'
  }
  
  if (data.sources && Array.isArray(data.sources)) {
    html += '<div><strong>Sources:</strong><ul>'
    data.sources.forEach(source => {
      if (typeof source === 'string') {
        html += `<li><a href="${source}" target="_blank">${source}</a></li>`
      } else if (source.url) {
        html += `<li><a href="${source.url}" target="_blank">${source.title || source.url}</a></li>`
      }
    })
    html += '</ul></div>'
  }
  
  if (!html) {
    return `<pre>${JSON.stringify(data, null, 2)}</pre>`
  }
  
  return html
}

// Extract main content from the page
function extractPageContent() {
  // Try to find main content areas
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.content',
    '.article-content',
    '.post-content',
    '.entry-content',
    '#content',
    '.main-content'
  ]
  
  let mainContent = ''
  let contentElement = null
  
  // Find the best content container
  for (const selector of contentSelectors) {
    contentElement = document.querySelector(selector)
    if (contentElement) {
      break
    }
  }
  
  // If no specific content area found, use body but filter out navigation/footer
  if (!contentElement) {
    contentElement = document.body
  }
  
  if (contentElement) {
    // Clone the element to avoid modifying the original
    const clone = contentElement.cloneNode(true)
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'nav', 'header', 'footer', 'aside',
      '.navigation', '.nav', '.menu',
      '.sidebar', '.widget', '.advertisement',
      '.ads', '.social-share', '.comments',
      'script', 'style', 'noscript'
    ]
    
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })
    
    mainContent = clone.textContent || clone.innerText || ''
  }
  
  // Clean up the text
  mainContent = mainContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
  
  // Get additional metadata
  const metadata = {
    title: document.title,
    url: location.href,
    domain: location.hostname,
    wordCount: mainContent.split(/\s+/).length,
    readingTime: Math.ceil(mainContent.split(/\s+/).length / 200), // Assume 200 WPM
    publishDate: extractPublishDate(),
    author: extractAuthor(),
    contentType: detectContentType()
  }
  
  return {
    content: mainContent.substring(0, 5000), // Limit to 5000 chars
    fullContent: mainContent,
    metadata
  }
}

// Extract publish date from page
function extractPublishDate() {
  const dateSelectors = [
    'time[datetime]',
    '.publish-date',
    '.date',
    '.post-date',
    '[property="article:published_time"]',
    '[name="article:published_time"]'
  ]
  
  for (const selector of dateSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      return element.getAttribute('datetime') || element.textContent || element.getAttribute('content')
    }
  }
  
  return null
}

// Extract author information
function extractAuthor() {
  const authorSelectors = [
    '[rel="author"]',
    '.author',
    '.byline',
    '.post-author',
    '[property="article:author"]',
    '[name="author"]'
  ]
  
  for (const selector of authorSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      return element.textContent || element.getAttribute('content')
    }
  }
  
  return null
}

// Detect content type based on page structure and URL
function detectContentType() {
  const url = location.href.toLowerCase()
  const title = document.title.toLowerCase()
  
  if (url.includes('youtube.com') || url.includes('vimeo.com') || document.querySelector('video')) {
    return 'video'
  }
  
  if (url.includes('podcast') || url.includes('audio') || document.querySelector('audio')) {
    return 'podcast'
  }
  
  if (url.includes('twitter.com') || url.includes('facebook.com') || url.includes('instagram.com') || url.includes('linkedin.com')) {
    return 'social_post'
  }
  
  if (document.querySelector('article') || title.includes('article') || url.includes('article') || url.includes('news')) {
    return 'article'
  }
  
  return 'webpage'
}

// Analyze page content automatically
function analyzePageContent() {
  if (contentMonitor.contentAnalyzed) return
  
  const content = extractPageContent()
  if (!content.content || content.content.length < 100) return // Skip if too little content
  
  contentMonitor.pageContent = content
  contentMonitor.contentAnalyzed = true
  
  // Send for automatic analysis
  chrome.runtime.sendMessage({
    type: 'ANALYZE_CONTENT',
    content: content.content,
    metadata: content.metadata,
    engagement: {
      timeSpent: contentMonitor.timeSpent,
      scrollDepth: contentMonitor.scrollDepth
    }
  })
}

// Update time spent calculation
function updateTimeSpent() {
  if (contentMonitor.isActive) {
    contentMonitor.timeSpent = Math.floor((Date.now() - contentMonitor.startTime) / 1000)
  }
}

// Log current session data
function logCurrentSession() {
  updateTimeSpent()
  
  if (contentMonitor.timeSpent > 10 && contentMonitor.pageContent) { // Only log if spent more than 10 seconds
    chrome.runtime.sendMessage({
      type: 'LOG_CONSUMPTION',
      data: {
        url: location.href,
        title: document.title,
        timeSpent: contentMonitor.timeSpent,
        scrollDepth: contentMonitor.scrollDepth,
        contentType: contentMonitor.pageContent.metadata.contentType,
        wordCount: contentMonitor.pageContent.metadata.wordCount,
        completionPercentage: Math.min(contentMonitor.scrollDepth, 100),
        domain: location.hostname,
        timestamp: new Date().toISOString()
      }
    })
  }
}

// Initialize monitoring when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentMonitoring)
} else {
  initializeContentMonitoring()
}

// Log session when page unloads
window.addEventListener('beforeunload', logCurrentSession)

function showTruthLensToast(label, ok, data) {
  const theme = getThemeColors()

  let container = document.getElementById('truthlens-toast')
  if (!container) {
    container = document.createElement('div')
    container.id = 'truthlens-toast'
    Object.assign(container.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      maxWidth: '420px',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      boxShadow: '0 10px 30px rgba(0,0,0,0.20)'
    })
    document.documentElement.appendChild(container)
  }

  const card = document.createElement('div')
  Object.assign(card.style, {
    background: theme.cardBg,
    color: theme.cardFg,
    borderRadius: '12px',
    padding: '12px',
    border: `1px solid ${theme.border}`,
    marginTop: '8px',
    width: '420px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  })

  const header = document.createElement('div')
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'

  const titleWrap = document.createElement('div')
  titleWrap.style.display = 'flex'
  titleWrap.style.alignItems = 'center'
  titleWrap.style.gap = '8px'

  const dot = document.createElement('span')
  Object.assign(dot.style, {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: ok ? 'color-mix(in oklab, limegreen 75%, transparent)' : 'color-mix(in oklab, crimson 75%, transparent)'
  })

  const title = document.createElement('div')
  title.textContent = `${label} ${ok ? '✓' : '✕'}`
  title.style.fontWeight = '600'

  titleWrap.appendChild(dot)
  titleWrap.appendChild(title)

  const close = document.createElement('button')
  close.textContent = '×'
  Object.assign(close.style, {
    border: '1px solid transparent',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: '1',
    borderRadius: '6px',
    padding: '2px 6px'
  })
  close.onmouseenter = () => { close.style.background = theme.popover; close.style.borderColor = theme.border }
  close.onmouseleave = () => { close.style.background = 'transparent'; close.style.borderColor = 'transparent' }
  close.onclick = () => {
    try {
      if (container.contains(card)) container.removeChild(card)
      if (!container.childElementCount) container.remove()
    } catch {}
  }

  header.appendChild(titleWrap)
  header.appendChild(close)

  const body = document.createElement('div')
  body.style.marginTop = '8px'
  body.style.whiteSpace = 'pre-wrap'
  body.style.fontSize = '13px'
  body.style.lineHeight = '1.6'
  body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  body.style.background = '#ffffff'
  body.style.color = '#374151'
  body.style.border = '1px solid #e5e7eb'
  body.style.borderRadius = '8px'
  body.style.padding = '12px'
  body.style.maxHeight = '320px'
  body.style.overflow = 'auto'

  try {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data
    if (typeof parsedData === 'object' && parsedData !== null) {
      body.innerHTML = formatAnalysisResult(parsedData)
    } else {
      body.textContent = String(data)
    }
  } catch {
    body.textContent = String(data)
  }

  card.appendChild(header)
  card.appendChild(body)
  container.appendChild(card)

  setTimeout(() => {
    try {
      if (container.contains(card)) container.removeChild(card)
      if (!container.childElementCount) container.remove()
    } catch {}
  }, 12000)
}