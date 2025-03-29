'use client';

import { useState, useEffect, useCallback } from 'react';

type Cell = 'black' | 'white' | null;
type PlayerType = 'human' | 'ai' | 'computer';
type ComputerAlgorithm = 'SimpleEval' | 'NeuralNetwork';

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  isAI: boolean;
  provider: string;
  computerAlgorithm?: ComputerAlgorithm; // 为电脑棋手添加算法选择
  difficulty?: 'easy' | 'medium' | 'hard'; // 添加难度选择
}

interface ForbiddenRules {
  overline: boolean; // 长连禁手（五子以上）
  doubleFour: boolean; // 双四禁手
  doubleThree: boolean; // 双三禁手
}

interface GameBoardProps {
  blackPlayer: PlayerType;
  whitePlayer: PlayerType;
  blackApiConfig: ApiConfig;
  whiteApiConfig: ApiConfig;
  blackPlayerId: string;
  whitePlayerId: string;
  blackPromptType?: 'default' | 'custom';
  whitePromptType?: 'default' | 'custom';
  blackCustomPrompt?: string;
  whiteCustomPrompt?: string;
  autoPlay: boolean;
  onReturnToSettings?: () => void;
  forbiddenRules: ForbiddenRules;
}

// 客户端AI逻辑函数
function isValidMoveClient(board: Cell[][], row: number, col: number): boolean {
  return (
    row >= 0 && row < 19 &&
    col >= 0 && col < 19 &&
    board[row][col] === null
  );
}

// 检查是否有获胜条件
function wouldWinClient(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
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
function checkLineOfLengthClient(board: Cell[][], row: number, col: number, player: 'black' | 'white', length: number, includeBlocked: boolean = false): boolean {
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
function wouldFormOpenThreeClient(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
  return checkLineOfLengthClient(board, row, col, player, 3, false);
}

// 检查落子后是否形成活四（连续四子，至少一端开放）
function wouldFormOpenFourClient(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
  return checkLineOfLengthClient(board, row, col, player, 4, false);
}

// 检查落子后是否形成任何四子连线（包括被阻挡的）
function wouldFormAnyFourClient(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
  return checkLineOfLengthClient(board, row, col, player, 4, true);
}

// 检查位置价值（以中心点为重心，越靠近中心越价值高）
function getPositionValueClient(row: number, col: number): number {
  const center = 9;
  const distanceToCenter = Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2));
  // 越靠近中心，价值越高，最大值为10
  return Math.max(10 - distanceToCenter, 0);
}

// 计算一个位置的整体得分
function evaluatePositionClient(board: Cell[][], row: number, col: number, player: 'black' | 'white'): number {
  if (!isValidMoveClient(board, row, col)) {
    return -1000; // 非法位置，得分极低
  }
  
  const opponent = player === 'black' ? 'white' : 'black';
  let score = 0;
  
  // 检查是否能赢
  if (wouldWinClient(board, row, col, player)) {
    return 10000; // 制胜位置，最高分
  }
  
  // 检查是否能阻止对手赢
  if (wouldWinClient(board, row, col, opponent)) {
    return 9000; // 阻止对手，次高分
  }
  
  // 检查是否能形成活四
  if (wouldFormOpenFourClient(board, row, col, player)) {
    score += 1000;
  }
  
  // 检查是否能阻止对手形成活四
  if (wouldFormOpenFourClient(board, row, col, opponent)) {
    score += 900;
  }
  
  // 检查是否能形成任何四子连线
  if (wouldFormAnyFourClient(board, row, col, player)) {
    score += 500;
  }
  
  // 检查是否能形成活三
  if (wouldFormOpenThreeClient(board, row, col, player)) {
    score += 100;
  }
  
  // 检查是否能阻止对手形成活三
  if (wouldFormOpenThreeClient(board, row, col, opponent)) {
    score += 90;
  }
  
  // 增加位置价值
  score += getPositionValueClient(row, col);
  
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

// 本地AI逻辑：寻找最佳移动
function findBestMoveClient(board: Cell[][], currentPlayer: 'black' | 'white'): { row: number; col: number } | null {
  const opponent = currentPlayer === 'black' ? 'white' : 'black';
  let bestScore = -Infinity;
  let bestMove: { row: number; col: number } | null = null;
  
  // 策略1：如果能赢，就选择获胜位置
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (isValidMoveClient(board, row, col) && wouldWinClient(board, row, col, currentPlayer)) {
        return { row, col };
      }
    }
  }
  
  // 策略2：阻止对手获胜
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (isValidMoveClient(board, row, col) && wouldWinClient(board, row, col, opponent)) {
        return { row, col };
      }
    }
  }
  
  // 策略3：评估所有可能的位置并选择最佳得分位置
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (isValidMoveClient(board, row, col)) {
        const score = evaluatePositionClient(board, row, col, currentPlayer);
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
      if (isValidMoveClient(board, row, col)) {
        return { row, col };
      }
    }
    
    // 如果中心区域都不可用，找到第一个有效位置
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 19; col++) {
        if (isValidMoveClient(board, row, col)) {
          return { row, col };
        }
      }
    }
  }
  
  return bestMove;
}

