import { NextResponse } from 'next/server';

type Cell = 'black' | 'white' | null;
type Board = Cell[][];

interface RequestBody {
  board: Board;
  apiKey: string;
  baseUrl: string;
  model: string;
  currentPlayer: 'black' | 'white';
}

function isValidMove(board: Board, row: number, col: number): boolean {
  return (
    row >= 0 && row < 19 &&
    col >= 0 && col < 19 &&
    board[row][col] === null
  );
}

// 检查是否有获胜条件
function wouldWin(board: Board, row: number, col: number, player: 'black' | 'white'): boolean {
  const directions = [
    [[0, 1], [0, -1]], // horizontal
    [[1, 0], [-1, 0]], // vertical
    [[1, 1], [-1, -1]], // diagonal
    [[1, -1], [-1, 1]] // anti-diagonal
  ];

  // 创建一个临时棋盘，包含预判断的落子
  const tempBoard = [...board.map(row => [...row])];
  tempBoard[row][col] = player;

  return directions.some(direction => {
    let count = 1; // 当前格子
    
    direction.forEach(([dx, dy]) => {
      let x = row + dx;
      let y = col + dy;
      
      while (
        x >= 0 && x < 19 &&
        y >= 0 && y < 19 &&
        tempBoard[x][y] === player
      ) {
        count++;
        x += dx;
        y += dy;
      }
    });
    
    return count >= 5;
  });
}

// 检查是否有几个子连成一线（指定数量）
function checkLineOfLength(board: Board, row: number, col: number, player: 'black' | 'white', length: number, includeBlocked: boolean = false): boolean {
  const directions = [
    [[0, 1], [0, -1]], // horizontal
    [[1, 0], [-1, 0]], // vertical
    [[1, 1], [-1, -1]], // diagonal
    [[1, -1], [-1, 1]] // anti-diagonal
  ];

  // 创建一个临时棋盘，包含预判断的落子
  const tempBoard = [...board.map(row => [...row])];
  tempBoard[row][col] = player;

  return directions.some(direction => {
    let count = 1; // 当前格子
    let isOpenStart = false;
    let isOpenEnd = false;
    
    // 检查第一个方向
    let [dx, dy] = direction[0];
    let x = row + dx;
    let y = col + dy;
    
    while (
      x >= 0 && x < 19 &&
      y >= 0 && y < 19 &&
      tempBoard[x][y] === player
    ) {
      count++;
      x += dx;
      y += dy;
    }
    
    // 检查这个方向的端点是否开放
    if (x >= 0 && x < 19 && y >= 0 && y < 19 && tempBoard[x][y] === null) {
      isOpenStart = true;
    }
    
    // 检查第二个方向
    [dx, dy] = direction[1];
    x = row + dx;
    y = col + dy;
    
    while (
      x >= 0 && x < 19 &&
      y >= 0 && y < 19 &&
      tempBoard[x][y] === player
    ) {
      count++;
      x += dx;
      y += dy;
    }
    
    // 检查这个方向的端点是否开放
    if (x >= 0 && x < 19 && y >= 0 && y < 19 && tempBoard[x][y] === null) {
      isOpenEnd = true;
    }

    // 如果不考虑是否被阻挡，只检查长度
    if (!includeBlocked) {
      return count === length && (isOpenStart || isOpenEnd);
    }
    
    // 考虑被阻挡的情况
    return count === length;
  });
}

// 检查落子后是否形成活三（至少一端开放的三子连线）
function wouldFormOpenThree(board: Board, row: number, col: number, player: 'black' | 'white'): boolean {
  return checkLineOfLength(board, row, col, player, 3, false);
}

// 检查落子后是否形成活四（连续四子，至少一端开放）
function wouldFormOpenFour(board: Board, row: number, col: number, player: 'black' | 'white'): boolean {
  return checkLineOfLength(board, row, col, player, 4, false);
}

// 检查落子后是否形成任何四子连线（包括被阻挡的）
function wouldFormAnyFour(board: Board, row: number, col: number, player: 'black' | 'white'): boolean {
  return checkLineOfLength(board, row, col, player, 4, true);
}

// 检查位置价值（以中心点为重心，越靠近中心越价值高）
function getPositionValue(row: number, col: number): number {
  const center = 9;
  const distanceToCenter = Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2));
  // 越靠近中心，价值越高，最大值为10
  return Math.max(10 - distanceToCenter, 0);
}

