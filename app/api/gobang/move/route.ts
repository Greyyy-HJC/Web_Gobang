import { NextResponse } from 'next/server';

type Cell = 'black' | 'white' | null;
type Board = Cell[][];

interface RequestBody {
  board: Board;
  apiKey: string;
  baseUrl: string;
  model: string;
  currentPlayer: 'black' | 'white';
  promptType?: 'default' | 'custom';
  customPrompt?: string;
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

// 创建棋盘状态表示
function createPrompt(board: Cell[][], currentPlayer: 'black' | 'white', promptType?: 'default' | 'custom', customPrompt?: string): string {
  // 生成棋盘表示
  let boardStr = '当前棋盘状态 (O=黑棋, X=白棋, .=空)：\n';
  
  // 添加列标
  boardStr += '   ';
  for (let col = 0; col < 19; col++) {
    boardStr += col.toString().padStart(2, ' ') + ' ';
  }
  boardStr += '\n';
  
  // 添加行标和棋盘内容
  for (let row = 0; row < 19; row++) {
    boardStr += row.toString().padStart(2, ' ') + ' ';
    for (let col = 0; col < 19; col++) {
      const cell = board[row][col];
      if (cell === 'black') {
        boardStr += ' O ';
      } else if (cell === 'white') {
        boardStr += ' X ';
      } else {
        boardStr += ' . ';
      }
    }
    boardStr += '\n';
  }
  
  // 构建基础提示词
  const basePrompt = `你是五子棋 (Gobang) 的AI玩家。当前你执${currentPlayer === 'black' ? '黑棋(O)' : '白棋(X)'}。

${boardStr}

请分析当前棋盘状态并给出你的下一步最佳落子位置。五子棋的目标是在横、竖或斜线上率先形成连续的5个棋子。

`;

  // 默认策略部分
  const defaultStrategy = `落子策略优先级:
1. 获胜：如果存在一步可以形成连续5子并立即获胜的位置，优先选择此位置。
2. 防守：如果对手下一步可以形成连续5子，必须阻止对手获胜。
3. 进攻：优先形成"活四"（两端开放的四子连线），几乎必然获胜。
4. 防御：阻止对手形成活四或"冲四"（一端开放的四子连线）。
5. 发展：尝试形成"活三"（两端开放的三子连线）或双活三。
6. 布局：在棋盘中心区域落子，控制棋盘关键位置。
7. 连接：与自己已有的棋子保持连接，形成更强的阵型。
`;

  // 结尾部分
  const endPrompt = `
请以JSON格式返回你的落子位置，格式为：
{"row": 行号, "col": 列号}

行号和列号都是从0开始到18结束的整数。请确保选择一个空白位置落子。`;

  // 如果是自定义策略，替换策略部分
  if (promptType === 'custom' && customPrompt) {
    // 使用自定义策略替换默认策略部分
    return basePrompt + customPrompt + endPrompt;
  }
  
  // 使用默认策略
  return basePrompt + defaultStrategy + endPrompt;
}

// 从API响应中提取JSON
function extractJSON(response: any, currentPlayer: 'black' | 'white'): { row: number, col: number } | null {
  try {
    let content = '';
    
    // 处理OpenAI响应格式
    if (response.choices && response.choices[0] && response.choices[0].message) {
      content = response.choices[0].message.content;
    }
    // 处理Anthropic响应格式
    else if (response.content && response.content[0] && response.content[0].text) {
      content = response.content[0].text;
    }
    // 处理通用响应格式
    else if (typeof response === 'string') {
      content = response;
    }
    // 如果无法识别响应格式，退出
    else {
      return null;
    }
    
    // 尝试直接解析整个内容
    try {
      const jsonObj = JSON.parse(content);
      if (typeof jsonObj.row === 'number' && typeof jsonObj.col === 'number') {
        return { row: jsonObj.row, col: jsonObj.col };
      }
      // 可能是包含在move或position等属性中
      if (jsonObj.move && typeof jsonObj.move.row === 'number' && typeof jsonObj.move.col === 'number') {
        return { row: jsonObj.move.row, col: jsonObj.move.col };
      }
      if (jsonObj.position && typeof jsonObj.position.row === 'number' && typeof jsonObj.position.col === 'number') {
        return { row: jsonObj.position.row, col: jsonObj.position.col };
      }
    } catch (e) {
      // 如果直接解析失败，尝试提取JSON字符串
    }
    
    // 尝试从内容中提取JSON对象
    const jsonRegex = /{[^{}]*"row"\s*:\s*(\d+)[^{}]*"col"\s*:\s*(\d+)[^{}]*}|{[^{}]*"col"\s*:\s*(\d+)[^{}]*"row"\s*:\s*(\d+)[^{}]*}/;
    const match = content.match(jsonRegex);
    
    if (match) {
      const jsonStr = match[0];
      try {
        const json = JSON.parse(jsonStr);
        if ((json.row !== undefined && json.col !== undefined) ||
            (json.row !== null && json.col !== null)) {
          return { row: Number(json.row), col: Number(json.col) };
        }
      } catch (e) {
        // JSON解析失败，继续尝试其他方法
      }
    }
    
    // 尝试直接从文本中提取坐标数字
    const coordRegex = /[行|横坐标|x|row]\s*[为是:：\s]+\s*(\d+).*?[列|纵坐标|y|col]\s*[为是:：\s]+\s*(\d+)/i;
    const coordMatch = content.match(coordRegex);
    
    if (coordMatch && coordMatch[1] && coordMatch[2]) {
      return { row: Number(coordMatch[1]), col: Number(coordMatch[2]) };
    }
    
    // 尝试提取坐标对
    const pairRegex = /\((\d+)\s*,\s*(\d+)\)/;
    const pairMatch = content.match(pairRegex);
    
    if (pairMatch && pairMatch[1] && pairMatch[2]) {
      return { row: Number(pairMatch[1]), col: Number(pairMatch[2]) };
    }
    
    // 所有尝试都失败，返回null
    return null;
  } catch (error) {
    console.error('从AI回复中提取JSON时出错:', error);
    return null;
  }
}

// 根据不同的API提供商，构建合适的API请求
const makeApiRequest = async (apiUrl: string, apiKey: string, model: string, prompt: string) => {
  try {
    // OpenAI API
    if (apiUrl.includes('openai.com')) {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "无法解析错误响应" }));
        return { error: `OpenAI API错误 (${response.status}): ${errData.error?.message || JSON.stringify(errData)}` };
      }

      return await response.json();
    } 
    // Anthropic API
    else if (apiUrl.includes('anthropic.com')) {
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "无法解析错误响应" }));
        return { error: `Anthropic API错误 (${response.status}): ${errData.error?.message || JSON.stringify(errData)}` };
      }

      return await response.json();
    }
    // 其他API提供商...根据实际情况添加更多处理逻辑
    else {
      // 通用API调用格式（尝试兼容其他服务）
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "无法解析错误响应" }));
        return { error: `API错误 (${response.status}): ${errData.error?.message || JSON.stringify(errData)}` };
      }

      return await response.json();
    }
  } catch (error) {
    return { error: `API请求失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
};

// 通过AI API获取下一步棋
async function getNextMove(
  board: Cell[][], 
  apiKey: string, 
  baseUrl: string, 
  model: string, 
  currentPlayer: 'black' | 'white',
  promptType?: 'default' | 'custom',
  customPrompt?: string
): Promise<{row: number, col: number} | {error: string}> {
  try {
    const prompt = createPrompt(board, currentPlayer, promptType, customPrompt);
    
    const result = await makeApiRequest(baseUrl, apiKey, model, prompt);
    
    if (result.error) {
      return { error: result.error };
    }
    
    // 解析响应
    const moveCoordinates = extractJSON(result, currentPlayer);
    
    if (!moveCoordinates || moveCoordinates.row === undefined || moveCoordinates.col === undefined) {
      return { error: "无法从AI回复中解析有效的移动坐标" };
    }
    
    const row = Number(moveCoordinates.row);
    const col = Number(moveCoordinates.col);
    
    // 验证坐标是否有效
    if (
      isNaN(row) || isNaN(col) ||
      row < 0 || row >= 19 ||
      col < 0 || col >= 19 ||
      board[row][col] !== null
    ) {
      return { error: `AI返回的坐标无效 (${row},${col})` };
    }
    
    return { row, col };
  } catch (error) {
    return { error: `处理AI回复时出错: ${error instanceof Error ? error.message : '未知错误'}` };
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
    // 解析请求
    const { board, apiKey, baseUrl, model, currentPlayer, promptType, customPrompt } = await request.json() as RequestBody;

    // 验证API密钥
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API密钥不能为空' },
        { status: 400 }
      );
    }

    // 验证基础URL
    if (!baseUrl) {
      return NextResponse.json(
        { error: '基础URL不能为空' },
        { status: 400 }
      );
    }

    // 验证模型名称
    if (!model) {
      return NextResponse.json(
        { error: '模型名称不能为空' },
        { status: 400 }
      );
    }

    if (!board) {
      return NextResponse.json(
        { error: '棋盘状态不能为空' },
        { status: 400 }
      );
    }

    // 获取AI下一步
    const result = await getNextMove(board, apiKey, baseUrl, model, currentPlayer, promptType, customPrompt);
    
    // 处理错误情况
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    // 返回有效的移动
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('处理移动时出错:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发生未知错误" },
      { status: 500 }
    );
  }
} 