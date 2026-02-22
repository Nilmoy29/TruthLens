import { NextRequest, NextResponse } from 'next/server'

// Mock storage for consumption data (in production, this would be a database)
let consumptionData: any[] = []

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.url || !data.title || !data.domain) {
      return NextResponse.json(
        { error: 'Missing required fields: url, title, domain' },
        { status: 400 }
      )
    }
    
    // Create consumption entry
    const consumptionEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      url: data.url,
      title: data.title,
      domain: data.domain,
      content_type: data.content_type || 'article',
      word_count: data.word_count || 0,
      reading_time: data.reading_time || 0,
      time_spent: data.time_spent || 0,
      scroll_depth: data.scroll_depth || 0,
      author: data.author || 'Unknown',
      publish_date: data.publish_date || null,
      source: data.source || data.domain,
      credibility_score: data.credibility_score || 0.8,
      bias_score: data.bias_score || 0.5,
      engagement_score: calculateEngagementScore(data),
      tags: extractTags(data.title, data.domain),
      category: categorizeContent(data.content_type, data.domain)
    }
    
    // Store the consumption data
    consumptionData.push(consumptionEntry)
    
    // Keep only last 1000 entries
    if (consumptionData.length > 1000) {
      consumptionData = consumptionData.slice(-1000)
    }
    
    console.log('Content consumption logged:', {
      url: consumptionEntry.url,
      title: consumptionEntry.title,
      engagement_score: consumptionEntry.engagement_score
    })
    
    return NextResponse.json({
      success: true,
      data: consumptionEntry
    })
  } catch (error) {
    console.error('Error logging consumption:', error)
    return NextResponse.json(
      { error: 'Failed to log consumption data' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const domain = searchParams.get('domain')
    const category = searchParams.get('category')
    
    let filteredData = [...consumptionData]
    
    // Apply filters
    if (domain) {
      filteredData = filteredData.filter(item => item.domain === domain)
    }
    
    if (category) {
      filteredData = filteredData.filter(item => item.category === category)
    }
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Apply limit
    const limitedData = filteredData.slice(0, limit)
    
    // Calculate analytics
    const analytics = {
      total_items: filteredData.length,
      total_time_spent: filteredData.reduce((sum, item) => sum + (item.time_spent || 0), 0),
      average_engagement: filteredData.reduce((sum, item) => sum + item.engagement_score, 0) / filteredData.length || 0,
      top_domains: getTopDomains(filteredData),
      content_categories: getCategoryDistribution(filteredData),
      daily_consumption: getDailyConsumption(filteredData)
    }
    
    return NextResponse.json({
      success: true,
      data: limitedData,
      analytics
    })
  } catch (error) {
    console.error('Error fetching consumption data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consumption data' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateEngagementScore(data: any): number {
  const timeWeight = Math.min((data.time_spent || 0) / 60, 10) / 10 // Max 10 minutes
  const scrollWeight = (data.scroll_depth || 0) / 100
  const readingTimeWeight = data.reading_time > 0 ? Math.min((data.time_spent || 0) / data.reading_time, 1) : 0
  
  return Math.round(((timeWeight + scrollWeight + readingTimeWeight) / 3) * 100) / 100
}

function extractTags(title: string, domain: string): string[] {
  const tags = []
  
  // Add domain-based tags
  if (domain.includes('news')) tags.push('news')
  if (domain.includes('blog')) tags.push('blog')
  if (domain.includes('tech')) tags.push('technology')
  if (domain.includes('science')) tags.push('science')
  
  // Add title-based tags (simple keyword extraction)
  const keywords = ['politics', 'technology', 'science', 'health', 'business', 'sports', 'entertainment']
  keywords.forEach(keyword => {
    if (title.toLowerCase().includes(keyword)) {
      tags.push(keyword)
    }
  })
  
  return [...new Set(tags)] // Remove duplicates
}

function categorizeContent(contentType: string, domain: string): string {
  if (contentType === 'video') return 'video'
  if (domain.includes('news')) return 'news'
  if (domain.includes('blog')) return 'blog'
  if (domain.includes('social')) return 'social'
  if (domain.includes('academic')) return 'academic'
  return 'article'
}

function getTopDomains(data: any[]): { domain: string; count: number }[] {
  const domainCounts = data.reduce((acc, item) => {
    acc[item.domain] = (acc[item.domain] || 0) + 1
    return acc
  }, {})
  
  return Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function getCategoryDistribution(data: any[]): { category: string; count: number }[] {
  const categoryCounts = data.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})
  
  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count: count as number }))
    .sort((a, b) => b.count - a.count)
}

function getDailyConsumption(data: any[]): { date: string; count: number; total_time: number }[] {
  const dailyData = data.reduce((acc, item) => {
    const date = new Date(item.timestamp).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { count: 0, total_time: 0 }
    }
    acc[date].count++
    acc[date].total_time += item.time_spent || 0
    return acc
  }, {})
  
  return Object.entries(dailyData)
    .map(([date, stats]) => ({ 
      date, 
      count: (stats as any).count, 
      total_time: (stats as any).total_time 
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30) // Last 30 days
}