// 计算一个位置的整体得分
function evaluatePosition(board: Board, row: number, col: number, player: 'black' | 'white'): number {
  if (!isValidMove(board, row, col)) {
    return -1000; // 非法位置，得分极低
  }
  
  const opponent = player === 'black' ? 'white' : 'black';
  let score = 0;
  
  // 检查是否能赢
  if (wouldWin(board, row, col, player)) {
    return 10000; // 制胜位置，最高分
  }
  
  // 检查是否能阻止对手赢
  if (wouldWin(board, row, col, opponent)) {
    return 9000; // 阻止对手，次高分
  }
  
  // 检查是否能形成活四
  if (wouldFormOpenFour(board, row, col, player)) {
    score += 1000;
  }
  
  // 检查是否能阻止对手形成活四
  if (wouldFormOpenFour(board, row, col, opponent)) {
    score += 900;
  }
  
  // 检查是否能形成任何四子连线
  if (wouldFormAnyFour(board, row, col, player)) {
    score += 500;
  }
  
  // 检查是否能形成活三
  if (wouldFormOpenThree(board, row, col, player)) {
    score += 100;
  }
  
  // 检查是否能阻止对手形成活三
  if (wouldFormOpenThree(board, row, col, opponent)) {
    score += 90;
  }
  
  // 增加位置价值
  score += getPositionValue(row, col);
  
  // 检查周围是否有子
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      
      const x = row + dx;
      const y = col + dy;
      
      if (x >= 0 && x < 19 && y >= 0 && y < 19) {
        if (board[x][y] === player) {
          score += 5; // 靠近己方棋子
        } else if (board[x][y] === opponent) {
          score += 3; // 靠近对方棋子
        }
      }
    }
  }
  
  return score;
}

// 生成棋盘的字符串表示，用于发送给AI
function formatBoardForAI(board: Board, currentPlayer: 'black' | 'white'): string {
  const pieces = {
    black: '●',
    white: '○',
    null: '+'
  };
  
  let boardString = '  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8\n';
  
  for (let i = 0; i < 19; i++) {
    boardString += `${i % 10} `;
    for (let j = 0; j < 19; j++) {
      boardString += `${pieces[board[i][j] || 'null']} `;
    }
    boardString += '\n';
  }
  
  return boardString;
}

// 构建提示词
function buildPrompt(board: Board, currentPlayer: 'black' | 'white'): string {
  const boardString = formatBoardForAI(board, currentPlayer);
  const prompt = `你是一位专业的五子棋（Gobang）AI棋手。请分析当前棋局，并选择最佳落子位置。

当前棋盘状态（● 代表黑子，○ 代表白子，+ 代表空位）：
${boardString}

你是${currentPlayer === 'black' ? '黑棋' : '白棋'}。根据以下五子棋策略和原则选择最佳落子位置：

1. 必胜策略：
   - 如果有机会形成连续五子，立即落子在该位置
   - 阻止对手形成连续五子的威胁

2. 进攻策略：
   - 寻找形成"活四"的位置（两端开放的连续四子）
   - 寻找形成"双活三"的位置（两个不同方向的活三）
   - 寻找形成"活三"的位置（两端至少有一个开放的连续三子）

3. 防守策略：
   - 阻止对手形成活四（最高优先级防守）
   - 阻止对手形成双活三
   - 阻止对手形成活三

4. 棋型识别：
   - 活四：连续四子，一端开放（必须防守）
   - 冲四：连续四子，被对手子封住一端
   - 活三：连续三子，两端开放
   - 眠三：连续三子，一端被封
   - 活二：连续两子，两端开放

5. 局势评估：
   - 在初期阶段，优先布局在棋盘中央区域
   - 在中期，寻找建立进攻态势的位置
   - 在布局时，尽量形成多个潜在攻击方向
   - 避免在只有一子相邻的位置落子，除非有明确战术目的

请基于上述策略和当前棋局，分析所有可能的关键位置，选择一个最优的落子位置。

只需返回JSON格式的坐标，格式为：{"row": 行号, "col": 列号}
不要包含任何其他文本、注释、Markdown格式或代码块。`;

  return prompt;
}

