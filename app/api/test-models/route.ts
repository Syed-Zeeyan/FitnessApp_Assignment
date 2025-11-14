/**
 * Test endpoint to verify API key and list available models
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Try to list available models
    try {
      // Note: The SDK doesn't have a direct listModels method
      // So we'll test each model by trying to create it
      const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-2.0-flash-exp",
        "gemini-1.0-pro",
      ]
      
      const results: any[] = []
      
      for (const modelName of modelsToTest) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          // Try a simple test call
          const result = await model.generateContent("Say 'test'")
          const response = await result.response
          const text = response.text()
          
          results.push({
            model: modelName,
            status: "available",
            testResponse: text.substring(0, 50),
          })
        } catch (error: any) {
          results.push({
            model: modelName,
            status: "not available",
            error: error.message,
            statusCode: error.status,
          })
        }
      }
      
      return NextResponse.json({
        apiKeyConfigured: true,
        apiKeyPrefix: apiKey.substring(0, 10) + "...",
        models: results,
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          error: "Failed to test models",
          details: error.message,
        },
        { status: 500 }
      )
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

