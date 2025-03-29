import { NextResponse } from 'next/server';

// 新增历史记忆存储
const conversationHistory: Record<string, any[]> = {};

type Cell = 'black' | 'white' | null;
type Board = Cell[][];

interface ForbiddenRules {
  overline: boolean; // 长连禁手（五子以上）
  doubleFour: boolean; // 双四禁手
  doubleThree: boolean; // 双三禁手
}

interface RequestBody {
  board: Board;
  apiKey: string;
  baseUrl: string;
  model: string;
  currentPlayer: 'black' | 'white';
  promptType?: 'default' | 'custom';
  customPrompt?: string;
  sessionId?: string;
  moveNumber?: number;
  forbiddenRules?: ForbiddenRules; // 添加禁手规则
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
    return 9500; // 阻止对手获胜，非常高的分数
  }
  
  // 检查是否能形成活四
  if (wouldFormOpenFour(board, row, col, player)) {
    score += 3000;
  }
  
  // 检查是否能阻止对手形成活四
  if (wouldFormOpenFour(board, row, col, opponent)) {
    score += 2800;
  }
  
  // 检查是否能形成任何四子连线
  if (wouldFormAnyFour(board, row, col, player)) {
    score += 1500;
  }
  
  // 检查是否能阻止对手形成任何四子连线
  if (wouldFormAnyFour(board, row, col, opponent)) {
    score += 1400;
  }
  
  // 检查是否能形成活三
  if (wouldFormOpenThree(board, row, col, player)) {
    score += 1000;
  }
  
  // 检查是否能阻止对手形成活三
  if (wouldFormOpenThree(board, row, col, opponent)) {
    score += 950;
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

// 生成棋盘字符串表示
function generateBoardString(board: Board): string {
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
  
  return boardStr;
}

// 根据棋盘状态和当前玩家创建提示
function createPrompt(
  board: Board,
  currentPlayer: 'black' | 'white',
  promptType?: 'default' | 'custom',
  customPrompt?: string,
  forbiddenRules?: ForbiddenRules
): string {
  // 创建棋盘字符串表示
  let boardStr = "当前棋盘状态:\n";
  
  // 棋盘顶部坐标
  boardStr += "   ";
  for (let col = 0; col < 19; col++) {
    boardStr += ` ${col.toString().padStart(2)} `;
  }
  boardStr += "\n";
  
  // 棋盘内容
  for (let row = 0; row < 19; row++) {
    boardStr += ` ${row.toString().padStart(2)} `;
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === 'black') {
        boardStr += " O  "; // 黑棋
      } else if (board[row][col] === 'white') {
        boardStr += " X  "; // 白棋
      } else {
        boardStr += " .  "; // 空位
      }
    }
    boardStr += "\n";
  }
  
  // 创建数字矩阵表示
  let boardMatrix = "数字棋盘表示 (0=空, 1=黑棋, 2=白棋):\n";
  boardMatrix += "[\n";
  for (let row = 0; row < 19; row++) {
    boardMatrix += "  [";
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === 'black') {
        boardMatrix += "1"; // 黑棋
      } else if (board[row][col] === 'white') {
        boardMatrix += "2"; // 白棋
      } else {
        boardMatrix += "0"; // 空位
      }
      if (col < 18) boardMatrix += ", ";
    }
    boardMatrix += "]";
    if (row < 18) boardMatrix += ",";
    boardMatrix += "\n";
  }
  boardMatrix += "]\n";
  
  // 基础提示词
  const basePrompt = `你是一个专业的五子棋AI。你的任务是分析棋盘并返回最佳落子位置。
  
${boardStr}

${boardMatrix}

你是${currentPlayer === 'black' ? '黑棋(O)' : '白棋(X)'}。

重要提示：你只能在棋盘上的空位置（标记为"."或数字矩阵中的"0"）落子。已经有棋子的位置（标记为"O"、"X"或数字矩阵中的"1"、"2"）不能落子。`;

  // 添加禁手规则说明（仅针对黑棋）
  let forbiddenRulesStr = "";
  if (currentPlayer === 'black' && forbiddenRules) {
    const rules = [];
    if (forbiddenRules.overline) rules.push("- 长连禁手：黑棋不能形成连续6子或更多子的连线");
    if (forbiddenRules.doubleFour) rules.push("- 双四禁手：黑棋不能一步棋同时形成两个活四");
    if (forbiddenRules.doubleThree) rules.push("- 双三禁手：黑棋不能一步棋同时形成两个活三");
    
    if (rules.length > 0) {
      forbiddenRulesStr = "\n\n禁手规则（仅对黑棋有效）：\n" + rules.join("\n");
    }
  }
  
  // 默认策略部分
  const defaultStrategy = `
策略：
1. 如果能形成五子连珠，立即落子获胜。
2. 如果对手有四子连珠，必须阻止。
3. 如果能够形成活四（两端都开放的四子连珠），优先选择。
4. 如果对手可能形成活四，必须阻止。
5. 如果能够形成双三（两个活三），优先选择。
6. 如果对手可能形成双三，优先阻止。
7. 如果能形成单活三，优先选择。
8. 优先在对手棋子周围落子，尤其是对手威胁较大的位置。
9. 特别注意识别和利用"活四"、"冲四"、"活三"等特殊棋型。
   - 活四：四个连续己方棋子，两端均为空格，如 ".OOOO."（黑方）
   - 冲四：四个连续己方棋子，一端为空格，如 ".OOOO#"（黑方）
   - 活三：三个连续己方棋子，两端均为空格，如 ".OOO."（黑方）
10. 分析对角线、水平线和垂直线上的威胁。
11. 优先占据有多个方向发展潜力的点位。
12. 尝试在中盘形成多方向威胁。
13. 在开局优先考虑接近中心位置的落子。`;

  // 如果是自定义指令，使用用户提供的指令
  if (promptType === 'custom' && customPrompt) {
    // 创建完整的提示词，只替换策略部分
    const fullPrompt = `${basePrompt}${forbiddenRulesStr}

${customPrompt}

请分析当前局势并返回你认为的最佳落子位置，只返回JSON格式的坐标{"row": 行号, "col": 列号}，不要包含任何解释或额外文本。
再次提醒：你只能在空位置(0)落子，不能在已有棋子的位置(1或2)落子。`;
    
    // 替换棋盘状态和颜色占位符
    return fullPrompt
      .replace('{board}', boardStr)
      .replace('{color}', currentPlayer === 'black' ? '黑棋' : '白棋');
  }
  
  // 使用默认指令
  return `${basePrompt}${forbiddenRulesStr}

${defaultStrategy}

请分析当前局势并返回你认为的最佳落子位置，只返回JSON格式的坐标{"row": 行号, "col": 列号}，不要包含任何解释或额外文本。
再次提醒：你只能在空位置(0)落子，不能在已有棋子的位置(1或2)落子。`;
}