// 判断当前是否处于静态环境（无法访问API）
const isStaticEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.location.hostname.includes('github.io') ||
    window.location.pathname.includes('/Web_Gobang') ||
    window.location.protocol === 'file:' ||
    process.env.NODE_ENV === 'production'
  );
};

// ===================== 电脑棋手增强算法实现 =====================

// 增强版简单算法，根据难度调整策略
function findEnhancedSimpleMove(board: Cell[][], player: 'black' | 'white', difficulty: 'easy' | 'medium' | 'hard'): { row: number, col: number } | null {
  // 获取对手颜色
  const opponent = player === 'black' ? 'white' : 'black';
  
  // 建立所有可能的移动以及它们的评分
  const possibleMoves: { row: number; col: number; score: number }[] = [];
  
  // 检查是否有活四/冲四
  let hasOpenFour = false;
  let hasBlockingMove = false;
  
  // 首先扫描并检测高价值移动
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] !== null) continue;
      
      // 创建临时状态
      board[row][col] = player;
      
      // 检查四子连线（己方）
      if (wouldFormOpenFourClient(board, row, col, player)) {
        hasOpenFour = true;
      }
      
      // 检查四子连线（对手）
      if (wouldFormOpenFourClient(board, row, col, opponent)) {
        hasBlockingMove = true;
      }
      
      // 恢复棋盘
      board[row][col] = null;
    }
  }
  
  // 收集所有可能的移动并计算它们的评分
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] !== null) continue;
      
      let score = evaluatePositionClient(board, row, col, player);
      
      // 根据难度调整分数
      switch (difficulty) {
        case 'easy':
          // 容易模式下:
          // 1. 计算机会有20%的几率做出次优的选择
          // 2. 不会太关注对手的威胁
          // 3. 偏好随机走子
          if (Math.random() < 0.2) {
            score = score * 0.5; // 降低分数
          }
          
          // 降低防守权重
          if (wouldFormOpenFourClient(board, row, col, opponent) ||
              wouldFormOpenThreeClient(board, row, col, opponent)) {
            score = score * 0.7; // 降低防守的优先级
          }
          
          // 添加更多随机性
          score += Math.random() * 500;
          break;
          
        case 'medium':
          // 中等模式下:
          // 1. 平衡进攻和防守
          // 2. 较少随机性
          if (wouldFormOpenFourClient(board, row, col, player)) {
            score += 1000; // 提高己方活四权重
          }
          if (wouldFormOpenThreeClient(board, row, col, player)) {
            score += 500; // 提高己方活三权重
          }
          
          // 添加适度随机性
          score += Math.random() * 200;
          break;
          
        case 'hard':
          // 困难模式下:
          // 1. 优先进攻和防守关键位置
          // 2. 几乎没有随机性
          // 3. 拥有更强的战略意识
          if (wouldFormOpenFourClient(board, row, col, player)) {
            score += 2000; // 大幅提高己方活四权重
          }
          if (wouldFormOpenThreeClient(board, row, col, player)) {
            score += 1000; // 大幅提高己方活三权重
          }
          if (wouldFormOpenFourClient(board, row, col, opponent)) {
            score += 1800; // 大幅提高防守对手活四的权重
          }
          if (wouldFormOpenThreeClient(board, row, col, opponent)) {
            score += 900; // 大幅提高防守对手活三的权重
          }
          
          // 中心位置更加重要
          score += getPositionValueClient(row, col) * 5;
          
          // 非常低的随机性
          score += Math.random() * 50;
          break;
      }
      
      possibleMoves.push({ row, col, score });
    }
  }
  
  // 特殊情况：如果没有可行的移动，返回第一个空位置
  if (possibleMoves.length === 0) {
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 19; col++) {
        if (board[row][col] === null) {
          return { row, col };
        }
      }
    }
    return null;
  }
  
  // 排序移动（根据评分从高到低）
  possibleMoves.sort((a, b) => b.score - a.score);
  
  // 返回最佳的移动
  return { row: possibleMoves[0].row, col: possibleMoves[0].col };
}

