import { type NextRequest, NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { createServerClient } from '@supabase/ssr'
import { withAuth, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware'
import { AppError, ErrorType, Logger } from '@/lib/error-handler'
import { notifyAnalysisComplete } from '@/lib/notifications'

function analyzeBiasFromText(text: string): { bias: string; tone: string; indicators: string[] } {
  const lowerText = text.toLowerCase()
  const indicators: string[] = []

  // Political bias detection
  let bias = "Center"
  const leftKeywords = ["progressive", "liberal", "democrat", "social justice", "inequality", "climate change"]
  const rightKeywords = ["conservative", "republican", "traditional", "free market", "law and order", "border security"]

  const leftCount = leftKeywords.filter((keyword) => lowerText.includes(keyword)).length
  const rightCount = rightKeywords.filter((keyword) => lowerText.includes(keyword)).length

  if (leftCount > rightCount + 1) bias = leftCount > 3 ? "Left" : "Center-Left"
  else if (rightCount > leftCount + 1) bias = rightCount > 3 ? "Right" : "Center-Right"

  // Emotional tone detection
  let tone = "Neutral"
  if (lowerText.includes("angry") || lowerText.includes("outraged") || lowerText.includes("furious")) {
    tone = "Angry"
    indicators.push("angry language")
  } else if (lowerText.includes("fear") || lowerText.includes("danger") || lowerText.includes("threat")) {
    tone = "Fear-inducing"
    indicators.push("fear-based language")
  } else if (lowerText.includes("hope") || lowerText.includes("optimistic") || lowerText.includes("bright future")) {
    tone = "Hopeful"
    indicators.push("hopeful language")
  }

  // Additional bias indicators
  if (lowerText.includes("always") || lowerText.includes("never") || lowerText.includes("all")) {
    indicators.push("absolute statements")
  }
  if (lowerText.includes("they say") || lowerText.includes("sources claim")) {
    indicators.push("vague attribution")
  }
  if (lowerText.includes("!!") || lowerText.includes("???")) {
    indicators.push("excessive punctuation")
  }

  return { bias, tone, indicators: indicators.slice(0, 5) }
}

async function performBiasAnalysis(request: NextRequest, context: RequestContext) {
  const { content } = context.body
  
  Logger.info('Bias analysis request started', { 
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
    system: `You are TruthLens, an expert bias analyst. Analyze content for political bias and emotional tone.

Provide detailed analysis covering:
- Political leaning (Left, Center-Left, Center, Center-Right, Right)
- Emotional tone and manipulation techniques
- Specific bias indicators
- Language patterns that suggest bias

Be objective and educational in your analysis.`,
    prompt: `Analyze this content for political bias and emotional tone: "${contentToAnalyze.substring(0, 3000)}"`
  })

  const { bias, tone, indicators } = analyzeBiasFromText(text)

  const biasAnalysisResult = {
    politicalBias: bias,
    biasConfidence: 75,
    emotionalTone: tone,
    analysis: text,
    biasIndicators: indicators,
    timestamp: Date.now(),
    id: Date.now().toString(),
  }

  // Store result in database
  const insertResult = await withDatabaseErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from('bias_analyses')
        .insert({
          ...biasAnalysisResult,
          user_id: context.session?.user?.id,
          content: contentToAnalyze,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    'Failed to store bias analysis result'
  )

  // Send notification to user
  if (context.session?.user?.id && insertResult?.id) {
    await notifyAnalysisComplete(
      context.session.user.id,
      'bias_analysis',
      insertResult.id
    )
  }

  Logger.info('Bias analysis completed', { 
    userId: context.session?.user?.id, 
    requestId: context.requestId,
    bias: biasAnalysisResult.politicalBias 
  })

  return NextResponse.json(biasAnalysisResult)
}

export const POST = withAuth(performBiasAnalysis)