// 从API响应中提取JSON
function extractJSON(response: any, currentPlayer: 'black' | 'white'): { row: number, col: number } | null {
  if (!response) return null;
  let responseStr = '';
  
  console.log('Response type:', typeof response);
  console.log('Raw response:', JSON.stringify(response).substring(0, 300));
  
  // 处理OpenAI API响应格式
  if (response.choices && Array.isArray(response.choices) && response.choices[0] && response.choices[0].message) {
    responseStr = response.choices[0].message.content;
    console.log('Extracted from OpenAI format:', responseStr);
  }
  // 处理Anthropic API响应格式
  else if (response.content && Array.isArray(response.content) && response.content[0] && response.content[0].text) {
    responseStr = response.content[0].text;
    console.log('Extracted from Anthropic format:', responseStr);
  }
  // 如果response是一个对象，尝试提取其他格式
  else if (typeof response === 'object') {
    // 寻找可能包含内容的字段
    if (response.content) {
      responseStr = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } else if (response.message && response.message.content) {
      responseStr = response.message.content;
    } else {
      // 尝试转为JSON字符串
      try {
        responseStr = JSON.stringify(response);
      } catch {
        responseStr = String(response);
      }
    }
  } else {
    responseStr = String(response);
  }
  
  console.log(`AI原始响应 (处理后): ${responseStr}`);

  // 尝试方法1: 直接使用JSON.parse
  try {
    // 如果响应就是一个纯JSON字符串
    const parsedObj = JSON.parse(responseStr);
    if (typeof parsedObj.row === 'number' && typeof parsedObj.col === 'number') {
      console.log(`成功解析JSON: row=${parsedObj.row}, col=${parsedObj.col}`);
      return { row: parsedObj.row, col: parsedObj.col };
    }
  } catch (e) {
    console.log('JSON直接解析失败，尝试其他方法');
  }

  // 尝试方法2: 提取被代码块包裹的JSON
  const codeBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
  const codeBlockMatch = responseStr.match(codeBlockRegex);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsedObj = JSON.parse(codeBlockMatch[1]);
      if (typeof parsedObj.row === 'number' && typeof parsedObj.col === 'number') {
        console.log(`成功从代码块解析JSON: row=${parsedObj.row}, col=${parsedObj.col}`);
        return { row: parsedObj.row, col: parsedObj.col };
      }
    } catch (e) {
      console.log('代码块JSON解析失败，尝试其他方法');
    }
  }

  // 尝试方法3: 正则表达式匹配格式为 {"row": X, "col": Y} 的内容
  // 使用更宽松的模式，允许空格变化和引号可选
  const jsonRegex = /{[\s]*["']?row["']?[\s]*:[\s]*(\d+)[\s]*,[\s]*["']?col["']?[\s]*:[\s]*(\d+)[\s]*}/;
  const jsonMatch = responseStr.match(jsonRegex);
  if (jsonMatch) {
    const row = parseInt(jsonMatch[1], 10);
    const col = parseInt(jsonMatch[2], 10);
    
    if (!isNaN(row) && !isNaN(col)) {
      console.log(`通过正则表达式提取坐标: (${row}, ${col})`);
      return { row, col };
    }
  }

  // 尝试方法4: 匹配简单数字对 - 适用于格式更自由的情况
  const coordsRegex = /\(?(\d+)[,\s]+(\d+)\)?/;
  const coordsMatch = responseStr.match(coordsRegex);
  if (coordsMatch) {
    const row = parseInt(coordsMatch[1], 10);
    const col = parseInt(coordsMatch[2], 10);
    
    if (!isNaN(row) && !isNaN(col)) {
      console.log(`通过坐标对提取: (${row}, ${col})`);
      return { row, col };
    }
  }

  // 尝试方法5: 从整个对象中查找row和col属性
  if (typeof response === 'object') {
    try {
      // 深度搜索对象中的row和col属性
      const findRowAndCol = (obj: any, path: string = ''): {row?: number, col?: number} => {
        if (!obj || typeof obj !== 'object') return {};
        
        let result: {row?: number, col?: number} = {};
        
        // 直接检查当前对象
        if (typeof obj.row === 'number' && typeof obj.col === 'number') {
          return { row: obj.row, col: obj.col };
        }
        
        // 递归搜索所有嵌套对象
        for (const key in obj) {
          if (key === 'row' && typeof obj[key] === 'number') {
            result.row = obj[key];
          } else if (key === 'col' && typeof obj[key] === 'number') {
            result.col = obj[key];
          } else if (typeof obj[key] === 'object') {
            const nested = findRowAndCol(obj[key], `${path}.${key}`);
            if (nested.row !== undefined) result.row = nested.row;
            if (nested.col !== undefined) result.col = nested.col;
          }
        }
        
        return result;
      };
      
      const coords = findRowAndCol(response);
      if (coords.row !== undefined && coords.col !== undefined) {
        console.log(`从深度搜索中提取坐标: (${coords.row}, ${coords.col})`);
        return { row: coords.row, col: coords.col };
      }
    } catch (e) {
      console.log('深度对象搜索失败:', e);
    }
  }

  // 如果所有自动方法都失败，尝试查找任何坐标类格式
  const anyNumberPair = /(\d+).*?(\d+)/;
  const anyMatch = responseStr.match(anyNumberPair);
  if (anyMatch) {
    const num1 = parseInt(anyMatch[1], 10);
    const num2 = parseInt(anyMatch[2], 10);
    
    // 确保数字在合理范围内
    if (!isNaN(num1) && !isNaN(num2) && num1 >= 0 && num1 < 19 && num2 >= 0 && num2 < 19) {
      console.log(`通过任意数字对提取: (${num1}, ${num2})`);
      return { row: num1, col: num2 };
    }
  }

  console.log('所有解析方法均失败');
  return null;
}

// 根据不同的API提供商，构建合适的API请求
const makeApiRequest = async (
  apiUrl: string, 
  apiKey: string, 
  model: string, 
  prompt: string, 
  sessionId?: string, 
  moveNumber?: number
) => {
  try {
    // 检查是否是内部专用棋类引擎
    if (apiKey === 'internal' && (
        apiUrl.includes('/api/gobang/alphazero') || 
        apiUrl.includes('/api/gobang/minimax') || 
        apiUrl.includes('/api/gobang/mcts'))) {
      
      // 从prompt中提取棋盘状态来进行本地计算
      // 提取棋盘数据
      const boardData = extractBoardFromPrompt(prompt);
      
      // 根据不同的专用引擎选择不同的算法
      let result;
      if (apiUrl.includes('/api/gobang/alphazero')) {
        // 使用AlphaZero内部实现
        result = simulateAlphaZero(boardData, model);
      } else if (apiUrl.includes('/api/gobang/minimax')) {
        // 使用Minimax内部实现
        result = simulateMinimax(boardData, model);
      } else if (apiUrl.includes('/api/gobang/mcts')) {
        // 使用MCTS内部实现
        result = simulateMCTS(boardData, model);
      }
      
      // 返回结果
      return { 
        result: { 
          choices: [{ 
            message: { 
              content: JSON.stringify(result) 
            } 
          }] 
        }, 
        sessionId: sessionId || `internal-${Date.now()}` 
      };
    }
    
    // 生成会话ID（如果未提供）
    const conversationId = sessionId || `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 获取历史记录（如果存在）
    if (!conversationHistory[conversationId]) {
      conversationHistory[conversationId] = [];
    }
    
    // 限制历史记录长度，避免token超限
    if (conversationHistory[conversationId].length > 10) {
      // 保留第一条（系统提示）和最近的几条
      const firstMessage = conversationHistory[conversationId][0];
      conversationHistory[conversationId] = [
        firstMessage,
        ...conversationHistory[conversationId].slice(-9)
      ];
    }
    
    // OpenAI API
    if (apiUrl.includes('openai.com')) {
      // 创建消息数组
      let messages = [];
      
      // 如果是第一步，添加一条系统消息
      if (!moveNumber || moveNumber <= 1) {
        messages = [
          { 
            role: 'system', 
            content: '你是一个专业的五子棋AI。你的任务是分析棋盘并返回最佳落子位置。仅返回JSON格式的坐标，不要包含任何解释或多余文本。' 
          },
          { role: 'user', content: prompt }
        ];
        // 重新初始化历史记录
        conversationHistory[conversationId] = [messages[0]];
      } else {
        // 添加历史记录和新的提示
        messages = [
          ...conversationHistory[conversationId],
          { role: 'user', content: prompt }
        ];
      }
      
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "无法解析错误响应" }));
        return { error: `OpenAI API错误 (${response.status}): ${errData.error?.message || JSON.stringify(errData)}` };
      }

      const result = await response.json();
      
      // 保存AI回复到历史记录
      if (result.choices && result.choices[0] && result.choices[0].message) {
        conversationHistory[conversationId].push({ 
          role: 'user', 
          content: prompt 
        });
        conversationHistory[conversationId].push(result.choices[0].message);
      }
      
      return { result, sessionId: conversationId };
    } 
    // Anthropic API
    else if (apiUrl.includes('anthropic.com')) {
      // 构建Anthropic消息历史
      let messages = [];
      
      // 如果是第一步，或者没有历史记录
      if (!moveNumber || moveNumber <= 1) {
        messages = [{ 
          role: 'user', 
          content: `你是一个专业的五子棋AI。你的任务是分析棋盘并返回最佳落子位置。仅返回JSON格式的坐标，不要包含任何解释或多余文本。\n\n${prompt}` 
        }];
        // 重新初始化历史记录
        conversationHistory[conversationId] = [];
      } else {
        // 如果有历史记录，直接添加新的提示
        messages = [
          ...conversationHistory[conversationId],
          { role: 'user', content: prompt }
        ];
      }

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
          messages: messages
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "无法解析错误响应" }));
        return { error: `Anthropic API错误 (${response.status}): ${errData.error?.message || JSON.stringify(errData)}` };
      }

      const result = await response.json();
      
      // 保存消息到历史记录
      if (result.content && result.content[0]) {
        conversationHistory[conversationId].push({ 
          role: 'user', 
          content: prompt 
        });
        conversationHistory[conversationId].push({ 
          role: 'assistant', 
          content: result.content[0].text 
        });
      }
      
      return { result, sessionId: conversationId };
    }
    // DeepSeek API
    else if (apiUrl.includes('api.deepseek.com')) {
      try {
        // 从请求上下文中获取棋盘和当前玩家信息
        // 这里假设这些信息能从上级函数作用域中访问（如果不能，需要修改makeApiRequest函数签名）
        // 从解析的JSON数据中提取棋盘状态和当前玩家
        const boardData = extractBoardFromPrompt(prompt);
        const isBlackTurn = prompt.includes('黑棋') || prompt.includes('black');
        const currentPlayerColor = isBlackTurn ? 'black' : 'white';

        // 确保URL格式正确
        const actualApiUrl = apiUrl.endsWith('/chat/completions') ? apiUrl : `${apiUrl}/chat/completions`;
        
        // 生成一个ASCII-only的简化棋盘表示
        let asciiBoard = "Current board state:\n";
        for (let row = 0; row < 19; row++) {
          let rowStr = "";
          for (let col = 0; col < 19; col++) {
            const cell = boardData[row][col];
            if (cell === 'black') rowStr += "O ";
            else if (cell === 'white') rowStr += "X ";
            else rowStr += ". ";
          }
          asciiBoard += rowStr + "\n";
        }
        
        // 创建一个完全ASCII编码的系统消息和用户消息
        const systemMessage = `You are a Gobang AI. Analyze the board and provide coordinates for the best move.
        
Game rules: 19x19 grid, Black (O) plays first, White (X) second. First to form 5 in a row wins.

Your task: Return only the coordinates in this format: {"row": n, "col": m}`;

        // 创建ASCII-only的用户消息
        const userMessage = `Player: ${currentPlayerColor === 'black' ? 'Black (O)' : 'White (X)'}
${asciiBoard}
Return only the row and column of your next move as JSON: {"row": n, "col": m}`;

        const response = await fetch(actualApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || "deepseek-chat",
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.1,
            max_tokens: 50
          })
        });
        
        if (!response.ok) {
          throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        // 返回完整的响应对象，而不仅仅是内容
        return { result, sessionId: `deepseek-${Date.now()}` };
      } catch (error: any) {
        throw new Error(`DeepSeek API request failed: ${error.message}`);
      }
    }
    // 其他API提供商...根据实际情况添加更多处理逻辑
    else {
      // 通用API调用格式（尝试兼容其他服务）
      // 对于没有会话功能的API，每次都重新发送完整的提示
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

      const result = await response.json();
      return { result, sessionId: conversationId };
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
  customPrompt?: string,
  sessionId?: string,
  moveNumber?: number,
  forbiddenRules?: ForbiddenRules
): Promise<{row: number, col: number, sessionId?: string} | {error: string, sessionId?: string}> {
  try {
    // 生成一个更简洁的提示，用于继续对话
    let prompt;
    
    if (!moveNumber || moveNumber <= 1) {
      // 第一步，使用完整提示
      prompt = createPrompt(board, currentPlayer, promptType, customPrompt, forbiddenRules);
    } else {
      // 后续步骤，使用简化提示
      prompt = createSimplifiedPrompt(board, currentPlayer, moveNumber, forbiddenRules);
    }
    
    const apiResponse = await makeApiRequest(baseUrl, apiKey, model, prompt, sessionId, moveNumber);
    
    if (apiResponse.error) {
      return { error: apiResponse.error, sessionId: apiResponse.sessionId };
    }
    
    // 解析响应
    const moveCoordinates = extractJSON(apiResponse.result, currentPlayer);
    
    if (!moveCoordinates || moveCoordinates.row === undefined || moveCoordinates.col === undefined) {
      return { error: "无法从AI回复中解析有效的移动坐标", sessionId: apiResponse.sessionId };
    }
    
    const row = Number(moveCoordinates.row);
    const col = Number(moveCoordinates.col);
    
    // 验证坐标是否有效
    if (
      isNaN(row) || isNaN(col) ||
      row < 0 || row >= 19 ||
      col < 0 || col >= 19
    ) {
      return { error: `AI返回的坐标超出范围 (${row},${col})`, sessionId: apiResponse.sessionId };
    }
    
    // 验证位置是否已被占用
    if (board[row][col] !== null) {
      console.log(`警告: AI尝试在已占用的位置落子 (${row},${col})`);
      
      // 尝试寻找附近的有效位置
      const validMoves = [];
      
      // 遍历棋盘寻找所有空闲位置
      for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
          if (board[r][c] === null) {
            // 计算到原始位置的曼哈顿距离
            const distance = Math.abs(r - row) + Math.abs(c - col);
            validMoves.push({ row: r, col: c, distance });
          }
        }
      }
      
      // 如果有空闲位置，选择距离最近的
      if (validMoves.length > 0) {
        validMoves.sort((a, b) => a.distance - b.distance);
        const newMove = validMoves[0];
        return { 
          row: newMove.row, 
          col: newMove.col, 
          sessionId: apiResponse.sessionId,
          error: `原始坐标 (${row},${col}) 无效，已调整为最近的有效位置 (${newMove.row},${newMove.col})`
        };
      }
      
      return { error: `AI返回的坐标无效，该位置已被占用 (${row},${col})`, sessionId: apiResponse.sessionId };
    }
    
    // 如果是黑棋，验证是否违反禁手规则
    if (currentPlayer === 'black' && forbiddenRules) {
      if (checkForbiddenMoves(board, row, col, currentPlayer, forbiddenRules)) {
        // 寻找不违反禁手规则的替代位置
        const validAlternatives = [];
        
        for (let r = 0; r < 19; r++) {
          for (let c = 0; c < 19; c++) {
            if (board[r][c] === null && !checkForbiddenMoves(board, r, c, currentPlayer, forbiddenRules)) {
              // 计算到原始位置的曼哈顿距离
              const distance = Math.abs(r - row) + Math.abs(c - col);
              validAlternatives.push({ row: r, col: c, distance });
            }
          }
        }
        
        // 如果找到合法的替代位置，选择最近的
        if (validAlternatives.length > 0) {
          validAlternatives.sort((a, b) => a.distance - b.distance);
          const alternativeMove = validAlternatives[0];
          return { 
            row: alternativeMove.row, 
            col: alternativeMove.col, 
            sessionId: apiResponse.sessionId,
            error: `原始位置 (${row},${col}) 违反禁手规则，已调整为最近的合法位置 (${alternativeMove.row},${alternativeMove.col})`
          };
        }
        
        return { error: `AI落子位置违反禁手规则 (${row},${col})`, sessionId: apiResponse.sessionId };
      }
    }
    
    return { row, col, sessionId: apiResponse.sessionId };
  } catch (error) {
    return { error: `处理AI回复时出错: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

// 为后续移动创建简化的提示
function createSimplifiedPrompt(
  board: Cell[][], 
  currentPlayer: 'black' | 'white', 
  moveNumber: number,
  forbiddenRules?: ForbiddenRules
): string {
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
  
  // 创建数字矩阵表示
  let boardMatrix = "数字棋盘表示 (0=空, 1=黑棋, 2=白棋):\n";
  boardMatrix += "[\n";
  for (let row = 0; row < 19; row++) {
    boardMatrix += "  [";
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === 'black') {
        boardMatrix += "1"; // 黑棋
      } else if (board[row][col] === 'white') {
        boardMatrix += "2"; // 白棋
      } else {
        boardMatrix += "0"; // 空位
      }
      if (col < 18) boardMatrix += ", ";
    }
    boardMatrix += "]";
    if (row < 18) boardMatrix += ",";
    boardMatrix += "\n";
  }
  boardMatrix += "]\n";
  
  let prompt = `这是第${moveNumber}步。现在轮到${currentPlayer === 'black' ? '黑棋(O)' : '白棋(X)'}落子。

${boardStr}

${boardMatrix}

重要提示：你只能在棋盘上的空位置（标记为"."或数字矩阵中的"0"）落子。已经有棋子的位置（标记为"O"、"X"或数字矩阵中的"1"、"2"）不能落子。`;

  // 如果当前玩家是黑棋，并且有禁手规则，添加禁手规则说明
  if (currentPlayer === 'black' && forbiddenRules) {
    prompt += "\n黑棋禁手规则：\n";
    
    if (forbiddenRules.overline) {
      prompt += "- 长连禁手：黑棋不能形成超过五子的连续子（六连或更多）\n";
    }
    
    if (forbiddenRules.doubleFour) {
      prompt += "- 双四禁手：黑棋不能同时形成两个活四（两端开放的四连）\n";
    }
    
    if (forbiddenRules.doubleThree) {
      prompt += "- 双三禁手：黑棋不能同时形成两个活三（可以形成活四的三连）\n";
    }
    
    prompt += "\n这些规则只适用于黑棋。请确保你的落子不违反任何禁手规则，否则将判负。\n";
  }

  prompt += "\n请分析当前局面，找出最佳落子点，并以JSON格式返回坐标: {\"row\": 行号, \"col\": 列号}";
  prompt += "\n再次提醒：你只能在空位置(0)落子，不能在已有棋子的位置(1或2)落子。";
  
  return prompt;
}

// 检查位置是否违反禁手规则
function checkForbiddenMoves(
  board: Cell[][], 
  row: number, 
  col: number, 
  player: 'black' | 'white',
  forbiddenRules: ForbiddenRules
): boolean {
  // 只有黑棋才需要判断禁手
  if (player !== 'black') return false;
  
  // 如果没有启用任何禁手规则，直接返回false
  if (!forbiddenRules.overline && !forbiddenRules.doubleFour && !forbiddenRules.doubleThree) {
    return false;
  }
  
  // 创建一个临时棋盘进行检查
  const tempBoard = board.map(rowCells => [...rowCells]);
  tempBoard[row][col] = player;
  
  // 检查长连禁手
  if (forbiddenRules.overline && checkOverline(tempBoard, row, col)) {
    return true;
  }
  
  // 检查双四禁手
  if (forbiddenRules.doubleFour && checkDoubleFour(tempBoard, row, col)) {
    return true;
  }
  
  // 检查双三禁手
  if (forbiddenRules.doubleThree && checkDoubleThree(tempBoard, row, col)) {
    return true;
  }
  
  return false;
}

// 检查长连禁手（六子或更多连成一线）
function checkOverline(board: Cell[][], row: number, col: number): boolean {
  const directions = [
    [0, 1],  // 水平
    [1, 0],  // 垂直
    [1, 1],  // 对角线
    [1, -1]  // 反对角线
  ];
  
  for (const [dx, dy] of directions) {
    let count = 1;  // 起始点自身
    
    // 沿正方向计数
    for (let i = 1; i < 6; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      
      if (
        newRow >= 0 && newRow < 19 && 
        newCol >= 0 && newCol < 19 && 
        board[newRow][newCol] === 'black'
      ) {
        count++;
      } else {
        break;
      }
    }
    
    // 沿反方向计数
    for (let i = 1; i < 6; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      
      if (
        newRow >= 0 && newRow < 19 && 
        newCol >= 0 && newCol < 19 && 
        board[newRow][newCol] === 'black'
      ) {
        count++;
      } else {
        break;
      }
    }
    
    // 如果总数大于等于6，则是长连禁手
    if (count >= 6) {
      return true;
    }
  }
  
  return false;
}

// 检查双四禁手（两个活四）
function checkDoubleFour(board: Cell[][], row: number, col: number): boolean {
  let fourCount = 0;
  const directions = [
    [0, 1],  // 水平
    [1, 0],  // 垂直
    [1, 1],  // 对角线
    [1, -1]  // 反对角线
  ];
  
  for (const [dx, dy] of directions) {
    // 检查这个方向上是否有活四
    if (hasFour(board, row, col, dx, dy)) {
      fourCount++;
    }
  }
  
  return fourCount >= 2;
}

// 检查是否有活四
function hasFour(board: Cell[][], row: number, col: number, dx: number, dy: number): boolean {
  // 一些常见棋型示例(黑棋):
  const patterns = [
    [".", ".", "B", "B", "B", "B", "."],  // 活四: ..BBBB.
    [".", "B", "B", "B", "B", "W"],       // 冲四: .BBBBW
    ["B", ".", "B", "B", "B"],            // 冲四: B.BBB
    ["B", "B", ".", "B", "B"]             // 冲四: BB.BB
  ];
  
  for (const pattern of patterns) {
    let match = true;
    
    for (let i = -2; i <= 3; i++) {
      const patternIndex = i + 2;
      if (patternIndex < 0 || patternIndex >= pattern.length) continue;
      
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      
      // 检查边界
      if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) {
        match = false;
        break;
      }
      
      // 检查棋子
      const expected = pattern[patternIndex];
      if (expected === "B" && board[newRow][newCol] !== 'black') {
        match = false;
        break;
      } else if (expected === "." && board[newRow][newCol] !== null) {
        match = false;
        break;
      }
    }
    
    if (match) return true;
  }
  
  return false;
}

