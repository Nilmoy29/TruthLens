import { type NextRequest, NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { Logger, generateRequestId } from '@/lib/error-handler'

// Extension-specific media verification endpoint without authentication
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    Logger.info('Extension media verification request started', { 
      requestId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    })

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      )
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM)' },
        { status: 400 }
      )
    }

    // Convert file to base64 for analysis
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type

    // For now, we'll do a basic analysis without actual image processing
    // In a real implementation, you would use image analysis APIs
    const { text } = await generateText({
       model: groq("llama-3.3-70b-versatile"),
       system: `You are TruthLens, an expert media verification and digital forensics specialist.

Your task is to analyze media files for authenticity, manipulation, and credibility. Since you cannot directly process the media file, provide guidance based on the file metadata and general media verification principles.

Provide your response in this exact format:

**AUTHENTICITY: [AUTHENTIC/LIKELY_AUTHENTIC/QUESTIONABLE/LIKELY_MANIPULATED/MANIPULATED]**

**CONFIDENCE: [0-100]**

**ANALYSIS:**
[Detailed analysis based on available information]

**TECHNICAL ASSESSMENT:**
• File Type: [file type]
• File Size: [file size]
• Potential Issues: [any technical red flags]

**VERIFICATION STEPS:**
• [Step 1 for manual verification]
• [Step 2 for manual verification]
• [Step 3 for manual verification]

**RED FLAGS:**
• [Flag 1 if any]
• [Flag 2 if any]

**RECOMMENDATIONS:**
• [Recommendation 1]
• [Recommendation 2]

**SUMMARY:** [Brief summary of findings]

Be thorough and provide actionable verification steps.`,
       prompt: `Please analyze this media file for authenticity and potential manipulation:\n\nFile Name: ${file.name}\nFile Type: ${file.type}\nFile Size: ${file.size} bytes\n\nProvide a comprehensive media verification analysis.`,
    })

    const authenticity = extractAuthenticity(text)
    const confidence = extractConfidence(text)
    const redFlags = extractRedFlags(text)
    const verificationSteps = extractVerificationSteps(text)
    const recommendations = extractRecommendations(text)

    const result = {
      analysis: text,
      authenticity,
      confidence,
      file_info: {
        name: file.name,
        type: file.type,
        size: file.size,
        size_mb: (file.size / (1024 * 1024)).toFixed(2)
      },
      red_flags: redFlags,
      verification_steps: verificationSteps,
      recommendations,
      timestamp: new Date().toISOString(),
      requestId
    }

    Logger.info('Extension media verification completed', { 
      requestId,
      authenticity,
      confidence,
      redFlagsCount: redFlags.length 
    })

    return NextResponse.json(result)

  } catch (error) {
    Logger.error('Extension media verification error', error, { requestId })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractAuthenticity(text: string): string {
  const authMatch = text.match(/AUTHENTICITY:\s*([^\n]+)/i)
  return authMatch ? authMatch[1].trim() : 'QUESTIONABLE'
}

function extractConfidence(text: string): number {
  const confMatch = text.match(/CONFIDENCE:\s*(\d+)/i)
  if (confMatch) {
    return parseInt(confMatch[1], 10)
  }
  return 50 // Default confidence
}

function extractRedFlags(text: string): string[] {
  const flags: string[] = []
  const flagSection = text.match(/RED FLAGS:([\s\S]*?)(?:\n\n|\*\*|$)/i)
  
  if (flagSection) {
    const flagText = flagSection[1]
    const flagMatches = flagText.match(/•\s*([^\n•]+)/g)
    if (flagMatches) {
      flags.push(...flagMatches.map(flag => flag.replace(/•\s*/, '').trim()))
    }
  }
  
  return flags
}

function extractVerificationSteps(text: string): string[] {
  const steps: string[] = []
  const stepSection = text.match(/VERIFICATION STEPS:([\s\S]*?)(?:\n\n|\*\*|$)/i)
  
  if (stepSection) {
    const stepText = stepSection[1]
    const stepMatches = stepText.match(/•\s*([^\n•]+)/g)
    if (stepMatches) {
      steps.push(...stepMatches.map(step => step.replace(/•\s*/, '').trim()))
    }
  }
  
  return steps
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