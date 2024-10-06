import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { title, transcript, duration } = await request.json()
    const prompt = `以下は「${title}」というタイトルの発表の文字起こしです。発表は${duration}続きました。下記内容を1200文字以内で要約してください：\n\n${transcript}`

    const completion = await openai.chat.completions.create({
      model: "claude-3-5-sonnet-20240620", 
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6000,  // 1200文字に相当
    })

    if (!completion.choices?.[0]?.message?.content) {
      console.error('Error calling OpenAI API: Invalid response format', completion)
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
    }
    
    return NextResponse.json({ summary: completion.choices[0].message.content.trim() })
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}