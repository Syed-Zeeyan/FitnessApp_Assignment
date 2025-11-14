/**
 * List available models using the REST API
 */

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

    // List available models using REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to list models",
          details: data.error?.message || `HTTP ${response.status}`,
          statusCode: response.status,
        },
        { status: response.status }
      )
    }
    
    // Extract model names and filter for generateContent capability
    const models = data.models?.map((model: any) => {
      const modelName = model.name?.replace('models/', '') || model.name
      return {
        name: modelName,
        displayName: model.displayName,
        description: model.description,
        supportedGenerationMethods: model.supportedGenerationMethods || [],
        canGenerateContent: model.supportedGenerationMethods?.includes('generateContent') || false,
      }
    }).filter((m: any) => m.canGenerateContent) || []
    
    return NextResponse.json({
      success: true,
      totalModels: models.length,
      models: models,
      note: "These are the models your API key can access. Use the 'name' field in your code.",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to list models",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