// 检查双三禁手
function checkDoubleThree(board: Cell[][], row: number, col: number): boolean {
  let threeCount = 0;
  const directions = [
    [0, 1],  // 水平
    [1, 0],  // 垂直
    [1, 1],  // 对角线
    [1, -1]  // 反对角线
  ];
  
  for (const [dx, dy] of directions) {
    // 检查这个方向上是否有活三
    if (hasThree(board, row, col, dx, dy)) {
      threeCount++;
    }
  }
  
  return threeCount >= 2;
}

// 检查是否有活三
function hasThree(board: Cell[][], row: number, col: number, dx: number, dy: number): boolean {
  const patterns = [
    [".", ".", "B", "B", "B", "."],  // 活三: ..BBB.
    [".", "B", ".", "B", "B", "."],  // 活三: .B.BB.
    [".", "B", "B", ".", "B", "."]   // 活三: .BB.B.
  ];
  
  for (const pattern of patterns) {
    let match = true;
    
    for (let i = -2; i <= 3; i++) {
      const patternIndex = i + 2;
      if (patternIndex < 0 || patternIndex >= pattern.length) continue;
      
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      
      // 检查边界
      if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) {
        match = false;
        break;
      }
      
      // 检查棋子
      const expected = pattern[patternIndex];
      if (expected === "B" && board[newRow][newCol] !== 'black') {
        match = false;
        break;
      } else if (expected === "." && board[newRow][newCol] !== null) {
        match = false;
        break;
      }
    }
    
    if (match) return true;
  }
  
  return false;
}

