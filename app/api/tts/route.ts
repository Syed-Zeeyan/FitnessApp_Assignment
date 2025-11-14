/**
 * API Route: /api/tts
 * 
 * Text-to-Speech API using ElevenLabs
 * 
 * Request Body:
 * - type: "workout" | "diet" | "voice-coach"
 * - text: string (content to convert to speech)
 * 
 * Environment Variable Required:
 * - ELEVENLABS_API_KEY: Your ElevenLabs API key
 * - ELEVENLABS_VOICE_ID: (Optional) Voice ID, defaults to "21m00Tcm4TlvDq8ikWAM"
 * 
 * Response:
 * - For "workout" or "diet": Returns audio/mpeg binary
 * - For "voice-coach": Returns JSON with audioBase64 field
 */

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, text } = body

    // Validate input
    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Type is required and must be a string" },
        { status: 400 }
      )
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    const validTypes = ["workout", "diet", "voice-coach"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Use ElevenLabs API
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM" // Default voice: Rachel
    
    // Trim API key to remove any whitespace
    const apiKey = process.env.ELEVENLABS_API_KEY.trim()
    
    // Validate API key format (should start with 'sk_')
    if (!apiKey.startsWith('sk_')) {
      console.error("Invalid ElevenLabs API key format. Key should start with 'sk_'")
      return NextResponse.json(
        {
          error: "Invalid API key format",
          details: "ElevenLabs API key should start with 'sk_'. Please check your ELEVENLABS_API_KEY.",
        },
        { status: 400 }
      )
    }
    
    // Adjust voice settings based on type
    const voiceSettings = {
      stability: type === "voice-coach" ? 0.6 : 0.5,
      similarity_boost: type === "voice-coach" ? 0.8 : 0.75,
    }

    // Try multiple models in order of preference (newer models first)
    const modelsToTry = [
      "eleven_turbo_v2_5",      // Latest turbo model (fastest)
      "eleven_turbo_v2",        // Previous turbo
      "eleven_multilingual_v2", // Multilingual support
      "eleven_monolingual_v1",  // Legacy (may be deprecated)
    ]

    let response
    let lastError: any = null

    // Try each model until one works
    for (const modelId of modelsToTry) {
      try {
        console.log(`[TTS] Trying model: ${modelId}`)
        response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            text: text.trim(),
            model_id: modelId,
            voice_settings: voiceSettings,
          },
          {
            headers: {
              Accept: "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": apiKey,
            },
            responseType: "arraybuffer",
          }
        )
        console.log(`[TTS] Successfully used model: ${modelId}`)
        break
      } catch (error: any) {
        console.log(`[TTS] Model ${modelId} failed:`, error.response?.status, error.response?.statusText)
        lastError = error
        
        // If it's a 401 (auth error), don't try other models
        if (error.response?.status === 401) {
          break
        }
        
        // If it's a 404 (model not found), try next model
        if (error.response?.status === 404) {
          continue
        }
        
        // For other errors, try next model
        continue
      }
    }

    // If all models failed
    if (!response) {
      if (lastError?.response?.status === 401) {
        return NextResponse.json(
          {
            error: "Authentication failed: Invalid ElevenLabs API key",
            details: "Please verify your ELEVENLABS_API_KEY is correct. You can get a new key from https://elevenlabs.io/",
          },
          { status: 401 }
        )
      }
      throw lastError || new Error("Failed to generate speech with all models")
    }

    // For voice-coach type, return JSON with base64 audio
    if (type === "voice-coach") {
      // Convert arraybuffer to base64
      const audioBuffer = Buffer.from(response.data)
      const audioBase64 = audioBuffer.toString("base64")
      const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`

      return NextResponse.json({
        audioUrl: audioDataUrl,
        audioBase64: audioBase64,
        contentType: "audio/mpeg",
      })
    }

    // For workout and diet types, return binary audio (existing behavior)
    return new NextResponse(response.data, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${type}-audio.mp3"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("Error generating TTS:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: error.message,
        },
        { status: 400 }
      )
    }

    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return NextResponse.json(
        {
          error: "Network error: Unable to connect to TTS service",
          details: error.message,
        },
        { status: 503 }
      )
    }

    // Handle API key errors
    if (error.response?.status === 401) {
      const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || ""
      const keyPrefix = apiKey.substring(0, 10) + "..."
      
      return NextResponse.json(
        {
          error: "Authentication failed: Invalid ElevenLabs API key",
          details: "Your API key may be invalid, expired, or doesn't have the required permissions.",
          troubleshooting: [
            "1. Verify your API key at https://elevenlabs.io/app/settings/api-keys",
            "2. Make sure the key starts with 'sk_'",
            "3. Check that your account has available credits",
            "4. Test your key at: http://localhost:3000/api/tts/test",
          ],
          keyPrefix: keyPrefix,
        },
        { status: 401 }
      )
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded: Too many requests",
          details: "Please try again later",
        },
        { status: 429 }
      )
    }

    // Handle quota exceeded
    if (error.response?.status === 403) {
      return NextResponse.json(
        {
          error: "Quota exceeded: ElevenLabs API quota limit reached",
          details: "Please upgrade your plan or try again later",
        },
        { status: 403 }
      )
    }

    // Handle invalid text length
    if (error.response?.status === 400 && error.response?.data) {
      return NextResponse.json(
        {
          error: "Invalid request: Text may be too long or contain invalid characters",
          details: error.response.data.message || error.message,
        },
        { status: 400 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    )
  }
}
