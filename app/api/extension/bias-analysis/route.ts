import { type NextRequest, NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { Logger, generateRequestId } from '@/lib/error-handler'

// Extension-specific bias analysis endpoint without authentication
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const { content } = await request.json()
    
    Logger.info('Extension bias analysis request started', { 
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
       system: `You are TruthLens, an expert bias detection and media analysis specialist.

Your task is to analyze the provided content for various types of bias, political leaning, emotional manipulation, and objectivity. Provide a comprehensive analysis that includes:

1. **Bias Detection**: Identify specific types of bias present
2. **Political Leaning**: Assess political orientation if applicable
3. **Emotional Tone**: Analyze emotional manipulation techniques
4. **Objectivity Score**: Rate the overall objectivity
5. **Language Analysis**: Examine word choice and framing

Provide your response in this exact format:

**BIAS DETECTED: [YES/NO]**

**OBJECTIVITY SCORE: [0-100]**

**POLITICAL LEANING: [LEFT/CENTER-LEFT/CENTER/CENTER-RIGHT/RIGHT/NEUTRAL]**

**EMOTIONAL TONE: [NEUTRAL/POSITIVE/NEGATIVE/INFLAMMATORY/MANIPULATIVE]**

**ANALYSIS:**
[Detailed analysis of bias and objectivity]

**BIAS TYPES DETECTED:**
• [Bias type 1 if any]
• [Bias type 2 if any]
• [Bias type 3 if any]

**LANGUAGE PATTERNS:**
• [Pattern 1]
• [Pattern 2]
• [Pattern 3]

**RECOMMENDATIONS:**
• [Recommendation 1]
• [Recommendation 2]

**SUMMARY:** [Brief summary of findings]

Be thorough, objective, and cite specific examples from the content.`,
       prompt: `Please analyze this content for bias, political leaning, and objectivity:\n\n${contentToAnalyze}`,
    })

    const biasDetected = extractBiasDetected(text)
    const objectivityScore = extractObjectivityScore(text)
    const politicalLeaning = extractPoliticalLeaning(text)
    const emotionalTone = extractEmotionalTone(text)
    const biasTypes = extractBiasTypes(text)
    const recommendations = extractRecommendations(text)

    const result = {
      analysis: text,
      bias_detected: biasDetected,
      objectivity_score: objectivityScore,
      political_leaning: politicalLeaning,
      emotional_tone: emotionalTone,
      bias_types: biasTypes,
      recommendations,
      confidence: Math.min(95, Math.max(60, objectivityScore)),
      timestamp: new Date().toISOString(),
      requestId
    }

    Logger.info('Extension bias analysis completed', { 
      requestId,
      biasDetected,
      objectivityScore,
      politicalLeaning 
    })

    return NextResponse.json(result)

  } catch (error) {
    Logger.error('Extension bias analysis error', error, { requestId })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractBiasDetected(text: string): boolean {
  const biasMatch = text.match(/BIAS DETECTED:\s*(YES|NO)/i)
  return biasMatch ? biasMatch[1].toUpperCase() === 'YES' : false
}

function extractObjectivityScore(text: string): number {
  const scoreMatch = text.match(/OBJECTIVITY SCORE:\s*(\d+)/i)
  if (scoreMatch) {
    return parseInt(scoreMatch[1], 10)
  }
  return 50 // Default score
}

function extractPoliticalLeaning(text: string): string {
  const leaningMatch = text.match(/POLITICAL LEANING:\s*([^\n]+)/i)
  return leaningMatch ? leaningMatch[1].trim() : 'NEUTRAL'
}

function extractEmotionalTone(text: string): string {
  const toneMatch = text.match(/EMOTIONAL TONE:\s*([^\n]+)/i)
  return toneMatch ? toneMatch[1].trim() : 'NEUTRAL'
}

function extractBiasTypes(text: string): string[] {
  const types: string[] = []
  const typeSection = text.match(/BIAS TYPES DETECTED:([\s\S]*?)(?:\n\n|\*\*|$)/i)
  
  if (typeSection) {
    const typeText = typeSection[1]
    const typeMatches = typeText.match(/•\s*([^\n•]+)/g)
    if (typeMatches) {
      types.push(...typeMatches.map(type => type.replace(/•\s*/, '').trim()))
    }
  }
  
  return types
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = []
  const recSection = text.match(/RECOMMENDATIONS:([\s\S]*?)(?:\n\n|\*\*|$)/i)
  
  if (recSection) {
    const recText = recSection[1]
    const recMatches = recText.match(/•\s*([^\n•]+)/g)
    if (recMatches) {
      recommendations.push(...recMatches.map(rec => rec.replace(/•\s*/, '').trim()))
    }
  }
  
  return recommendations
}