// 简单的神经网络模型（预先设定权重，没有实际训练过程）
function neuralNetworkComputer(board: Cell[][], player: 'black' | 'white'): { row: number, col: number } | null {
  // 这是一个简化的神经网络评估函数，实际中可能需要真正的模型
  // 检查立即获胜与防御
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null) {
        // 检查是否为获胜着法
        board[row][col] = player;
        if (checkWinningMove(board, row, col)) {
          board[row][col] = null;
          return { row, col };
        }
        board[row][col] = null;
        
        // 检查是否需要防守
        const opponent = player === 'black' ? 'white' : 'black';
        board[row][col] = opponent;
        if (checkWinningMove(board, row, col)) {
          board[row][col] = null;
          return { row, col };
        }
        board[row][col] = null;
      }
    }
  }
  
  // 生成所有候选移动
  const candidates: { row: number, col: number, score: number }[] = [];
  
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null && hasNeighbor(board, row, col, 2)) {
        // 计算神经网络风格的特征
        const features = extractFeatures(board, row, col, player);
        const score = evaluateWithNeuralNetwork(features);
        
        candidates.push({ row, col, score });
      }
    }
  }
  
  // 如果没有候选移动
  if (candidates.length === 0) {
    return findFirstEmptyCell(board);
  }
  
  // 按分数排序并选择最高分
  candidates.sort((a, b) => b.score - a.score);
  return { row: candidates[0].row, col: candidates[0].col };
  
  // 提取简化的神经网络特征
  function extractFeatures(board: Cell[][], row: number, col: number, player: 'black' | 'white'): number[] {
    const features = [];
    const opponent = player === 'black' ? 'white' : 'black';
    
    // 临时模拟落子
    board[row][col] = player;
    
    // 特征1：中心距离（归一化）
    const centerDistance = Math.sqrt(Math.pow(row - 9, 2) + Math.pow(col - 9, 2)) / 12.73;
    features.push(1 - centerDistance); // 距离中心越近越好
    
    // 特征2-5：四个方向上的连子数量
    const directions = [
      [[0, 1], [0, -1]],  // 水平
      [[1, 0], [-1, 0]],  // 垂直
      [[1, 1], [-1, -1]], // 对角线
      [[1, -1], [-1, 1]]  // 反对角线
    ];
    
    for (const direction of directions) {
      let count = 1; // 当前位置
      
      for (const [dx, dy] of direction) {
        let x = row + dx;
        let y = col + dy;
        
        while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === player) {
          count++;
          x += dx;
          y += dy;
        }
      }
      
      features.push(count / 5); // 归一化为0-1
    }
    
    // 特征6-9：四个方向上的对手连子阻断
    for (const direction of directions) {
      let blocked = 0;
      
      for (const [dx, dy] of direction) {
        let x = row + dx;
        let y = col + dy;
        
        let opponentCount = 0;
        while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === opponent) {
          opponentCount++;
          x += dx;
          y += dy;
        }
        
        if (opponentCount > 0) {
          blocked++;
        }
      }
      
      features.push(blocked / 2); // 归一化为0-1
    }
    
    // 撤销落子
    board[row][col] = null;
    
    return features;
  }
  
  // 简单的前馈神经网络计算（使用预定义权重）
  function evaluateWithNeuralNetwork(features: number[]): number {
    // 预定义的隐层权重（实际应用中这些应该通过训练获得）
    const hiddenWeights = [
      [0.5, 0.8, 0.6, 0.7, 0.9, 0.4, 0.3, 0.5, 0.2],
      [0.6, 0.7, 0.5, 0.8, 0.6, 0.3, 0.2, 0.4, 0.3],
      [0.7, 0.5, 0.8, 0.6, 0.7, 0.5, 0.4, 0.2, 0.5],
      [0.8, 0.6, 0.7, 0.5, 0.8, 0.6, 0.5, 0.3, 0.4],
      [0.4, 0.9, 0.4, 0.9, 0.5, 0.7, 0.6, 0.4, 0.5]
    ];
    
    // 输出层权重
    const outputWeights = [0.9, 0.8, 0.7, 0.6, 0.5];
    
    // 计算隐藏层
    const hidden = hiddenWeights.map(weights => {
      let sum = 0;
      for (let i = 0; i < features.length; i++) {
        sum += features[i] * weights[i];
      }
      return Math.tanh(sum); // 激活函数
    });
    
    // 计算输出
    let output = 0;
    for (let i = 0; i < hidden.length; i++) {
      output += hidden[i] * outputWeights[i];
    }
    
    return Math.tanh(output) * 100; // 缩放到合理范围
  }
}

// 辅助函数：检查位置周围是否有棋子
function hasNeighbor(board: Cell[][], row: number, col: number, distance: number = 1): boolean {
  for (let dr = -distance; dr <= distance; dr++) {
    for (let dc = -distance; dc <= distance; dc++) {
      if (dr === 0 && dc === 0) continue;
      
      const r = row + dr;
      const c = col + dc;
      
      if (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] !== null) {
        return true;
      }
    }
  }
  
  return false;
}

// 辅助函数：查找第一个空位置
function findFirstEmptyCell(board: Cell[][]): { row: number, col: number } | null {
  const center = 9;
  
  // 先检查中心位置
  if (board[center][center] === null) {
    return { row: center, col: center };
  }
  
  // 从中心向外螺旋查找
  const spiral = [
    [0, 0], [-1, 0], [-1, 1], [0, 1], [1, 1], 
    [1, 0], [1, -1], [0, -1], [-1, -1], [-2, 0],
    [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], 
    [2, 2], [2, 1], [2, 0], [2, -1], [2, -2]
  ];
  
  for (const [dx, dy] of spiral) {
    const r = center + dx;
    const c = center + dy;
    if (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === null) {
      return { row: r, col: c };
    }
  }
  
  // 如果螺旋查找失败，扫描整个棋盘
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 19; c++) {
      if (board[r][c] === null) {
        return { row: r, col: c };
      }
    }
  }
  
  return null; // 棋盘已满
}

// 辅助函数：评估整个棋盘的分数（针对Minimax）
function evaluateBoard(board: Cell[][], player: 'black' | 'white'): number {
  let score = 0;
  const opponent = player === 'black' ? 'white' : 'black';
  
  // 检查全部位置的分数
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === player) {
        score += evaluatePositionClient(board, row, col, player);
      } else if (board[row][col] === opponent) {
        score -= evaluatePositionClient(board, row, col, opponent);
      }
    }
  }
  
  return score;
}

