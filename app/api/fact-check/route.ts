import { type NextRequest, NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { createServerClient } from '@supabase/ssr'
import { withAuth, withValidation, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware'
import { AppError, ErrorType, Logger, generateRequestId } from '@/lib/error-handler'
import { notifyAnalysisComplete } from '@/lib/notifications'

async function performFactCheck(request: NextRequest, context: RequestContext) {
  const { content } = context.body
  
  Logger.info('Fact check request started', { 
    userId: context.session?.user?.id, 
    requestId: context.requestId,
    contentLength: content?.length 
  })

  // Validate input
  if (!content || content.trim().length === 0) {
    throw new AppError('Content is required and cannot be empty', ErrorType.VALIDATION, 400)
  }

  if (content.length > 5000) {
    throw new AppError('Content too long (max 5000 characters)', ErrorType.VALIDATION, 400)
  }

  const supabase = context.supabase

  let contentToAnalyze = content
  if (content.trim().startsWith("http")) {
    try {
      const response = await fetch(content)
      if (!response.ok) {
        throw new AppError(`Failed to fetch URL: ${response.status}`, ErrorType.EXTERNAL_API, 400)
      }
      const html = await response.text()
      contentToAnalyze = html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 5000)
    } catch (fetchError) {
       Logger.error('URL fetch error', fetchError, { requestId: context.requestId, url: content })
       throw new AppError('Failed to fetch content from URL', ErrorType.EXTERNAL_API, 400)
     }
  }

  const { text } = await generateText({
     model: groq("llama-3.3-70b-versatile"),
     system: `You are TruthLens, an expert fact-checker and credibility analyst.

Analysis factors: source credibility, factual accuracy, evidence quality, bias, consensus consistency, context, logic, manipulation.
Provide constructive, educational analysis to build critical thinking.`,
     prompt: `Analyze this content for credibility and provide a detailed analysis description: "${contentToAnalyze.substring(0, 3000)}"`
   })

  const factCheckResult = {
    score: extractScore(text),
    analysis: text,
    flags: extractFlags(text),
    sources: extractSources(text),
    methodology: ["AI Analysis", "Text Pattern Recognition"],
    timestamp: Date.now(),
    id: Date.now().toString(),
  }

  // Store result in database
   const insertResult = await withDatabaseErrorHandling(
     async () => {
       const { data, error } = await supabase
         .from('fact_checks')
         .insert({
           ...factCheckResult,
           user_id: context.session?.user?.id,
           content: contentToAnalyze,
           created_at: new Date().toISOString()
         })
         .select('id')
         .single()
       if (error) throw error
       return data
     },
     'Failed to store fact check result'
   )

  // Send notification to user
  if (context.session?.user?.id && insertResult?.id) {
    await notifyAnalysisComplete(
      context.session.user.id,
      'fact_check',
      insertResult.id
    )
  }

  Logger.info('Fact check completed', { 
     userId: context.session?.user?.id, 
     requestId: context.requestId,
     score: factCheckResult.score 
   })

  return NextResponse.json(factCheckResult)
}

export const POST = withAuth(performFactCheck)

function extractScore(text: string): number {
  const scoreMatch = text.match(/(\d+)(?:%|\s*out\s*of\s*100|\s*\/\s*100)/i)
  if (scoreMatch) {
    return Math.min(100, Math.max(0, Number.parseInt(scoreMatch[1])))
  }
  return analyzeCredibilityFromText(text)
}

function analyzeCredibilityFromText(text: string): number {
  const lowerText = text.toLowerCase()
  let score = 50 // Default neutral score

  // Positive indicators
  if (lowerText.includes("credible") || lowerText.includes("reliable") || lowerText.includes("verified")) score += 20
  if (lowerText.includes("evidence") || lowerText.includes("research") || lowerText.includes("study")) score += 15
  if (lowerText.includes("expert") || lowerText.includes("scientist") || lowerText.includes("professor")) score += 10

  // Negative indicators
  if (lowerText.includes("unverified") || lowerText.includes("misleading") || lowerText.includes("false")) score -= 30
  if (lowerText.includes("conspiracy") || lowerText.includes("hoax") || lowerText.includes("fake")) score -= 25
  if (lowerText.includes("clickbait") || lowerText.includes("sensational")) score -= 15

  return Math.min(100, Math.max(0, score))
}

function extractFlags(text: string): string[] {
  const flags: string[] = []
  const lowerText = text.toLowerCase()

  if (lowerText.includes("unverified") || lowerText.includes("unconfirmed")) flags.push("Unverified Claims")
  if (lowerText.includes("bias") || lowerText.includes("partisan")) flags.push("Potential Bias")
  if (lowerText.includes("misleading") || lowerText.includes("inaccurate")) flags.push("Misleading Information")
  if (lowerText.includes("outdated") || lowerText.includes("old")) flags.push("Outdated Information")
  if (lowerText.includes("emotional") || lowerText.includes("sensational")) flags.push("Emotional Language")

  return flags.slice(0, 5)
}

function extractSources(text: string): string[] {
  const sources: string[] = []
  const sourceKeywords = ["reuters", "ap news", "bbc", "cnn", "npr", "pbs", "nature", "science", "nejm", "who", "cdc"]
  
  const lowerText = text.toLowerCase()
  sourceKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      sources.push(keyword.toUpperCase())
    }
  })
  
  return sources.slice(0, 5)
}
