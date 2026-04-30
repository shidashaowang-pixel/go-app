import { useState, useCallback, useRef } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseSGF, type SGFParseResult } from '@/lib/sgf';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SGFImportPage() {
  const [sgfText, setSgfText] = useState('');
  const [parsedGame, setParsedGame] = useState<SGFParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    if (!sgfText.trim()) {
      setError('请输入或粘贴 SGF 内容');
      setParsedGame(null);
      return;
    }
    
    const result = parseSGF(sgfText);
    if (result) {
      setParsedGame(result);
      setError(null);
    } else {
      setError('无效的 SGF 格式');
      setParsedGame(null);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSgfText(content);
      const result = parseSGF(content);
      if (result) {
        setParsedGame(result);
        setError(null);
      } else {
        setError('无效的 SGF 格式');
        setParsedGame(null);
      }
    };
    reader.onerror = () => {
      setError('文件读取失败');
    };
    reader.readAsText(file);
  }, []);

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">棋谱导入</h1>
          <p className="text-sm text-muted-foreground">导入 SGF 格式的围棋棋谱</p>
        </div>

        <div className="grid gap-6">
          {/* 上传区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-5 w-5" />
                上传文件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                accept=".sgf,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-dashed"
              >
                <FileText className="w-8 h-8 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">点击选择 .sgf 文件</span>
              </Button>
            </CardContent>
          </Card>

          {/* 粘贴区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                或粘贴 SGF 内容
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={sgfText}
                onChange={(e) => setSgfText(e.target.value)}
                placeholder="粘贴 SGF 内容..."
                className="font-mono text-sm h-40"
              />
              <Button onClick={handleParse} className="w-full">
                解析棋谱
              </Button>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                {error}
              </CardContent>
            </Card>
          )}

          {/* 解析结果 */}
          {parsedGame && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  解析成功！
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">棋盘大小：</span>
                    <span className="font-medium">{parsedGame.boardSize}×{parsedGame.boardSize}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">总手数：</span>
                    <span className="font-medium">{parsedGame.moves.length} 手</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">黑方：</span>
                    <span className="font-medium">{parsedGame.blackPlayer}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">白方：</span>
                    <span className="font-medium">{parsedGame.whitePlayer}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">贴目：</span>
                    <span className="font-medium">{parsedGame.komi}</span>
                  </div>
                  {parsedGame.result && (
                    <div>
                      <span className="text-muted-foreground">结果：</span>
                      <span className="font-medium">{parsedGame.result}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">棋谱预览（前10手）：</p>
                  <div className="flex flex-wrap gap-1">
                    {parsedGame.moves.slice(0, 10).map((move, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          move.color === 'black'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-800 border'
                        }`}
                      >
                        {i + 1}.{move.row >= 0 ? `${String.fromCharCode(65 + move.col)}${parsedGame.boardSize - move.row}` : 'Pass'}
                      </span>
                    ))}
                    {parsedGame.moves.length > 10 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        ... 共 {parsedGame.moves.length} 手
                      </span>
                    )}
                  </div>
                </div>

                <Button className="w-full mt-4" disabled>
                  复盘此棋谱（功能开发中）
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