// 辅助函数：检查是否是获胜的移动
function checkWinningMove(board: Cell[][], row: number, col: number): boolean {
  if (board[row][col] === null) return false;
  
  const directions = [
    [0, 1],  // 水平
    [1, 0],  // 垂直
    [1, 1],  // 对角线
    [1, -1]  // 反对角线
  ];
  
  for (const [dx, dy] of directions) {
    let count = 1;
    
    // 正方向检查
    for (let i = 1; i < 5; i++) {
      const r = row + dx * i;
      const c = col + dy * i;
      
      if (r < 0 || r >= 19 || c < 0 || c >= 19 || board[r][c] !== board[row][col]) {
        break;
      }
      
      count++;
    }
    
    // 反方向检查
    for (let i = 1; i < 5; i++) {
      const r = row - dx * i;
      const c = col - dy * i;
      
      if (r < 0 || r >= 19 || c < 0 || c >= 19 || board[r][c] !== board[row][col]) {
        break;
      }
      
      count++;
    }
    
    if (count >= 5) {
      return true;
    }
  }
  
  return false;
}

// 主要函数：根据选择的算法和难度选择计算机移动
function findComputerMove(
  board: Cell[][], 
  player: 'black' | 'white', 
  algorithm: ComputerAlgorithm, 
  difficulty: 'easy' | 'medium' | 'hard'
): { row: number, col: number } | null {
  // 快速检查是否有立即获胜的着法
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null) {
        board[row][col] = player;
        if (checkWinningMove(board, row, col)) {
          board[row][col] = null;
          return { row, col };
        }
        board[row][col] = null;
      }
    }
  }
  
  // 快速检查是否有立即需要阻止的着法
  const opponent = player === 'black' ? 'white' : 'black';
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null) {
        board[row][col] = opponent;
        if (checkWinningMove(board, row, col)) {
          board[row][col] = null;
          return { row, col };
        }
        board[row][col] = null;
      }
    }
  }
  
  // 根据算法选择计算机移动
  switch (algorithm) {
    case 'SimpleEval':
      // 基于难度使用增强版简单算法
      return findEnhancedSimpleMove(board, player, difficulty);
      
    case 'NeuralNetwork':
      // 使用神经网络模型
      try {
        const nnResult = neuralNetworkComputer(board, player);
        if (nnResult) {
          return nnResult;
        }
      } catch (e) {
        console.error("Neural Network error:", e);
      }
      // 如果神经网络失败，回退到简单算法
      return findEnhancedSimpleMove(board, player, 'medium');
      
    default:
      // 默认使用简单评估函数
      return findEnhancedSimpleMove(board, player, 'medium');
  }
}