// 从响应文本中提取JSON
function extractJSON(text: string): any {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {
    // 如果直接解析失败，尝试清理文本
    try {
      // 移除可能的代码块标记
      let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      // 查找 { 和 } 之间的内容
      const match = cleaned.match(/{[^}]*}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      // 如果仍然失败，尝试正则表达式提取行列值
      try {
        const rowMatch = text.match(/["']?row["']?\s*:\s*(\d+)/i);
        const colMatch = text.match(/["']?col["']?\s*:\s*(\d+)/i);
        
        if (rowMatch && colMatch) {
          return {
            row: parseInt(rowMatch[1]),
            col: parseInt(colMatch[1])
          };
        }
      } catch (e) {
        // 所有尝试都失败
        console.error('无法从响应中提取JSON:', text);
      }
    }
  }
  return null;
}

// 通过AI API获取下一步棋
async function getAIMove(board: Board, apiConfig: { apiKey: string, baseUrl: string, model: string }, currentPlayer: 'black' | 'white'): Promise<{ row: number, col: number } | null> {
  try {
    const isOpenAI = apiConfig.baseUrl.includes('openai.com');
    const isAnthropic = apiConfig.baseUrl.includes('anthropic.com');
    const isDeepseek = apiConfig.baseUrl.includes('deepseek');
    
    let response;
    let move = null;
    
    const prompt = buildPrompt(board, currentPlayer);
    
    if (isOpenAI) {
      // OpenAI API
      response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" } // 明确请求JSON格式
        })
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        move = extractJSON(content);
      }
    } else if (isAnthropic) {
      // Anthropic API
      response = await fetch(`${apiConfig.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiConfig.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: apiConfig.model,
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      
      if (data.content && data.content[0] && data.content[0].text) {
        const content = data.content[0].text;
        move = extractJSON(content);
      }
    } else if (isDeepseek) {
      // Deepseek API
      response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        move = extractJSON(content);
      }
    } else {
      // 其他API提供商的格式可能不同，这里使用通用格式
      response = await fetch(apiConfig.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.model,
          prompt: prompt,
          max_tokens: 100
        })
      });
      
      const data = await response.json();
      
      // 尝试从响应中提取JSON
      if (data.choices && data.choices[0] && data.choices[0].text) {
        move = extractJSON(data.choices[0].text);
      } else if (data.response) {
        move = extractJSON(data.response);
      }
    }
    
    // 验证移动是否有效
    if (move && typeof move.row === 'number' && typeof move.col === 'number') {
      if (isValidMove(board, move.row, move.col)) {
        return move;
      } else {
        console.error('AI返回的移动无效:', move);
      }
    }
    
    // 如果AI返回无效，使用备用算法
    return findBestMove(board, currentPlayer);
  } catch (error) {
    console.error('调用AI API时出错:', error);
    return findBestMove(board, currentPlayer);
  }
}

// 备用算法：使用本地逻辑寻找最佳移动
function findBestMove(board: Board, currentPlayer: 'black' | 'white'): { row: number; col: number } {
  const opponent = currentPlayer === 'black' ? 'white' : 'black';
  let bestScore = -Infinity;
  let bestMove = { row: 0, col: 0 };
  
  // 策略1：如果能赢，就选择获胜位置
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (isValidMove(board, row, col) && wouldWin(board, row, col, currentPlayer)) {
        return { row, col };
      }
    }
  }
  
  // 策略2：阻止对手获胜
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (isValidMove(board, row, col) && wouldWin(board, row, col, opponent)) {
        return { row, col };
      }
    }
  }
  
  // 策略3：评估所有可能的位置并选择最佳得分位置
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (isValidMove(board, row, col)) {
        const score = evaluatePosition(board, row, col, currentPlayer);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { row, col };
        }
      }
    }
  }
  
  // 如果没有找到好的位置（不应该发生），默认尝试中心区域
  if (bestScore === -Infinity) {
    const center = 9;
    const spiralDirections = [
      [0, 0], [-1, 0], [-1, 1], [0, 1], [1, 1], 
      [1, 0], [1, -1], [0, -1], [-1, -1], [-2, 0],
      [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], 
      [2, 2], [2, 1], [2, 0], [2, -1], [2, -2]
    ];
    
    for (const [dx, dy] of spiralDirections) {
      const row = center + dx;
      const col = center + dy;
      if (isValidMove(board, row, col)) {
        return { row, col };
      }
    }
    
    // 如果中心区域都不可用，找到第一个有效位置
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 19; col++) {
        if (isValidMove(board, row, col)) {
          return { row, col };
        }
      }
    }
  }
  
  return bestMove;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { board, apiKey, baseUrl, model, currentPlayer } = body;

    if (!board) {
      return NextResponse.json(
        { error: '缺少棋盘状态' },
        { status: 400 }
      );
    }

    let move;

    // 如果提供了API密钥和基础URL，尝试使用AI服务
    if (apiKey && baseUrl && model) {
      move = await getAIMove(board, { apiKey, baseUrl, model }, currentPlayer);
    } else {
      // 否则使用本地逻辑
      move = findBestMove(board, currentPlayer);
    }

    return NextResponse.json(move);
  } catch (error) {
    console.error('处理移动时出错:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 