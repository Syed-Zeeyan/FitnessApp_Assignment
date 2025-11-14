/**
 * Verify API key and test direct REST API call
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

    // First, try to list available models using the REST API
    let availableModels: string[] = []
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      const listResponse = await fetch(listUrl)
      if (listResponse.ok) {
        const listData = await listResponse.json()
        availableModels = listData.models?.map((m: any) => m.name?.replace('models/', '')) || []
      }
    } catch (e) {
      console.log("Could not list models, will test individually")
    }

    // Test with direct REST API call to verify the key works
    // Free tier typically only has access to flash models
    const testModels = [
      "gemini-1.5-flash",           // Most common for free tier
      "gemini-1.5-flash-8b",        // Smaller flash variant
      "gemini-1.5-flash-latest",    // Latest flash
      "gemini-1.5-pro",             // Pro (may require paid tier)
      "gemini-pro",                 // Legacy
      "gemini-1.0-pro",             // Older version
    ]
    
    const results: any[] = []
    
    for (const modelName of testModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Say 'test'"
              }]
            }]
          }),
        })
        
        const data = await response.json()
        
        if (response.ok) {
          results.push({
            model: modelName,
            status: "available",
            working: true,
          })
        } else {
          results.push({
            model: modelName,
            status: "not available",
            working: false,
            error: data.error?.message || `HTTP ${response.status}`,
            statusCode: response.status,
          })
        }
      } catch (error: any) {
        results.push({
          model: modelName,
          status: "error",
          working: false,
          error: error.message,
        })
      }
    }
    
    // Find which models work
    const workingModels = results.filter(r => r.working === true)
    
    return NextResponse.json({
      apiKeyConfigured: true,
      apiKeyPrefix: apiKey.substring(0, 15) + "...",
      availableModelsFromAPI: availableModels,
      testResults: results,
      workingModels: workingModels.map(r => r.model),
      note: workingModels.length === 0 
        ? "No models are working. Free tier API keys typically only have access to 'gemini-1.5-flash'. Make sure the Generative AI API is enabled in your Google Cloud project."
        : `Found ${workingModels.length} working model(s). Use these in your app.`,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

