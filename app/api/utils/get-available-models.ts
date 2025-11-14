/**
 * Helper function to get available Gemini models for the API key
 * This function queries the Gemini API to find which models are actually available
 */

export async function getAvailableModels(apiKey: string): Promise<string[]> {
  try {
    // Try to list available models using REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.warn(`[getAvailableModels] Failed to list models: ${response.status}`)
      return [] // Return empty array, will fall back to common models
    }
    
    const data = await response.json()
    
    // Extract model names that support generateContent
    const models = data.models?.filter((model: any) => 
      model.supportedGenerationMethods?.includes('generateContent')
    ).map((model: any) => {
      // Remove 'models/' prefix if present
      const name = model.name?.replace('models/', '') || model.name
      return name
    }) || []
    
    console.log(`[getAvailableModels] Found ${models.length} available models:`, models)
    return models
  } catch (error: any) {
    console.warn(`[getAvailableModels] Error fetching models:`, error.message)
    return [] // Return empty array, will fall back to common models
  }
}

/**
 * Get model names to try, prioritizing stable models over preview/experimental ones
 */
export async function getModelsToTry(apiKey: string): Promise<string[]> {
  // First, try to get available models from API
  const availableModels = await getAvailableModels(apiKey)
  
  // If we got models from the API, prioritize stable models
  if (availableModels.length > 0) {
    // Filter out preview/experimental models (they're often overloaded)
    const stableModels = availableModels.filter(m => 
      !m.includes('preview') && 
      !m.includes('experimental') && 
      !m.includes('exp') &&
      !m.includes('beta')
    )
    
    // Separate by type - prioritize Gemini models over Gemma models
    // Gemini models are better at generating valid JSON
    const geminiFlash = stableModels.filter(m => 
      m.includes('flash') && 
      m.startsWith('gemini') &&
      (m.includes('2.5') || m.includes('2.0') || m.includes('1.5') || m.includes('1.0'))
    )
    const geminiPro = stableModels.filter(m => 
      m.includes('pro') && 
      !m.includes('flash') &&
      m.startsWith('gemini') &&
      (m.includes('2.5') || m.includes('2.0') || m.includes('1.5') || m.includes('1.0'))
    )
    const otherGemini = stableModels.filter(m => 
      m.startsWith('gemini') &&
      !m.includes('flash') && 
      !m.includes('pro')
    )
    // Gemma models last (they're smaller and less reliable for JSON)
    const gemmaModels = stableModels.filter(m => m.startsWith('gemma'))
    const otherStable = stableModels.filter(m => 
      !m.startsWith('gemini') && 
      !m.startsWith('gemma')
    )
    
    // Preview models as last resort (often overloaded)
    const previewModels = availableModels.filter(m => 
      m.includes('preview') || 
      m.includes('experimental') || 
      m.includes('exp')
    )
    
    // Return stable models first, then preview models
    // Prioritize Gemini models (better JSON generation) over Gemma
    return [
      ...geminiFlash,      // Gemini flash models (best for JSON)
      ...geminiPro,        // Gemini pro models
      ...otherGemini,      // Other Gemini models
      ...otherStable,      // Other stable models
      ...gemmaModels,      // Gemma models last (smaller, less reliable for JSON)
      ...previewModels,    // Preview models last (often overloaded)
    ]
  }
  
  // Fallback to common stable model names if API listing failed
  // These are ordered by stability and availability
  return [
    "gemini-1.5-flash",           // Most stable and common for free tier
    "gemini-1.5-flash-8b",        // Smaller flash variant
    "gemini-1.5-flash-latest",    // Latest stable flash
    "gemini-1.5-pro",             // Stable pro (may require paid tier)
    "gemini-1.0-pro",             // Older stable version
    "gemini-pro",                 // Legacy (may not be available)
  ]
}