export default function GameBoard({ 
  blackPlayer, 
  whitePlayer, 
  blackApiConfig, 
  whiteApiConfig,
  blackPlayerId,
  whitePlayerId,
  blackPromptType,
  whitePromptType,
  blackCustomPrompt,
  whiteCustomPrompt,
  autoPlay,
  onReturnToSettings,
  forbiddenRules
}: GameBoardProps) {
  const [board, setBoard] = useState<Cell[][]>(Array(19).fill(null).map(() => Array(19).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black');
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<'black' | 'white' | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{row: number, col: number} | null>(null);
  const [moveHistory, setMoveHistory] = useState<{row: number, col: number, player: 'black' | 'white'}[]>([]);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blackSessionId, setBlackSessionId] = useState<string | undefined>(undefined);
  const [whiteSessionId, setWhiteSessionId] = useState<string | undefined>(undefined);
  const [moveCount, setMoveCount] = useState<number>(0);

  const checkWinner = (row: number, col: number, player: 'black' | 'white'): boolean => {
    const directions = [
      [[0, 1], [0, -1]], // horizontal
      [[1, 0], [-1, 0]], // vertical
      [[1, 1], [-1, -1]], // diagonal
      [[1, -1], [-1, 1]] // anti-diagonal
    ];

    return directions.some(direction => {
      const count = 1 + // current cell
        direction.reduce((acc, [dx, dy]) => {
          let x = row + dx;
          let y = col + dy;
          let count = 0;
          while (
            x >= 0 && x < 19 &&
            y >= 0 && y < 19 &&
            board[x][y] === player
          ) {
            count++;
            x += dx;
            y += dy;
          }
          return acc + count;
        }, 0);
      return count >= 5;
    });
  };

  // 获取当前玩家的配置
  const getCurrentPlayerConfig = (): ApiConfig => {
    return currentPlayer === 'black' ? blackApiConfig : whiteApiConfig;
  };

  // 获取当前玩家类型
  const getCurrentPlayerType = (): 'human' | 'ai' | 'computer' => {
    return currentPlayer === 'black' ? blackPlayer : whitePlayer;
  };

  // 确定玩家是否是AI（根据配置的API密钥判断）
  const isCurrentPlayerAI = (): boolean => {
    const playerType = getCurrentPlayerType();
    const config = getCurrentPlayerConfig();
    return playerType === 'ai' && config.isAI === true;
  };

  // 添加一个新的移动到棋盘和历史记录
  const addMove = (row: number, col: number, player: 'black' | 'white') => {
    const newBoard = [...board];
    newBoard[row][col] = player;
    setBoard(newBoard);
    setLastMove({row, col});
    setMoveHistory([...moveHistory, {row, col, player}]);

    if (checkWinner(row, col, player)) {
      setIsGameOver(true);
      setWinner(player);
      setShowVictoryModal(true);
      return true;
    }
    return false;
  };

  // 让AI下一步棋
  const makeAIMove = async () => {
    if (isGameOver || isThinking) return;
    
    setIsThinking(true);
    setErrorMessage(null);
    
    try {
      // 获取当前玩家的配置
      const apiConfig = getCurrentPlayerConfig();
      const promptType = currentPlayer === 'black' ? blackPromptType : whitePromptType;
      const customPrompt = currentPlayer === 'black' ? blackCustomPrompt : whiteCustomPrompt;
      const sessionId = currentPlayer === 'black' ? blackSessionId : whiteSessionId;
      
      // 如果是"电脑棋手"，使用本地算法
      if (getCurrentPlayerType() === 'computer') {
        console.log('使用电脑棋手算法:', apiConfig.computerAlgorithm, '难度:', apiConfig.difficulty);
        
        // 使用选定的算法和难度计算下一步
        const move = findComputerMove(
          board, 
          currentPlayer, 
          apiConfig.computerAlgorithm || 'SimpleEval', 
          apiConfig.difficulty || 'medium'
        );
        
        if (move) {
          setTimeout(() => {
            const gameEnded = addMove(move.row, move.col, currentPlayer);
            if (!gameEnded) {
              setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
            }
            setIsThinking(false);
            setMoveCount(prevCount => prevCount + 1);
          }, 300); // 添加短暂延迟以提高用户体验
          return;
        } else {
          setErrorMessage('电脑算法无法找到有效的落子位置');
          setIsThinking(false);
          return;
        }
      }
      
      // 如果是AI但没有设置API密钥，使用本地AI
      if (apiConfig.isAI && !apiConfig.apiKey) {
        setErrorMessage(`没有设置API密钥，使用本地AI算法`);
        // 保存原始玩家
        const currentPlayerBeforeMove = currentPlayer;
        const move = findBestMoveClient(board, currentPlayer);
        if (move) {
          const gameEnded = addMove(move.row, move.col, currentPlayer);
          if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
            // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        }
        setIsThinking(false);
        setMoveCount(prevCount => prevCount + 1);
        return;
      }
      
      // 在静态环境中使用本地算法
      if (isStaticEnvironment()) {
        console.log('在静态环境中，使用本地AI算法');
        setErrorMessage(`在静态部署环境中无法访问外部API，使用本地AI算法`);
        // 保存原始玩家
        const currentPlayerBeforeMove = currentPlayer;
        const move = findBestMoveClient(board, currentPlayer);
        if (move) {
          const gameEnded = addMove(move.row, move.col, currentPlayer);
          if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
            // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        }
        setIsThinking(false);
        setMoveCount(prevCount => prevCount + 1);
        return;
      }
      
      // 常规API调用
      // 设置重试次数和延迟
      let retryAttempt = 0;
      const maxRetries = 1;
      
      // 使用API发起请求，带重试逻辑
      let response = await fetch('/api/gobang/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board,
          apiKey: apiConfig.apiKey,
          baseUrl: apiConfig.baseUrl,
          model: apiConfig.model,
          currentPlayer,
          promptType,
          customPrompt,
          sessionId,
          moveNumber: moveCount + 1,
          forbiddenRules: currentPlayer === 'black' ? forbiddenRules : null // 只有黑棋需要禁手规则
        }),
      });
      
      // 处理API响应
      let data;
      try {
        data = await response.json();
        
        // 保存会话ID
        if (data.sessionId) {
          if (currentPlayer === 'black') {
            setBlackSessionId(data.sessionId);
          } else {
            setWhiteSessionId(data.sessionId);
          }
        }
        
        // 检查是否有坐标自动修正提示
        if (data.error && data.row !== undefined && data.col !== undefined) {
          // 如果API返回了修正后的落子位置，显示错误提示但仍使用修正的坐标
          setErrorMessage(`AI返回错误: ${data.error}`);
          
          console.log(`使用修正后的坐标: (${data.row}, ${data.col})`);
          const gameEnded = addMove(data.row, data.col, currentPlayer);
          if (!gameEnded) {
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
          setIsThinking(false);
          setMoveCount(prevCount => prevCount + 1);
          return;
        }
        
        // 处理返回的错误
        if (data.error) {
          console.error('AI返回错误:', data.error);
          
          // 检查是否需要重试（特定错误类型）
          const shouldRetry = 
            (data.error.includes('无法从AI回复中解析有效的移动坐标') || 
              data.error.includes('AI返回的坐标超出范围') ||
              data.error.includes('已被占用')) && 
            retryAttempt < maxRetries;
          
          if (shouldRetry) {
            console.log(`尝试重试请求 (${retryAttempt + 1}/${maxRetries})`);
            // 等待短暂时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 再次发送请求
            retryAttempt++;
            response = await fetch('/api/gobang/move', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                board,
                apiKey: apiConfig.apiKey,
                baseUrl: apiConfig.baseUrl,
                model: apiConfig.model,
                currentPlayer,
                promptType,
                customPrompt,
                sessionId,
                moveNumber: moveCount + 1,
                forbiddenRules: currentPlayer === 'black' ? forbiddenRules : null // 只有黑棋需要禁手规则
              }),
            });
            
            // 处理重试响应
            try {
              data = await response.json();
              
              // 更新会话ID
              if (data.sessionId) {
                if (currentPlayer === 'black') {
                  setBlackSessionId(data.sessionId);
                } else {
                  setWhiteSessionId(data.sessionId);
                }
              }
              
              // 检查修正后的坐标
              if (data.error && data.row !== undefined && data.col !== undefined) {
                setErrorMessage(`AI请求重试后返回修正坐标: ${data.error}`);
                
                const gameEnded = addMove(data.row, data.col, currentPlayer);
                if (!gameEnded) {
                  setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
                }
                setIsThinking(false);
                setMoveCount(prevCount => prevCount + 1);
                return;
              }
              
              // 如果仍然有错误，使用本地AI
              if (data.error) {
                console.error('重试后仍然出错:', data.error);
                setErrorMessage(`AI请求重试后仍然出错: ${data.error}，使用本地AI`);
                // 保存原始玩家
                const currentPlayerBeforeMove = currentPlayer;
                const move = findBestMoveClient(board, currentPlayer);
                if (move) {
                  const gameEnded = addMove(move.row, move.col, currentPlayer);
                  if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
                    // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
                    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
                  }
                }
                setIsThinking(false);
                setMoveCount(prevCount => prevCount + 1);
                return;
              }
            } catch (parseError) {
              console.error('解析重试响应出错:', parseError);
              setErrorMessage(`解析重试响应出错，使用本地AI`);
              // 保存原始玩家
              const currentPlayerBeforeMove = currentPlayer;
              const move = findBestMoveClient(board, currentPlayer);
              if (move) {
                const gameEnded = addMove(move.row, move.col, currentPlayer);
                if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
                  // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
                  setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
                }
              }
              setIsThinking(false);
              setMoveCount(prevCount => prevCount + 1);
              return;
            }
          } else {
            // 不需要重试或重试次数已用完
            setErrorMessage(`AI返回错误: ${data.error}，使用本地AI`);
            // 保存原始玩家
            const currentPlayerBeforeMove = currentPlayer;
            const move = findBestMoveClient(board, currentPlayer);
            if (move) {
              const gameEnded = addMove(move.row, move.col, currentPlayer);
              if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
                // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
                setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
              }
            }
            setIsThinking(false);
            setMoveCount(prevCount => prevCount + 1);
            return;
          }
        }
        
        // 处理成功的响应
        if (data.row !== undefined && data.col !== undefined) {
          // 使用AI返回的坐标
          const gameEnded = addMove(data.row, data.col, currentPlayer);
          if (!gameEnded) {
            // 切换到下一个玩家
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        } else {
          // 无法解析AI的回应，使用本地AI
          console.error('无法解析AI的回应:', data);
          setErrorMessage(`无法解析AI的回应，使用本地AI`);
          // 保存原始玩家
          const currentPlayerBeforeMove = currentPlayer;
          const move = findBestMoveClient(board, currentPlayer);
          if (move) {
            const gameEnded = addMove(move.row, move.col, currentPlayer);
            if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
              // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
              setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
            }
          }
        }
      } catch (parseError) {
        // 无法解析响应，使用本地AI
        console.error('无法解析响应:', parseError);
        setErrorMessage(`无法解析响应，使用本地AI`);
        // 保存原始玩家
        const currentPlayerBeforeMove = currentPlayer;
        const move = findBestMoveClient(board, currentPlayer);
        if (move) {
          const gameEnded = addMove(move.row, move.col, currentPlayer);
          if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
            // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        }
      }
    } catch (error) {
      // 捕获的异常，使用本地AI
      console.error('AI移动出错:', error);
      setErrorMessage(`AI移动出错: ${error instanceof Error ? error.message : '未知错误'}，使用本地AI`);
      // 保存原始玩家
      const currentPlayerBeforeMove = currentPlayer;
      const move = findBestMoveClient(board, currentPlayer);
      if (move) {
        const gameEnded = addMove(move.row, move.col, currentPlayer);
        if (!gameEnded && currentPlayerBeforeMove === currentPlayer) {
          // 只有当currentPlayer在处理过程中没有被其他代码修改时才切换
          setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
        }
      }
    } finally {
      setIsThinking(false);
      setMoveCount(prevCount => prevCount + 1);
    }
  };

  // 处理人类玩家移动
  const handleHumanMove = (row: number, col: number) => {
    if (isGameOver || board[row][col] !== null || isThinking) return;
    
    // 检查当前玩家是否是人类
    if (getCurrentPlayerType() !== 'human') return;
    
    // 检查禁手规则（仅对黑棋有效）
    if (currentPlayer === 'black' && checkForbiddenMoves(board, row, col, currentPlayer)) {
      // 错误消息已在checkForbiddenMoves函数中设置
      return;
    }

    const gameEnded = addMove(row, col, currentPlayer);
    
    if (!gameEnded) {
      // 切换到下一个玩家
      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    }
  };
  
  // 处理单步AI移动（用于手动控制AI对战）
  const handleNextAIMove = () => {
    if (isGameOver || isThinking) return;
    
    // 检查当前玩家是否是AI或电脑
    if (getCurrentPlayerType() === 'ai' || getCurrentPlayerType() === 'computer') {
      makeAIMove();
    }
  };

  // 自动下一步（用于AI对战）
  useEffect(() => {
    // 如果是AI/电脑的回合并且启用了自动播放
    if (
      !isGameOver && 
      !isThinking && 
      (getCurrentPlayerType() === 'ai' || getCurrentPlayerType() === 'computer') && 
      (autoPlay || 
       (blackPlayer === 'human' && (whitePlayer === 'ai' || whitePlayer === 'computer') && currentPlayer === 'white') ||
       ((blackPlayer === 'ai' || blackPlayer === 'computer') && whitePlayer === 'human' && currentPlayer === 'black'))
    ) {
      const timeoutId = setTimeout(() => {
        makeAIMove();
      }, 1000); // 延迟一秒，让玩家能够看清楚
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentPlayer, isGameOver, isThinking, makeAIMove, autoPlay, blackPlayer, whitePlayer]);

  // 重置游戏
  const resetGame = () => {
    setBoard(Array(19).fill(null).map(() => Array(19).fill(null)));
    setCurrentPlayer('black');
    setIsGameOver(false);
    setWinner(null);
    setIsThinking(false);
    setLastMove(null);
    setMoveHistory([]);
    setShowVictoryModal(false);
    setErrorMessage(null);
    setBlackSessionId(undefined);
    setWhiteSessionId(undefined);
    setMoveCount(0);
  };

  // 获取玩家显示名称
  const getPlayerDisplayName = (player: 'black' | 'white') => {
    const isCurrentPlayer = player === 'black';
    const playerType = isCurrentPlayer ? blackPlayer : whitePlayer;
    const apiConfig = isCurrentPlayer ? blackApiConfig : whiteApiConfig;
    const playerId = isCurrentPlayer ? blackPlayerId : whitePlayerId;
    
    if (playerType === 'ai') {
      return `AI (${apiConfig.model})`;
    }
    if (playerType === 'computer') {
      const algorithm = apiConfig.computerAlgorithm || 'SimpleEval';
      const difficulty = apiConfig.difficulty || 'medium';
      return `电脑 (${algorithm}, ${difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'})`;
    }
    return playerId;
  };

  // 检查位置是否违反禁手规则
  const checkForbiddenMoves = (board: Cell[][], row: number, col: number, player: Cell): boolean => {
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
      setErrorMessage("长连禁手：黑棋不能形成超过五子的连续棋子");
      return true;
    }
    
    // 检查双四禁手
    if (forbiddenRules.doubleFour && checkDoubleFour(tempBoard, row, col)) {
      setErrorMessage("双四禁手：黑棋不能同时形成两个活四");
      return true;
    }
    
    // 检查双三禁手
    if (forbiddenRules.doubleThree && checkDoubleThree(tempBoard, row, col)) {
      setErrorMessage("双三禁手：黑棋不能同时形成两个活三");
      return true;
    }
    
    return false;
  };
  
  // 检查长连禁手（六子或更多连成一线）
  const checkOverline = (board: Cell[][], row: number, col: number): boolean => {
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
  };
  
  // 检查双四禁手（两个活四）
  const checkDoubleFour = (board: Cell[][], row: number, col: number): boolean => {
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
  };
  
  // 检查是否有活四
  const hasFour = (board: Cell[][], row: number, col: number, dx: number, dy: number): boolean => {
    const patterns = [
      [".", "B", "B", "B", "B", "."], // 活四: .BBBB.
      ["B", ".", "B", "B", "B"],      // 冲四: B.BBB
      ["B", "B", ".", "B", "B"],      // 冲四: BB.BB
      ["B", "B", "B", ".", "B"]       // 冲四: BBB.B
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
  };
  
  // 检查双三禁手
  const checkDoubleThree = (board: Cell[][], row: number, col: number): boolean => {
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
  };
  
  // 检查是否有活三
  const hasThree = (board: Cell[][], row: number, col: number, dx: number, dy: number): boolean => {
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
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* 错误消息显示 - 移到顶部 */}
      <div className={`transition-all duration-300 overflow-hidden mb-2 ${errorMessage ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'}`} style={{ width: '570px' }}>
        <div className="alert alert-warning shadow-lg flex justify-between">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6 mt-1" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="ml-2">
              <p className="font-semibold">{errorMessage}</p>
              <p className="text-xs opacity-80">
                {currentPlayer === 'black' 
                  ? blackPlayer === 'ai' ? `${blackApiConfig.model} → 电脑AI` : '' 
                  : whitePlayer === 'ai' ? `${whiteApiConfig.model} → 电脑AI` : ''}
              </p>
            </div>
          </div>
          <button className="btn btn-circle btn-sm ml-auto" onClick={() => setErrorMessage(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 胜利弹窗 */}
      {showVictoryModal && winner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-base-100 p-8 rounded-xl shadow-xl border-4 border-primary animate-bounce max-w-md w-full">
            <div className="text-center">
              <div className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
                <span className={`inline-block w-8 h-8 rounded-full ${winner === 'black' ? 'bg-black' : 'bg-white border border-gray-300'}`}></span>
                <span>{winner === 'black' ? '黑方' : '白方'}胜利!</span>
              </div>
              <p className="text-xl mb-6">
                {winner === 'black' ? getPlayerDisplayName('black') : getPlayerDisplayName('white')} 
                以出色的表现赢得了比赛！
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowVictoryModal(false)}
                >
                  继续观看棋盘
                </button>
                <button 
                  className="btn btn-accent" 
                  onClick={resetGame}
                >
                  重新开始
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative bg-amber-100 rounded-lg shadow-xl overflow-hidden">
        {/* 横向网格线 */}
        <div className="absolute inset-0 grid grid-cols-19 gap-0">
          {Array(19).fill(null).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="col-span-19 h-[30px] border-b border-gray-800" style={{ gridRow: rowIndex + 1 }} />
          ))}
        </div>
        {/* 竖向网格线 */}
        <div className="absolute inset-0 grid grid-rows-19 gap-0">
          {Array(19).fill(null).map((_, colIndex) => (
            <div key={`col-${colIndex}`} className="row-span-19 w-[30px] border-r border-gray-800" style={{ gridColumn: colIndex + 1 }} />
          ))}
        </div>
        
        {/* 星位点(天元和星位) */}
        {[[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]].map(([r, c]) => (
          <div 
            key={`star-${r}-${c}`} 
            className="absolute w-2 h-2 rounded-full bg-black" 
            style={{ 
              top: `calc(${r} * 30px - 4px)`, 
              left: `calc(${c} * 30px - 4px)` 
            }}
          />
        ))}
        
        {/* 棋子 */}
        <div className="relative grid grid-cols-19 gap-0 w-[570px] h-[570px]">
          {board.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`}
                className="relative w-[30px] h-[30px] flex items-center justify-center"
              >
                <button
                  className={`absolute w-7 h-7 rounded-full transform -translate-x-1/2 -translate-y-1/2 
                    ${cell === 'black' ? 'bg-black shadow-md' : 
                      cell === 'white' ? 'bg-white border border-gray-300 shadow-md' : 
                      (getCurrentPlayerType() === 'human' ? 'hover:bg-gray-300 hover:bg-opacity-30 hover:rounded-full' : '')}
                    ${lastMove && lastMove.row === rowIndex && lastMove.col === colIndex ? 'ring-2 ring-red-500' : ''}
                  `}
                  onClick={() => handleHumanMove(rowIndex, colIndex)}
                  disabled={isGameOver || isThinking || getCurrentPlayerType() !== 'human'}
                  title={`${rowIndex},${colIndex}`}
                />
              </div>
            ))
          ))}
        </div>
      </div>
      
      <div className="flex flex-col gap-4 bg-base-200 p-6 rounded-lg shadow-md w-full max-w-xl" style={{ maxWidth: 'calc(1.2 * 36rem)' }}>
        {/* 游戏状态和控制区 */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="text-xl font-bold text-center md:text-left flex-1">
            {isGameOver ? (
              winner ? (
                <div className="flex items-center gap-2">
                  <span 
                    className={`inline-block w-6 h-6 rounded-full ${winner === 'black' ? 'bg-black' : 'bg-white border border-gray-300'}`}
                  ></span>
                  <span>{winner === 'black' ? '黑方' : '白方'}胜利!</span>
                </div>
              ) : '平局'
            ) : (
              <div className="flex items-center gap-2">
                <span 
                  className={`inline-block w-6 h-6 rounded-full ${currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-gray-300'}`}
                ></span>
                <span>
                  {currentPlayer === 'black' ? '黑方' : '白方'}回合
                  {getCurrentPlayerType() === 'ai' && ` (${
                    currentPlayer === 'black' ? blackApiConfig.model : whiteApiConfig.model
                  })`}
                  {getCurrentPlayerType() === 'human' && ` (${
                    currentPlayer === 'black' ? blackPlayerId : whitePlayerId
                  })`}
                  {getCurrentPlayerType() === 'computer' && ` (电脑棋手)`}
                </span>
                {isThinking && <div className="loading loading-spinner loading-md ml-2"></div>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {(((blackPlayer === 'ai' || blackPlayer === 'computer') && 
                (whitePlayer === 'ai' || whitePlayer === 'computer')) && 
                !autoPlay && !isGameOver) && (
              <button
                className="btn btn-primary"
                onClick={handleNextAIMove}
                disabled={isThinking}
              >
                下一步
              </button>
            )}
            <button
              className="btn btn-accent"
              onClick={resetGame}
            >
              重新开始
            </button>
            {onReturnToSettings && (
              <button
                className="btn btn-neutral"
                onClick={onReturnToSettings}
              >
                返回设置
              </button>
            )}
          </div>
        </div>
        
        {/* 移动历史记录 */}
        {moveHistory.length > 0 && (
          <div className="mt-2">
            <h3 className="font-bold mb-2">历史记录</h3>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-xs">
              {moveHistory.map((move, index) => (
                <div key={index} className="bg-base-100 p-1 rounded flex items-center gap-1">
                  <span className={`inline-block w-3 h-3 rounded-full ${move.player === 'black' ? 'bg-black' : 'bg-white border'}`}></span>
                  <span>{index + 1}: ({move.row},{move.col})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 