// 从提示文本中提取棋盘数据
function extractBoardFromPrompt(prompt: string): Cell[][] {
  // 初始化一个空棋盘
  const board: Cell[][] = Array(19).fill(null).map(() => Array(19).fill(null));
  
  // 解析提示中的棋盘表示
  const lines = prompt.split('\n');
  let startIndex = -1;
  
  // 查找棋盘的起始行
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('当前棋盘状态') || lines[i].includes('0  1  2  3')) {
      startIndex = i + 1;
      break;
    }
  }
  
  if (startIndex === -1 || startIndex >= lines.length) {
    return board; // 未找到棋盘数据
  }
  
  // 解析棋盘
  for (let r = 0; r < 19; r++) {
    if (startIndex + r >= lines.length) break;
    
    const line = lines[startIndex + r];
    // 跳过行标和空格，获取棋子信息
    // 格式应该类似于: " 0  .  .  .  .  .  .  .  . ..."
    const rowMatch = line.match(/^\s*\d+\s+(.*)/);
    if (!rowMatch) continue;
    
    const rowContent = rowMatch[1];
    for (let c = 0; c < 19; c++) {
      // 每个棋子占3个字符，如 " O "," . "," X "
      const cellStartIndex = c * 3;
      if (cellStartIndex + 3 > rowContent.length) break;
      
      const cell = rowContent.substring(cellStartIndex, cellStartIndex + 3).trim();
      if (cell === 'O') {
        board[r][c] = 'black';
      } else if (cell === 'X') {
        board[r][c] = 'white';
      }
      // 否则保持null
    }
  }
  
  return board;
}

