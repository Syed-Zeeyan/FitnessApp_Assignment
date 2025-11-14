/**
 * Simple test endpoint to verify environment variables
 * This will help us see exactly what Vercel is providing
 */

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get the raw environment variable
  const rawGeminiKey = process.env.GEMINI_API_KEY
  
  // Check all possible variations
  const allPossibleKeys = [
    'GEMINI_API_KEY',
    'GEMINI_API_KEY ',
    ' GEMINI_API_KEY',
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_GEMINI_API_KEY', // Just in case
  ]
  
  const foundKeys: Record<string, any> = {}
  
  for (const key of allPossibleKeys) {
    const value = process.env[key]
    if (value) {
      foundKeys[key] = {
        exists: true,
        length: value.length,
        firstChars: value.substring(0, 15),
        lastChars: value.substring(value.length - 5),
      }
    }
  }
  
  // Get ALL environment variables (filtered for security)
  const allEnvVars = Object.keys(process.env)
    .filter(key => 
      key.toUpperCase().includes('GEMINI') || 
      key.toUpperCase().includes('API') ||
      key.toUpperCase().includes('VERCEL')
    )
    .reduce((acc, key) => {
      const value = process.env[key]
      acc[key] = {
        exists: !!value,
        length: value?.length || 0,
        preview: value ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}` : 'NOT SET'
      }
      return acc
    }, {} as Record<string, any>)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    rawCheck: {
      GEMINI_API_KEY_exists: !!rawGeminiKey,
      GEMINI_API_KEY_length: rawGeminiKey?.length || 0,
      GEMINI_API_KEY_value: rawGeminiKey ? `${rawGeminiKey.substring(0, 15)}...` : 'NOT FOUND',
    },
    allPossibleKeys: foundKeys,
    allEnvVarsWithGeminiOrAPI: allEnvVars,
    vercelInfo: {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
    instructions: {
      step1: "If GEMINI_API_KEY_exists is false, the variable is not set in Vercel",
      step2: "Go to Vercel Dashboard → Settings → Environment Variables",
      step3: "Make sure GEMINI_API_KEY is set for Production, Preview, AND Development",
      step4: "After adding/updating, click 'Redeploy' on the latest deployment",
      step5: "Wait for deployment to complete, then check this endpoint again"
    }
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}

