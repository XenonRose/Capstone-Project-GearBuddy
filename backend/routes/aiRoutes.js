import express from 'express'
import { GoogleGenAI } from '@google/genai'

const router = express.Router()

const allowedServices = [
  'Brake service',
  'Oil change',
  'Tire service',
  'Vehicle inspection',
  'Battery service',
  'Vehicle diagnostics',
]

const responseSchema = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
    },
    services: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            enum: allowedServices,
          },
          reason: {
            type: 'string',
          },
        },
        required: ['name', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['text', 'services'],
  additionalProperties: false,
}

function getSafeDiagnosticCode(error) {
  if (error?.status) {
    return `HTTP_${error.status}`
  }

  if (
    typeof error?.code === 'string' &&
    /^[A-Z0-9_]{1,40}$/.test(error.code)
  ) {
    return error.code
  }

  if (error?.name === 'SyntaxError') {
    return 'INVALID_MODEL_JSON'
  }

  if (
    typeof error?.name === 'string' &&
    /^[A-Za-z0-9_]{1,40}$/.test(error.name)
  ) {
    return error.name.toUpperCase()
  }

  return 'UNKNOWN_ERROR'
}

router.post('/troubleshoot', async (request, response) => {
  const problem =
    typeof request.body?.problem === 'string'
      ? request.body.problem.trim()
      : ''

  if (!problem) {
    return response.status(400).json({
      status: 'error',
      message: 'Describe the vehicle problem first.',
    })
  }

  if (problem.length > 400) {
    return response.status(400).json({
      status: 'error',
      message: 'Keep the problem description under 400 characters.',
    })
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (!apiKey) {
    return response.status(503).json({
      status: 'error',
      message: 'The GearBuddy AI service is not configured.',
    })
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 120000,
        retryOptions: {
          attempts: 1,
        },
      },
    })

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: `The vehicle owner describes this problem: ${problem}`,
      config: {
        systemInstruction: `
You are GearBuddy, a careful vehicle-troubleshooting assistant.
Give general information only. Do not claim to diagnose the vehicle.
Use plain, beginner-friendly language and keep the response concise.
If the symptoms suggest immediate danger, such as brake failure, smoke,
fire, fuel smell, loss of steering, or severe overheating, tell the person
to stop somewhere safe and contact a qualified professional or emergency
roadside service. Do not give instructions for dangerous repairs.
Recommend one to three relevant services from the provided list only.
Do not invent repair prices, appointment availability, or local shop details.
If the symptom is unclear, ask one short follow-up question and suggest
Vehicle diagnostics.
        `.trim(),
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    })

    if (!result.text) {
      throw new Error('The AI service returned an empty response.')
    }

    const generated = JSON.parse(result.text)
    const validServices = Array.isArray(generated.services)
      ? generated.services
          .filter(
            (service) =>
              service &&
              allowedServices.includes(service.name) &&
              typeof service.reason === 'string',
          )
          .slice(0, 3)
          .map((service) => ({
            name: service.name,
            reason: service.reason.trim().slice(0, 300),
          }))
      : []

    if (typeof generated.text !== 'string' || validServices.length === 0) {
      throw new Error('The AI service returned an incomplete response.')
    }

    return response.status(200).json({
      text: generated.text.trim().slice(0, 1600),
      services: validServices,
    })
  } catch (error) {
    const diagnostic = getSafeDiagnosticCode(error)

    console.error(`Gemini troubleshooting request failed: ${diagnostic}`)

    return response.status(502).json({
      status: 'error',
      message: 'GearBuddy could not get an AI response. Please try again.',
      diagnostic: {
        stage: 'Gemini response generation',
        code: diagnostic,
      },
    })
  }
})

export default router