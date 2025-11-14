/**
 * Test endpoint to verify ElevenLabs API key
 */

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "ELEVENLABS_API_KEY not configured",
          configured: false,
        },
        { status: 500 }
      )
    }

    const trimmedKey = apiKey.trim()
    
    // Validate format
    if (!trimmedKey.startsWith('sk_')) {
      return NextResponse.json({
        configured: true,
        validFormat: false,
        error: "API key format is invalid. Should start with 'sk_'",
        keyPrefix: trimmedKey.substring(0, 10) + "...",
      })
    }

    // Test with a simple API call to get user info
    try {
      const response = await axios.get(
        "https://api.elevenlabs.io/v1/user",
        {
          headers: {
            "xi-api-key": trimmedKey,
          },
        }
      )

      return NextResponse.json({
        configured: true,
        validFormat: true,
        validKey: true,
        userInfo: {
          subscription: response.data.subscription?.tier || "unknown",
          characterCount: response.data.subscription?.character_count || 0,
          characterLimit: response.data.subscription?.character_limit || 0,
        },
        message: "API key is valid and working!",
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        return NextResponse.json({
          configured: true,
          validFormat: true,
          validKey: false,
          error: "API key is invalid or expired",
          details: "Please check your API key at https://elevenlabs.io/app/settings/api-keys",
          statusCode: 401,
        })
      }

      return NextResponse.json({
        configured: true,
        validFormat: true,
        validKey: false,
        error: "Failed to verify API key",
        details: error.message,
        statusCode: error.response?.status,
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Test failed",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

