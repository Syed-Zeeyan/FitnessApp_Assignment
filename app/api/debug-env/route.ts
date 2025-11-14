/**
 * Debug endpoint to check environment variables
 * This helps diagnose Vercel environment variable issues
 */

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY
    const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID
    const openaiKey = process.env.OPENAI_API_KEY
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

    // Get all env vars that start with GEMINI, ELEVENLABS, OPENAI, or UNSPLASH
    const allEnvVars = Object.keys(process.env)
      .filter(key => 
        key.includes('GEMINI') || 
        key.includes('ELEVENLABS') || 
        key.includes('OPENAI') || 
        key.includes('UNSPLASH')
      )
      .reduce((acc, key) => {
        acc[key] = process.env[key] ? 
          `${process.env[key]?.substring(0, 10)}...${process.env[key]?.substring(process.env[key]!.length - 5)}` : 
          'NOT SET'
        return acc
      }, {} as Record<string, string>)

    return NextResponse.json({
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL ? 'true' : 'false',
      vercelEnv: process.env.VERCEL_ENV || 'not set',
      variables: {
        GEMINI_API_KEY: {
          exists: !!geminiKey,
          length: geminiKey?.length || 0,
          prefix: geminiKey?.substring(0, 10) || 'N/A',
          suffix: geminiKey?.substring(geminiKey.length - 5) || 'N/A',
        },
        ELEVENLABS_API_KEY: {
          exists: !!elevenLabsKey,
          length: elevenLabsKey?.length || 0,
          prefix: elevenLabsKey?.substring(0, 10) || 'N/A',
        },
        ELEVENLABS_VOICE_ID: {
          exists: !!elevenLabsVoiceId,
          value: elevenLabsVoiceId || 'NOT SET',
        },
        OPENAI_API_KEY: {
          exists: !!openaiKey,
          length: openaiKey?.length || 0,
        },
        UNSPLASH_ACCESS_KEY: {
          exists: !!unsplashKey,
          length: unsplashKey?.length || 0,
        },
      },
      allRelatedEnvVars: allEnvVars,
      note: "If GEMINI_API_KEY.exists is false, the environment variable is not being read by the server."
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

