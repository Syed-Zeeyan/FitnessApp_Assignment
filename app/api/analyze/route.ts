/**
 * API Route: /api/analyze
 * 
 * Photo-Based Body Analysis API using Gemini Vision
 * 
 * Request:
 * - FormData with "image" field containing image file (jpeg/png)
 * 
 * Response:
 * - Success: { success: true, data: { gender, fitnessLevel, bodyFat, weightRange, posture } }
 * - Error: { success: false, error: "message" }
 * 
 * Environment Variable Required:
 * - GEMINI_API_KEY: Your Google Gemini API key
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"
import { getModelsToTry } from "../utils/get-available-models"

// Initialize Gemini client function
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured")
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Initialize Gemini client
    const genAI = getGenAI()

    // Parse FormData
    const formData = await request.formData()
    const imageFile = formData.get("image") as File

    // Validate image file exists
    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "Missing image file" },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only JPEG and PNG images are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "Image size must be less than 10MB" },
        { status: 400 }
      )
    }

    // Convert image to base64
    let base64Image: string
    let mimeType: string
    try {
      const arrayBuffer = await imageFile.arrayBuffer()
      base64Image = Buffer.from(arrayBuffer).toString("base64")
      mimeType = imageFile.type
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: "Failed to process image file" },
        { status: 400 }
      )
    }

    // Get available models (will query API or use fallback list)
    // Vision models support multimodal input (text + images)
    const modelNames = await getModelsToTry(process.env.GEMINI_API_KEY!)

    // Create structured prompt for body analysis
    const prompt = `Analyze this person's body and estimate:
    - gender (if clear)
    - approximate fitness level (Beginner / Intermediate / Advanced)
    - estimated body fat %
    - approximate weight range
    - posture quality (Good / Average / Poor)

Only respond in JSON format with these keys:
{
  "gender": "",
  "fitnessLevel": "",
  "bodyFat": "",
  "weightRange": "",
  "posture": ""
}`

    // Generate analysis using Gemini Vision
    // Try each model until one works
    let result
    let lastError: any = null
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying vision model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        result = await model.generateContent([
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          prompt,
        ])
        console.log(`Successfully used vision model: ${modelName}`)
        break
      } catch (error: any) {
        console.log(`Vision model ${modelName} failed:`, {
          message: error.message,
          status: error.status,
        })
        lastError = error
        
        // For 503 (overloaded) or 404 (not found), try next model
        // For other errors (401, 403, 500), don't try other models
        if (error.status === 503 || error.status === 404 || error.status === 400) {
          // Model is overloaded or not found, try next one
          continue
        }
        
        // For other errors, stop trying
        break
      }
    }
    
    // If all models failed
    if (!result) {
      if (lastError?.status === 503) {
        return NextResponse.json(
          {
            success: false,
            error: `All models are currently overloaded. Please try again in a few moments. Tried: ${modelNames.join(", ")}`,
          },
          { status: 503 }
        )
      }
      if (lastError?.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: `No available vision models found. Tried: ${modelNames.join(", ")}. Your API key may not have access to these models. Please check your Google AI Studio account.`,
          },
          { status: 404 }
        )
      }
    }
    
    // Handle other errors
    if (!result && lastError) {
      // Handle Gemini API errors
      console.error("Gemini API error details:", lastError)
      
      if (lastError.status === 401 || lastError.message?.includes("API key")) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication failed: Invalid GEMINI_API_KEY",
          },
          { status: 401 }
        )
      }

      if (lastError.status === 404 || lastError.message?.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: `Model not found. Tried: ${modelNames.join(", ")}. Your API key may not have access to these models. Please check your Google AI Studio account.`,
          },
          { status: 404 }
        )
      }

      if (lastError.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded. Please try again later",
          },
          { status: 429 }
        )
      }

      if (lastError.status === 400 || lastError.message?.includes("safety")) {
        return NextResponse.json(
          {
            success: false,
            error: "Image content violates safety policies",
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: lastError.message || "Unknown error occurred during analysis",
        },
        { status: 500 }
      )
    }

    // TypeScript guard: ensure result is defined
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate analysis. Please try again.",
        },
        { status: 500 }
      )
    }

    const response = await result.response
    const text = response.text()

    // Parse JSON from response
    let parsedResponse: {
      gender?: string
      fitnessLevel?: string
      bodyFat?: string
      weightRange?: string
      posture?: string
    }

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : text
      parsedResponse = JSON.parse(jsonString.trim())
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the text
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}") + 1
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonString = text.substring(jsonStart, jsonEnd)
        parsedResponse = JSON.parse(jsonString)
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid response format from AI",
          },
          { status: 500 }
        )
      }
    }

    // Validate response structure
    if (
      !parsedResponse.gender ||
      !parsedResponse.fitnessLevel ||
      !parsedResponse.bodyFat ||
      !parsedResponse.weightRange ||
      !parsedResponse.posture
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Incomplete analysis data received",
        },
        { status: 500 }
      )
    }

    // Return success response with data
    return NextResponse.json({
      success: true,
      data: {
        gender: parsedResponse.gender,
        fitnessLevel: parsedResponse.fitnessLevel,
        bodyFat: parsedResponse.bodyFat,
        weightRange: parsedResponse.weightRange,
        posture: parsedResponse.posture,
      },
    })
  } catch (error: any) {
    console.error("Error analyzing body image:", error)

    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return NextResponse.json(
        {
          success: false,
          error: "Network error: Unable to connect to analysis service",
        },
        { status: 503 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response",
        },
        { status: 500 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error occurred during analysis",
      },
      { status: 500 }
    )
  }
}
