'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Play, Square, RotateCcw, Palette, Plus, RefreshCw } from "lucide-react"
import { HexColorPicker } from "react-colorful"

export function AppPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [transcript, setTranscript] = useState('')
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
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }

        setTranscript(finalTranscript + interimTranscript)
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
    audioPlayed.current = false; // タイマー開始時に音声再生済みフラグをリセット
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
    intervalRef.current = setInterval(() => {
      setTime((prevTime) => {
        if (prevTime < timeLimit) {
          // 残り時間3分前になったら、音声ファイルを再生
          if (timeLimit - prevTime === 3 * 60 && !audioPlayed.current) {
            const audio = new Audio('/sound/limit2.wav'); // 音声ファイルのパスを指定
            audio.play();
            audioPlayed.current = true; // 音声再生済みフラグを立てる
          }
          // 残り時間1分前になったら、音声ファイルを再生
          if (timeLimit - prevTime === 1 * 60 && !audioPlayed.current) {
            const audio = new Audio('/sound/limit2.wav'); // 音声ファイルのパスを指定
            audio.play();
            audioPlayed.current = true; // 音声再生済みフラグを立てる
          }
          return prevTime + 1
        } else {
          stopTimer()
          return timeLimit
        }
      })
    }, 1000)
  }

  const stopTimer = () => {
    setIsRunning(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    generateSummary()
  }

  const resetTimer = () => {
    stopTimer()
    setTime(0)
    setTranscript('')
    setSummary('')
    audioPlayed.current = false; // タイマーリセット時に音声再生済みフラグをリセット
  }

  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const dummySummary = await dummyApiCall(transcript, 1200)
      setSummary(`タイトル: ${title}\n\n発表者: ${name}\n\n要約:\n${dummySummary}`)
    } catch (error) {
      console.error('Error generating summary:', error)
      setSummary('要約の生成中にエラーが発生しました。')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const dummyApiCall = (text: string, maxLength: number): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dummySummary = `これは「${title}」というタイトルの発表の要約です。発表は${Math.floor(time / 60)}分${time % 60}秒続きました。主な内容は以下の通りです：\n\n1. ポイント1\n2. ポイント2\n3. ポイント3\n\n(ここに実際の要約が入ります。この要約は1200文字以内に制限されています。)`
        resolve(dummySummary.slice(0, maxLength))
      }, 2000)
    })
  }

  const increaseTimeLimit = () => {
    setTimeLimit(prevLimit => prevLimit + 5 * 60)
  }

  const resetTimeLimit = () => {
    setTimeLimit(5 * 60)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="container mx-auto p-4" style={{ '--card-color': cardColor } as React.CSSProperties}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">LTファシリシステム</h1>
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
                <Button onClick={increaseTimeLimit} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  5分追加
                </Button>
                <Button onClick={resetTimeLimit} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  リセット
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
          <div className="text-4xl font-bold mb-4">
            {formatTime(timeLimit - time)}
          </div>
          <div className="flex space-x-2 mb-4">
            <Button onClick={startTimer} disabled={isRunning}>
              <Play className="mr-2 h-4 w-4" />
              開始
            </Button>
            <Button onClick={stopTimer} disabled={!isRunning}>
              <Square className="mr-2 h-4 w-4" />
              停止
            </Button>
            <Button onClick={resetTimer} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              リセット
            </Button>
          </div>
          <Textarea
            className="mt-4"
            placeholder="音声認識の結果がここに表示されます"
            value={transcript}
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