import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { title, transcript, duration } = req.body
      const prompt = `以下は「${title}」というタイトルの発表の文字起こしです。発表は${duration}続きました。下記内容を1200文字以内で要約してください：\n\n${transcript}`

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", 
        messages: [{ role: "user", content: prompt }],
        max_tokens: 6000,  // 1200文字に相当
      })
      if (!completion.choices?.[0]?.message?.content) {
        console.error('Error calling OpenAI API: Invalid response format', completion)
        res.status(500).json({ error: 'Failed to generate summary' })
        return
      }
      
      res.status(200).json({ summary: completion.choices[0].message.content.trim() })
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      res.status(500).json({ error: 'Failed to generate summary' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}