// AlphaZero算法实现
function simulateAlphaZero(board: Cell[][], model: string): { row: number, col: number } {
  // 提取当前棋局状态
  const blackPieces: [number, number][] = [];
  const whitePieces: [number, number][] = [];
  
  // 分析当前棋局
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] === 'black') {
        blackPieces.push([r, c]);
      } else if (board[r][c] === 'white') {
        whitePieces.push([r, c]);
      }
    }
  }
  
  // 确定当前玩家（根据棋子数量判断）
  const currentPlayer = blackPieces.length > whitePieces.length ? 'white' : 'black';
  
  // 使用evaluatePosition查找最佳位置
  let bestScore = -Infinity;
  let bestMove = { row: 9, col: 9 }; // 默认中心位置
  
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] === null) {
        const score = evaluatePosition(board, r, c, currentPlayer);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { row: r, col: c };
        }
      }
    }
  }
  
  return bestMove;
}

// Minimax算法实现
function simulateMinimax(board: Cell[][], model: string): { row: number, col: number } {
  // 获取搜索深度
  const depthMatch = model.match(/Depth(\d+)/);
  const depth = depthMatch ? parseInt(depthMatch[1]) : 3;
  
  // 提取当前状态
  const blackPieces: [number, number][] = [];
  const whitePieces: [number, number][] = [];
  
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] === 'black') {
        blackPieces.push([r, c]);
      } else if (board[r][c] === 'white') {
        whitePieces.push([r, c]);
      }
    }
  }
  
  // 确定当前玩家
  const currentPlayer = blackPieces.length > whitePieces.length ? 'white' : 'black';
  
  // 简化版minimax：仅使用evaluatePosition在可行位置中选择最佳的
  let bestScore = -Infinity;
  let bestMove = { row: 9, col: 9 }; // 默认中心位置
  
  // 由于五子棋分支因子太大，这里只考虑现有棋子周围一定距离内的位置
  const validPositions: [number, number][] = [];
  const allPieces = [...blackPieces, ...whitePieces];
  
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] !== null) continue;
      
      // 检查是否在现有棋子附近
      let isNearExistingPiece = false;
      for (const [pieceRow, pieceCol] of allPieces) {
        const distance = Math.max(Math.abs(r - pieceRow), Math.abs(c - pieceCol));
        if (distance <= 2) {
          isNearExistingPiece = true;
          break;
        }
      }
      
      if (isNearExistingPiece) {
        validPositions.push([r, c]);
      }
    }
  }
  
  // 如果没有找到附近位置，考虑中心区域
  if (validPositions.length === 0) {
    const center = 9;
    const range = 5;
    for (let r = center - range; r <= center + range; r++) {
      for (let c = center - range; c <= center + range; c++) {
        if (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === null) {
          validPositions.push([r, c]);
        }
      }
    }
  }
  
  // 对可行位置进行评估
  for (const [r, c] of validPositions) {
    const score = evaluatePosition(board, r, c, currentPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { row: r, col: c };
    }
  }
  
  return bestMove;
}

