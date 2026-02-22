import { type NextRequest, NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { Logger, generateRequestId } from '@/lib/error-handler'

// Extension-specific fact-check endpoint without authentication
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const { content } = await request.json()
    
    Logger.info('Extension fact check request started', { 
      requestId,
      contentLength: content?.length 
    })

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    let contentToAnalyze = content
    if (content.trim().startsWith("http")) {
      try {
        const response = await fetch(content)
        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch URL: ${response.status}` },
            { status: 400 }
          )
        }
        const html = await response.text()
        contentToAnalyze = html
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 5000)
      } catch (fetchError) {
         Logger.error('URL fetch error', fetchError, { requestId, url: content })
         return NextResponse.json(
           { error: 'Failed to fetch content from URL' },
           { status: 400 }
         )
       }
    }

    const { text } = await generateText({
       model: groq("llama-3.3-70b-versatile"),
       system: `You are TruthLens, an expert fact-checker and credibility analyst.

Your task is to analyze the provided content for factual accuracy, credibility, and potential misinformation. Provide a comprehensive analysis that includes:

1. **Factual Assessment**: Evaluate claims against known facts
2. **Source Credibility**: Assess the reliability of sources mentioned
3. **Bias Detection**: Identify potential bias or misleading framing
4. **Verification Status**: Rate the overall credibility
5. **Red Flags**: Highlight suspicious elements

Provide your response in this exact format:

**CREDIBILITY SCORE: [0-100]**

**ANALYSIS:**
[Detailed analysis of the content]

**KEY FINDINGS:**
• [Finding 1]
• [Finding 2]
• [Finding 3]

**VERIFICATION STATUS:** [VERIFIED/PARTIALLY_VERIFIED/UNVERIFIED/FALSE]

**RED FLAGS:**
• [Flag 1 if any]
• [Flag 2 if any]

**SOURCES TO CHECK:**
• [Source 1 if any]
• [Source 2 if any]

**RECOMMENDATION:** [Brief recommendation for the user]

Be thorough, objective, and cite specific concerns. Focus on factual accuracy over opinion.`,
       prompt: `Please fact-check and analyze this content for accuracy and credibility:\n\n${contentToAnalyze}`,
    })

    const score = extractScore(text)
    const credibilityScore = analyzeCredibilityFromText(text)
    const flags = extractFlags(text)
    const sources = extractSources(text)

    const result = {
      analysis: text,
      score: score || credibilityScore,
      confidence: Math.min(95, Math.max(60, score || credibilityScore)),
      flags,
      sources,
      timestamp: new Date().toISOString(),
      requestId
    }

    Logger.info('Extension fact check completed', { 
      requestId,
      score: result.score,
      flagsCount: flags.length 
    })

    return NextResponse.json(result)

  } catch (error) {
    Logger.error('Extension fact check error', error, { requestId })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractScore(text: string): number {
  const scoreMatch = text.match(/(?:CREDIBILITY SCORE|SCORE):\s*(\d+)/i)
  if (scoreMatch) {
    return parseInt(scoreMatch[1], 10)
  }
  return analyzeCredibilityFromText(text)
}

function analyzeCredibilityFromText(text: string): number {
  const lowerText = text.toLowerCase()
  
  let score = 50 // Base score
  
  // Positive indicators
  if (lowerText.includes('verified') || lowerText.includes('accurate')) score += 20
  if (lowerText.includes('credible') || lowerText.includes('reliable')) score += 15
  if (lowerText.includes('factual') || lowerText.includes('confirmed')) score += 10
  
  // Negative indicators
  if (lowerText.includes('false') || lowerText.includes('misleading')) score -= 30
  if (lowerText.includes('unverified') || lowerText.includes('questionable')) score -= 20
  if (lowerText.includes('bias') || lowerText.includes('propaganda')) score -= 15
  
  return Math.max(0, Math.min(100, score))
}

function extractFlags(text: string): string[] {
  const flags: string[] = []
  const flagSection = text.match(/RED FLAGS?:([\s\S]*?)(?:\n\n|\*\*|$)/i)
  
  if (flagSection) {
    const flagText = flagSection[1]
    const flagMatches = flagText.match(/•\s*([^\n•]+)/g)
    if (flagMatches) {
      flags.push(...flagMatches.map(flag => flag.replace(/•\s*/, '').trim()))
    }
  }
  
  return flags
}

function extractSources(text: string): string[] {
  const sources: string[] = []
  const sourceSection = text.match(/SOURCES TO CHECK:([\s\S]*?)(?:\n\n|\*\*|$)/i)
  
  if (sourceSection) {
    const sourceText = sourceSection[1]
    const sourceMatches = sourceText.match(/•\s*([^\n•]+)/g)
    if (sourceMatches) {
      sources.push(...sourceMatches.map(source => source.replace(/•\s*/, '').trim()))
    }
  }
  
  return sources
}