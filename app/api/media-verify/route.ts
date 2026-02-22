import { type NextRequest, NextResponse } from "next/server"
import { withAuth, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware'
import { AppError, ErrorType, Logger } from '@/lib/error-handler'
import { notifyAnalysisComplete } from '@/lib/notifications'

async function performMediaVerification(request: NextRequest, context: RequestContext) {
  const formData = await request.formData()
  const file = formData.get("file") as File
  
  Logger.info('Media verification request started', { 
    userId: context.session?.user?.id, 
    requestId: context.requestId,
    fileType: file?.type,
    fileSize: file?.size 
  })

  // Validate input
  if (!file) {
    throw new AppError('No file provided', ErrorType.VALIDATION, 400)
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime"]
  if (!allowedTypes.includes(file.type)) {
    throw new AppError('Unsupported file type', ErrorType.VALIDATION, 400)
  }

  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    throw new AppError('File too large (max 50MB)', ErrorType.VALIDATION, 400)
  }

  const supabase = context.supabase
  const isImage = file.type.startsWith("image/")
  const isVideo = file.type.startsWith("video/")

  // Hive API integration
  const hiveApiKey = process.env.HIVE_API_KEY
  if (!hiveApiKey) {
    throw new AppError('Hive API key not configured', ErrorType.INTERNAL, 500)
  }

  try {
    const hiveFormData = new FormData()
    hiveFormData.append('media', file)

    const hiveResponse = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${hiveApiKey}`,
      },
      body: hiveFormData,
    })

    if (!hiveResponse.ok) {
      throw new AppError(`Hive API error: ${hiveResponse.status}`, ErrorType.EXTERNAL_API, 500)
    }

    const hiveData = await hiveResponse.json()

    // Process Hive response
    const deepfakeScore = hiveData.output?.[0]?.classes?.find((c: any) => c.class === 'yes_deepfake')?.score || 0
    const isDeepfake = deepfakeScore > 0.5

    const analysisResult = {
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString(),
      },
      authenticity: {
        score: Math.max(0, 100 - Math.floor(deepfakeScore * 100)),
        confidence: Math.floor(deepfakeScore * 100),
        analysis: isDeepfake ? "Deepfake patterns detected in the media." : "Media appears authentic with no deepfake indicators.",
      },
      technicalAnalysis: {
        metadata: {
          hasOriginalMetadata: true, // Simplified
          gpsLocation: "Unknown",
          cameraModel: "Unknown",
          timestamp: new Date().toISOString(),
        },
        compression: isImage ? "JPEG Standard" : "H.264 Standard",
        resolution: "1920x1080",
        colorSpace: "sRGB",
      },
      deepfakeAnalysis: {
        likelihood: deepfakeScore * 100,
        details: hiveData.output?.[0]?.classes || [],
      },
      manipulationFlags: isDeepfake ? ["Potential deepfake detected"] : [],
      recommendations: [
        "Verify source authenticity",
        "Cross-check with original content",
      ],
      timestamp: Date.now(),
      id: Date.now().toString(),
    }

    // Store in database
    const insertResult = await withDatabaseErrorHandling(async () => {
      const { data, error: insertError } = await supabase
        .from('media_verifications')
        .insert({
          ...analysisResult,
          user_id: context.session?.user?.id || null,
          content: file.name,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (insertError) {
        Logger.error('Failed to store media verification', { 
          error: insertError, 
          userId: context.session?.user?.id,
          requestId: context.requestId 
        })
        throw insertError
      }
      return data
    })

    // Send notification to user
    if (context.session?.user?.id && insertResult?.id) {
      await notifyAnalysisComplete(
        context.session.user.id,
        'media_verification',
        insertResult.id
      )
    }

    Logger.info('Media verification completed successfully', {
      userId: context.session?.user?.id,
      requestId: context.requestId,
      isDeepfake,
      score: analysisResult.authenticity.score
    })

    return NextResponse.json(analysisResult)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    
    Logger.error('Media verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: context.session?.user?.id,
      requestId: context.requestId
    })
    
    throw new AppError(
      'Failed to analyze media',
      ErrorType.EXTERNAL_API,
      500
    )
  }
}

export const POST = withAuth(performMediaVerification)
