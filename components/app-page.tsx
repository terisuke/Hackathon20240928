'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Play, Square, RotateCcw, Palette, Plus } from "lucide-react"
import { HexColorPicker } from "react-colorful"

export function AppPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [transcripts, setTranscripts] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [cardColor, setCardColor] = useState('#ffffff')
  const [timeLimit, setTimeLimit] = useState(5 * 60) // Initial time limit of 5 minutes in seconds

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioPlayed = useRef(false) // 音声再生済みフラグ

  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }

        if (finalTranscript) {
          setTranscripts(prev => [...prev, finalTranscript])
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--card-color', cardColor)
  }, [cardColor])

  const startTimer = () => {
    setIsRunning(true)
    audioPlayed.current = false; // タイマ開始時に音声再生済ラグをリセット
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
    intervalRef.current = setInterval(() => {
      setTime((prevTime) => {
        // 残り時間1分前になったら、音声ファイルを再生
        if (timeLimit - prevTime === 1 * 60 && !audioPlayed.current) {
          const audio = new Audio('/sound/warming.wav');
          audio.play();
          audioPlayed.current = true;
        }
        // タイムリミットに達したら、ベルを再生
        if (prevTime >= timeLimit) {
          const endAudio = new Audio('/sound/Bell_Accent_High.mp3');
          endAudio.play();
        }
        return prevTime + 1; // 常にタイマーを継続
      });
    }, 1000);
  }

  const stopTimer = () => {
    setIsRunning(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    // generateSummary()の呼び出しを削除
  }

  const resetAll = () => {
    // タイマーを停止
    stopTimer()
    
    // 各種状態をリセット
    setTimeLimit(5 * 60)
    setTime(0)
    setTranscripts([])
    setSummary('')
    setTitle('')
    setName('')
    setIsGeneratingSummary(false)
    
    // 音声再生フラグをリセット
    audioPlayed.current = false
  }

  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY;
      if (!apiKey) {
        throw new Error('Dify API key is not set');
      }
      const apiUrl = process.env.NEXT_PUBLIC_DIFY_API_URL;
      if (!apiUrl) {
        throw new Error('Dify API URL is not set');
      }

      // 改行を空白に置き換えて、transcriptsを結合
      const query = transcripts.join(' ').replace(/\n/g, ' ');

      const response = await fetch(`${apiUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {},
          query: query, // 修正したqueryを使用
          response_mode: 'streaming',
          conversation_id: '',
          user: 'user-123'
        })
      })

      if (response.ok) {
        const reader = response.body?.getReader()
        let result = ''

        while (true) {
          const readResult = await reader?.read()
          if (!readResult) break
          const { done, value } = readResult

          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))
              if (data.event === 'message') {
                result += data.answer
                // タイトルとスピーカー名を追加して要約を設定
                setSummary(`# タイトル: ${title}\n#スピーカー: ${name}\n\n${result}`)
              }
            }
          }
        }
      } else {
        console.error('API request failed')
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary('要約の生成中にエラーが発生しました。');
    } finally {
      setIsGeneratingSummary(false);
    }
  }


  const increaseTimeLimit5min = () => {
    setTimeLimit(prevLimit => prevLimit + 5 * 60)
  }
  const increaseTimeLimit1min = () => {
    setTimeLimit(prevLimit => prevLimit + 1 * 60)
  }

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds)
    const minutes = Math.floor(absSeconds / 60)
    const remainingSeconds = absSeconds % 60
    const sign = seconds < 0 ? '-' : ''
    return `${sign}${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerDisplay = () => {
    const remainingTime = timeLimit - time
    const isOvertime = remainingTime < 0

    return (
      <div className={`text-4xl font-bold mb-4 ${isOvertime ? 'text-red-600' : ''}`}>
        {formatTime(remainingTime)}
      </div>
    )
  }


  const handleSummaryGeneration = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    generateSummary() // 直接generateSummaryを呼び出す
  }

  return (
    <div className="container mx-auto p-4" style={{ '--card-color': cardColor } as React.CSSProperties}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">LT・会議ファシリテーションシステム</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-10 rounded-full p-0">
              <Palette className="h-4 w-4" />
              <span className="sr-only">カードカラーピッカーを開く</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">カードカラー</h4>
                <p className="text-sm text-muted-foreground">
                  カードの背景色を選択してください。
                </p>
              </div>
              <HexColorPicker color={cardColor} onChange={setCardColor} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <Card className="mb-4" style={{ backgroundColor: cardColor }}>
        <CardHeader>
          <CardTitle>発表者情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">名前</Label>
              <Input 
                id="name" 
                placeholder="発表者の名前" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="title">発表タイトル</Label>
              <Input 
                id="title" 
                placeholder="発表のタイトル" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">制限時間: {formatTime(timeLimit)}</div>
              <div className="flex space-x-2">
                <Button onClick={increaseTimeLimit5min} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  5分追加
                </Button>
                <Button onClick={increaseTimeLimit1min} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  1分追加
                </Button>
                <Button onClick={resetAll} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  全てリセット
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4" style={{ backgroundColor: cardColor }}>
        <CardHeader>
          <CardTitle>タイムキーパー & 音声認識</CardTitle>
        </CardHeader>
        <CardContent>
          {getTimerDisplay()}
          <div className="flex space-x-2 mb-4">
            <Button onClick={startTimer} disabled={isRunning}>
              <Play className="mr-2 h-4 w-4" />
              開始
            </Button>
            <Button onClick={stopTimer} disabled={!isRunning}>
              <Square className="mr-2 h-4 w-4" />
              停止
            </Button>
            <Button onClick={handleSummaryGeneration} disabled={isGeneratingSummary}>
                要約を生成
              </Button>
          </div>
          <Textarea
            className="mt-4"
            placeholder="音声認識の結果がここに表示されます"
            value={transcripts.join('\n')}
            readOnly
            rows={5}
          />
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: cardColor }}>
        <CardHeader>
          <CardTitle>要約: {title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isGeneratingSummary ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Textarea
              className="mt-4"
              placeholder="要約の結果がここに表示されます"
              value={summary}
              readOnly
              rows={10}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}