// MCTS算法实现
function simulateMCTS(board: Cell[][], model: string): { row: number, col: number } {
  // 提取当前状态
  const blackPieces: [number, number][] = [];
  const whitePieces: [number, number][] = [];
  
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] === 'black') {
        blackPieces.push([r, c]);
      } else if (board[r][c] === 'white') {
        whitePieces.push([r, c]);
      }
    }
  }
  
  // 确定当前玩家
  const currentPlayer = blackPieces.length > whitePieces.length ? 'white' : 'black';
  
  // 简化版MCTS：结合位置评估和随机模拟
  // 获取有效位置（与Minimax相同）
  const validPositions: [number, number][] = [];
  const allPieces = [...blackPieces, ...whitePieces];
  
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] !== null) continue;
      
      // 检查是否在现有棋子附近
      let isNearExistingPiece = false;
      for (const [pieceRow, pieceCol] of allPieces) {
        const distance = Math.max(Math.abs(r - pieceRow), Math.abs(c - pieceCol));
        if (distance <= 2) {
          isNearExistingPiece = true;
          break;
        }
      }
      
      if (isNearExistingPiece) {
        validPositions.push([r, c]);
      }
    }
  }
  
  // 如果没有找到附近位置，考虑中心区域
  if (validPositions.length === 0) {
    const center = 9;
    const range = 5;
    for (let r = center - range; r <= center + range; r++) {
      for (let c = center - range; c <= center + range; c++) {
        if (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === null) {
          validPositions.push([r, c]);
        }
      }
    }
  }
  
  // 评估每个位置
  const positionScores: { pos: [number, number], score: number }[] = [];
  
  for (const [r, c] of validPositions) {
    const baseScore = evaluatePosition(board, r, c, currentPlayer);
    
    // 添加一些随机性，模拟MCTS的探索
    const randomFactor = Math.random() * 100; // 0-100的随机值
    const finalScore = baseScore + randomFactor;
    
    positionScores.push({ pos: [r, c], score: finalScore });
  }
  
  // 排序并选择最佳位置
  positionScores.sort((a, b) => b.score - a.score);
  
  if (positionScores.length > 0) {
    const [bestRow, bestCol] = positionScores[0].pos;
    return { row: bestRow, col: bestCol };
  }
  
  // 如果没有有效位置，返回棋盘中心
  return { row: 9, col: 9 };
}

export async function POST(request: Request) {
  try {
    // 解析请求
    const { 
      board, 
      apiKey, 
      baseUrl, 
      model, 
      currentPlayer, 
      promptType, 
      customPrompt,
      sessionId,
      moveNumber,
      forbiddenRules
    } = await request.json() as RequestBody;

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
    const result = await getNextMove(
      board, 
      apiKey, 
      baseUrl, 
      model, 
      currentPlayer, 
      promptType, 
      customPrompt,
      sessionId,
      moveNumber,
      forbiddenRules
    );
    
    // 处理错误情况
    if ('error' in result) {
      return NextResponse.json({ 
        error: result.error,
        sessionId: result.sessionId
      }, { status: 400 });
    }
    
    // 返回有效的移动和会话ID
    return NextResponse.json({
      row: result.row,
      col: result.col,
      sessionId: result.sessionId
    });
    
  } catch (error) {
    console.error('处理移动时出错:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发生未知错误" },
      { status: 500 }
    );
  }
} 