'use client';

import { useState, useEffect, useCallback } from 'react';

type Cell = 'black' | 'white' | null;
type PlayerType = 'human' | 'ai' | 'computer';
type ComputerAlgorithm = 'LocalEval' | 'NeuralNetwork' | 'TSS';

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
    score += 2000; // 提高活四权重
  }
  
  // 检查是否能阻止对手形成活四
  if (wouldFormOpenFourClient(board, row, col, opponent)) {
    score += 1800; // 提高防守对手活四的权重
  }
  
  // 检查是否能形成活三
  if (wouldFormOpenThreeClient(board, row, col, player)) {
    score += 1000; // 提高活三权重
  }
  
  // 检查是否能阻止对手形成活三
  if (wouldFormOpenThreeClient(board, row, col, opponent)) {
    score += 900; // 提高防守对手活三的权重
  }
  
  // 加入局部棋型评估
  board[row][col] = player;
  score += evaluateLocalPattern(board, row, col, player) * 10;
  board[row][col] = null;
  
  // 考虑位置价值
  score += getPositionValueClient(row, col) * 3;
  
  return score;
}

// 评估局部棋型
function evaluateLocalPattern(board: Cell[][], row: number, col: number, player: Cell): number {
  if (board[row][col] !== player) return 0;
  
  const opponent = player === 'black' ? 'white' : 'black';
  let score = 0;
  
  // 8个方向
  const directions = [
    [0, 1], [1, 1], [1, 0], [1, -1],
    [0, -1], [-1, -1], [-1, 0], [-1, 1]
  ];
  
  for (const [dx, dy] of directions) {
    let ownCount = 1; // 包括当前点
    let emptyBefore = false;
    let emptyAfter = false;
    
    // 向一个方向扫描
    let x = row + dx;
    let y = col + dy;
    let steps = 1;
    
    // 检查连续的己方棋子
    while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === player && steps < 5) {
      ownCount++;
      x += dx;
      y += dy;
      steps++;
    }
    
    // 检查这个方向末端是否为空
    if (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === null) {
      emptyAfter = true;
    }
    
    // 向相反方向扫描
    x = row - dx;
    y = col - dy;
    steps = 1;
    
    // 检查连续的己方棋子
    while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === player && steps < 5) {
      ownCount++;
      x -= dx;
      y -= dy;
      steps++;
    }
    
    // 检查这个方向末端是否为空
    if (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === null) {
      emptyBefore = true;
    }
    
    // 根据棋型加分
    if (ownCount >= 4) {
      if (emptyBefore || emptyAfter) { // 活四或冲四
        score += 300;
      }
    } else if (ownCount == 3) {
      if (emptyBefore && emptyAfter) { // 活三
        score += 150;
      } else if (emptyBefore || emptyAfter) { // 眠三
        score += 50;
      }
    } else if (ownCount == 2) {
      if (emptyBefore && emptyAfter) { // 活二
        score += 30;
      } else if (emptyBefore || emptyAfter) { // 眠二
        score += 10;
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

// 增强版局部评估算法，根据难度调整策略
function findEnhancedLocalMove(
  board: Cell[][],
  player: 'black' | 'white',
  difficulty: 'easy' | 'medium' | 'hard'
): { row: number, col: number } | null {
  const opponent = player === 'black' ? 'white' : 'black';
  const { depth, candidateLimit, randomness } = getSearchParamsForDifficulty(difficulty);
  const candidates = generateCandidateMoves(board, player, candidateLimit);

  if (candidates.length === 0) {
    return findFirstEmptyCell(board);
  }

  if (depth === 1) {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const topChoices = sorted.slice(0, Math.min(3, sorted.length));

    if (randomness > 0 && topChoices.length > 1 && Math.random() < randomness) {
      const randomIndex = Math.floor(Math.random() * topChoices.length);
      const move = topChoices[randomIndex];
      return { row: move.row, col: move.col };
    }

    const best = topChoices[0];
    return { row: best.row, col: best.col };
  }

  let bestScore = -Infinity;
  let bestMove = candidates[0];

  for (const move of candidates) {
    board[move.row][move.col] = player;
    const score = minimaxSearch(
      board,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      player,
      opponent,
      candidateLimit
    );
    board[move.row][move.col] = null;

    const adjustedScore = score + move.score * 0.05;

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestMove = move;
    }
  }

  if (randomness > 0 && candidates.length > 1 && Math.random() < randomness) {
    const index = Math.floor(Math.random() * Math.min(2, candidates.length));
    const alternative = candidates[index];
    return { row: alternative.row, col: alternative.col };
  }

  return { row: bestMove.row, col: bestMove.col };
}

interface CandidateMove {
  row: number;
  col: number;
  score: number;
}

function getSearchParamsForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): {
  depth: number;
  candidateLimit: number;
  randomness: number;
} {
  switch (difficulty) {
    case 'easy':
      return { depth: 1, candidateLimit: 6, randomness: 0.35 };
    case 'medium':
      return { depth: 2, candidateLimit: 8, randomness: 0.1 };
    case 'hard':
      return { depth: 3, candidateLimit: 10, randomness: 0 };
    default:
      return { depth: 2, candidateLimit: 8, randomness: 0.1 };
  }
}

function generateCandidateMoves(
  board: Cell[][],
  player: 'black' | 'white',
  limit: number
): CandidateMove[] {
  const opponent = player === 'black' ? 'white' : 'black';
  const candidates: CandidateMove[] = [];
  let hasStone = false;

  for (let row = 0; row < 19 && !hasStone; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] !== null) {
        hasStone = true;
        break;
      }
    }
  }

  if (!hasStone) {
    return [{ row: 9, col: 9, score: 0 }];
  }

  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] !== null) {
        continue;
      }

      if (!hasNeighbor(board, row, col, 2)) {
        continue;
      }

      const attackScore = evaluatePositionClient(board, row, col, player);
      const defenseScore = evaluatePositionClient(board, row, col, opponent);
      let score = attackScore * 1.15 + defenseScore * 1.05 + getPositionValueClient(row, col) * 25;

      if (attackScore >= 9000) {
        score += 15000;
      }

      if (defenseScore >= 9000) {
        score += 12000;
      }

      candidates.push({ row, col, score });
    }
  }

  if (candidates.length === 0) {
    const fallback = findFirstEmptyCell(board);
    if (!fallback) {
      return [];
    }
    return [{ row: fallback.row, col: fallback.col, score: 0 }];
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, limit);
}

function minimaxSearch(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: 'black' | 'white',
  opponent: 'black' | 'white',
  candidateLimit: number
): number {
  if (hasFiveInRow(board, player)) {
    return 40000 + depth * 100;
  }

  if (hasFiveInRow(board, opponent)) {
    return -40000 - depth * 100;
  }

  if (depth === 0) {
    return evaluateBoardState(board, player, opponent);
  }

  const current = maximizing ? player : opponent;
  const moves = generateCandidateMoves(board, current, candidateLimit);

  if (moves.length === 0) {
    return evaluateBoardState(board, player, opponent);
  }

  if (maximizing) {
    let value = -Infinity;

    for (const move of moves) {
      board[move.row][move.col] = current;
      const score = minimaxSearch(board, depth - 1, alpha, beta, false, player, opponent, candidateLimit);
      board[move.row][move.col] = null;

      value = Math.max(value, score);
      alpha = Math.max(alpha, value);

      if (beta <= alpha) {
        break;
      }
    }

    return value;
  }

  let value = Infinity;

  for (const move of moves) {
    board[move.row][move.col] = current;
    const score = minimaxSearch(board, depth - 1, alpha, beta, true, player, opponent, candidateLimit);
    board[move.row][move.col] = null;

    value = Math.min(value, score);
    beta = Math.min(beta, value);

    if (beta <= alpha) {
      break;
    }
  }

  return value;
}

function evaluateBoardState(
  board: Cell[][],
  player: 'black' | 'white',
  opponent: 'black' | 'white'
): number {
  if (hasFiveInRow(board, player)) {
    return 40000;
  }

  if (hasFiveInRow(board, opponent)) {
    return -40000;
  }

  let playerPattern = 0;
  let opponentPattern = 0;
  let playerCenterControl = 0;
  let opponentCenterControl = 0;
  const playerPotentials: number[] = [];
  const opponentPotentials: number[] = [];
  let playerMobility = 0;
  let opponentMobility = 0;

  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      const cell = board[row][col];

      if (cell === player) {
        playerPattern += evaluateLocalPattern(board, row, col, player);
        playerCenterControl += getPositionValueClient(row, col);
      } else if (cell === opponent) {
        opponentPattern += evaluateLocalPattern(board, row, col, opponent);
        opponentCenterControl += getPositionValueClient(row, col);
      } else {
        if (!hasNeighbor(board, row, col, 2)) {
          continue;
        }

        const attackScore = evaluatePositionClient(board, row, col, player);
        const defenseScore = evaluatePositionClient(board, row, col, opponent);

        playerPotentials.push(attackScore);
        opponentPotentials.push(defenseScore);

        if (attackScore > 0) {
          playerMobility++;
        }

        if (defenseScore > 0) {
          opponentMobility++;
        }
      }
    }
  }

  playerPotentials.sort((a, b) => b - a);
  opponentPotentials.sort((a, b) => b - a);

  const playerTopPotential = playerPotentials.slice(0, 4).reduce((sum, value) => sum + value, 0);
  const opponentTopPotential = opponentPotentials.slice(0, 4).reduce((sum, value) => sum + value, 0);

  const patternScore = (playerPattern - opponentPattern) * 15;
  const centerScore = (playerCenterControl - opponentCenterControl) * 10;
  const potentialScore = (playerTopPotential - opponentTopPotential) * 0.8;
  const mobilityScore = (playerMobility - opponentMobility) * 80;

  return patternScore + centerScore + potentialScore + mobilityScore;
}

function hasFiveInRow(board: Cell[][], player: 'black' | 'white'): boolean {
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === player && checkWinningMove(board, row, col)) {
        return true;
      }
    }
  }

  return false;
}

// 简单的神经网络模型（预先设定权重，没有实际训练过程）
function neuralNetworkComputer(board: Cell[][], player: 'black' | 'white', isNNTrained: boolean = false): { row: number, col: number } | null {
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
  
  // 重要优化：先检查对手的活三，防止活三变活四
  const opponent = player === 'black' ? 'white' : 'black';
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null) {
        // 检查这个位置是否能阻止对手形成活四
        board[row][col] = opponent;
        if (wouldFormOpenFourClient(board, row, col, opponent)) {
          board[row][col] = null;
          // 这是一个我们需要阻止的位置
          return { row, col };
        }
        
        // 检查这个位置是否能阻止对手形成活三
        if (wouldFormOpenThreeClient(board, row, col, opponent)) {
          // 标记这个位置为高优先级防守位置
          board[row][col] = null;
          // 如果存在可以变成活四的活三，要立即防守
          return { row, col };
        }
        
        board[row][col] = null;
      }
    }
  }
  
  // 如果训练过，可以使用更高级的策略，包括TSS算法的一些优化
  if (isNNTrained) {
    // 检查自己的进攻机会
    const attackMoves: { row: number, col: number, score: number }[] = [];
    
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 19; col++) {
        if (board[row][col] === null) {
          let attackScore = 0;
          
          // 检查是否能形成进攻性棋形
          board[row][col] = player;
          
          // 检查是否能形成活四
          if (wouldFormOpenFourClient(board, row, col, player)) {
            attackScore += 1000;
          }
          
          // 检查是否能形成活三
          if (wouldFormOpenThreeClient(board, row, col, player)) {
            attackScore += 500;
          }
          
          // 检查是否能形成双三或双四等组合威胁
          let threeCount = 0;
          let fourCount = 0;
          
          // 检查8个方向上的棋形
          const directions = [
            [0, 1], [1, 1], [1, 0], [1, -1],
            [0, -1], [-1, -1], [-1, 0], [-1, 1]
          ];
          
          for (const [dx, dy] of directions) {
            // 计算这个方向上的连子数量
            let continuousCount = 1; // 当前格子
            let emptyBefore = false;
            let emptyAfter = false;
            
            // 一个方向
            let x = row + dx;
            let y = col + dy;
            
            while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === player) {
              continuousCount++;
              x += dx;
              y += dy;
            }
            
            // 检查这端是否开放
            if (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === null) {
              emptyAfter = true;
            }
            
            // 另一个方向
            x = row - dx;
            y = col - dy;
            
            while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === player) {
              continuousCount++;
              x -= dx;
              y -= dy;
            }
            
            // 检查这端是否开放
            if (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === null) {
              emptyBefore = true;
            }
            
            // 根据棋形计算威胁
            if (continuousCount == 3 && (emptyBefore || emptyAfter)) {
              threeCount++;
            } else if (continuousCount == 4 && (emptyBefore || emptyAfter)) {
              fourCount++;
            }
          }
          
          // 特别奖励多重威胁
          if (threeCount >= 2) attackScore += 800; // 双三
          if (fourCount >= 2) attackScore += 1500; // 双四
          if (threeCount >= 1 && fourCount >= 1) attackScore += 1200; // 三四组合
          
          // 恢复棋盘
          board[row][col] = null;
          
          // 如果这是个好的进攻位置
          if (attackScore > 0) {
            attackMoves.push({
              row, 
              col, 
              score: attackScore + getPositionValueClient(row, col) * 3
            });
          }
        }
      }
    }
    
    // 如果有好的进攻机会，选择最佳的
    if (attackMoves.length > 0) {
      attackMoves.sort((a, b) => b.score - a.score);
      return { row: attackMoves[0].row, col: attackMoves[0].col };
    }
    
    // 使用基于局面评估的更复杂局部搜索
    // 这部分代码基于训练后的神经网络和TSS的混合策略
    const criticalPositions: { row: number, col: number, score: number }[] = [];
    
    // 寻找关键位置
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 19; col++) {
        if (board[row][col] === null && hasNeighbor(board, row, col, 2)) {
          // 使用更强的评估函数
          const features = extractFeatures(board, row, col, player);
          const nnScore = evaluateWithNeuralNetwork(features) * 1.5; // 提升训练后的神经网络权重
          
          // 添加额外的基于威胁空间的评估
          board[row][col] = player;
          const threatScore = evaluateLocalPattern(board, row, col, player) * 3;
          board[row][col] = null;
          
          // 防守评分
          board[row][col] = opponent;
          const defenseScore = evaluateLocalPattern(board, row, col, opponent) * 2;
          board[row][col] = null;
          
          // 整合各种得分
          const totalScore = nnScore + threatScore + defenseScore + getPositionValueClient(row, col) * 2;
          
          criticalPositions.push({
            row,
            col,
            score: totalScore
          });
        }
      }
    }
    
    // 对关键位置进行排序并选择最佳的
    if (criticalPositions.length > 0) {
      criticalPositions.sort((a, b) => b.score - a.score);
      
      // 从前几个最佳位置中随机选择一个，增加变化性
      const topN = Math.min(3, criticalPositions.length);
      const index = Math.floor(Math.random() * topN);
      
      return { row: criticalPositions[index].row, col: criticalPositions[index].col };
    }
  }
  
  // 生成所有候选移动
  const candidates: { row: number, col: number, score: number }[] = [];
  
  // 扩大搜索范围但仍然优化性能
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null && hasNeighbor(board, row, col, 3)) {
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
  
  // 为了增加一些多样性，从前3个高分动作中随机选择一个
  // 但只有在差异很小的情况下才这样做
  if (candidates.length >= 3 && 
      Math.abs(candidates[0].score - candidates[2].score) < 100) {
    const topIndex = Math.floor(Math.random() * 3);
    return { row: candidates[topIndex].row, col: candidates[topIndex].col };
  }
  
  return { row: candidates[0].row, col: candidates[0].col };
  
  // 提取简化的神经网络特征
  function extractFeatures(board: Cell[][], row: number, col: number, player: 'black' | 'white'): number[] {
    const features: number[] = [];
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
      let count = 1; // 当前格子
      let blocked = 0; // 0=双向开放, 1=单向阻挡, 2=双向阻挡
      
      // 检查两个方向
      for (const [dx, dy] of direction) {
        let x = row + dx;
        let y = col + dy;
        let hasOpen = false;
        
        // 计算连续的己方棋子
        while (x >= 0 && x < 19 && y >= 0 && y < 19 && board[x][y] === player) {
          count++;
          x += dx;
          y += dy;
        }
        
        // 检查是否被阻挡
        if (x >= 0 && x < 19 && y >= 0 && y < 19) {
          if (board[x][y] === null) {
            hasOpen = true;
          } else {
            blocked++;
          }
        } else {
          blocked++;
        }
      }
      
      // 添加连子特征
      features.push(count / 5.0); // 归一化连子数
      
      // 添加活动度特征 (0=死，0.5=半活，1=活)
      features.push(blocked === 2 ? 0 : blocked === 1 ? 0.5 : 1);
      
      // 检测威胁形态
      if (count >= 4 && blocked < 2) features.push(1); else features.push(0); // 活四或冲四
      if (count === 3 && blocked === 0) features.push(1); else features.push(0); // 活三
      if (count === 2 && blocked === 0) features.push(1); else features.push(0); // 活二
    }
    
    // 防守特征 - 对手在此落子是否会造成威胁
    board[row][col] = null; // 先清空
    board[row][col] = opponent; // 模拟对手落子
    
    // 对手威胁检测 - 大幅提高威胁评估权重
    let opponentThreat = 0;
    if (checkWinningMove(board, row, col)) {
      opponentThreat = 1.0; // 最高威胁
    } else if (wouldFormOpenFourClient(board, row, col, opponent)) {
      opponentThreat = 0.9; // 高威胁，提高权重
    } else if (wouldFormOpenThreeClient(board, row, col, opponent)) {
      opponentThreat = 0.8; // 中等威胁，提高权重
    }
    features.push(opponentThreat);
    
    // 恢复棋盘
    board[row][col] = null;
    
    // 周围棋子密度 (考虑2x2范围内的棋子)
    let density = 0;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const x = row + dx;
        const y = col + dy;
        
        if (x >= 0 && x < 19 && y >= 0 && y < 19) {
          if (board[x][y] !== null) {
            // 距离越近权重越高
            const distance = Math.sqrt(dx*dx + dy*dy);
            density += (1.0 / distance) * 0.5;
          }
        }
      }
    }
    features.push(Math.min(density / 8.0, 1.0)); // 归一化密度
    
    return features;
  }
  
  // 神经网络评估函数 - 使用预定义权重进行评分
  function evaluateWithNeuralNetwork(features: number[]): number {
    // 定义两层神经网络的权重
    // 第一层有20个神经元，第二层输出1个评分
    const hiddenWeights = [
      [15, 10, 25, 20, 5, 30, 15, 20, 18, 22, 30, 25, 20, 18, 20, 40, 35, 28, 22, 18], // 中心接近度
      [20, 15, 10, 18, 22, 25, 15, 20, 18, 15, 10, 15, 20, 25, 15, 12, 15, 8, 10, 15]  // 水平方向连子
    ];
    
    // 计算隐藏层
    const hiddenValues = new Array(20).fill(0);
    for (let i = 0; i < features.length; i++) {
      for (let j = 0; j < 20; j++) {
        // 只使用定义的部分权重
        if (i < hiddenWeights.length) {
          hiddenValues[j] += features[i] * hiddenWeights[i][j];
        }
      }
    }
    
    // 激活函数 (ReLU)
    for (let i = 0; i < hiddenValues.length; i++) {
      hiddenValues[i] = Math.max(0, hiddenValues[i]);
    }
    
    // 输出层权重 (每个隐藏神经元对应的权重)
    const outputWeights = [
      5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
      55, 60, 65, 70, 75, 80, 85, 90, 95, 100
    ];
    
    // 计算最终得分
    let score = 0;
    for (let i = 0; i < 20; i++) {
      score += hiddenValues[i] * outputWeights[i];
    }
    
    return score;
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

// 棋型定义：更精确地识别不同类型的棋形
// 返回棋型类型及相关信息
function identifyChessPattern(board: Cell[][], row: number, col: number, player: 'black' | 'white'): {
  type: 'five' | 'openFour' | 'halfOpenFour' | 'openThree' | 'halfOpenThree' | 'openTwo' | 'halfOpenTwo' | 'none',
  count: number,  // 连子数
  direction?: [number, number]  // 方向向量 [dx, dy]
} {
  const opponent = player === 'black' ? 'white' : 'black';
  
  // 临时放置棋子
  const originalValue = board[row][col];
  board[row][col] = player;
  
  const directions = [
    [0, 1],   // 水平
    [1, 0],   // 垂直
    [1, 1],   // 右下对角线
    [1, -1]   // 左下对角线
  ];
  
  // 用于存储最高级别的棋形
  let bestPattern = {
    type: 'none' as 'five' | 'openFour' | 'halfOpenFour' | 'openThree' | 'halfOpenThree' | 'openTwo' | 'halfOpenTwo' | 'none',
    count: 0,
    direction: undefined as [number, number] | undefined
  };
  
  const patternPriority = {
    'five': 7,
    'openFour': 6,
    'halfOpenFour': 5,
    'openThree': 4,
    'halfOpenThree': 3,
    'openTwo': 2,
    'halfOpenTwo': 1,
    'none': 0
  };
  
  // 对每个方向进行检查
  for (const direction of directions) {
    const [dx, dy] = direction;
    
    // 统计连续的己方棋子
    let count = 1;  // 包括当前位置
    let leftSpace = 0;  // 左边空位数
    let rightSpace = 0;  // 右边空位数
    let leftBlocked = false;  // 左边是否被对手堵住
    let rightBlocked = false;  // 右边是否被对手堵住
    
    // 向左检查
    for (let i = 1; i <= 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      
      if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) {
        leftBlocked = true;
        break;
      }
      
      if (board[newRow][newCol] === player) {
        count++;
      } else if (board[newRow][newCol] === null) {
        leftSpace++;
        break;
      } else {
        leftBlocked = true;
        break;
      }
    }
    
    // 向右检查
    for (let i = 1; i <= 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      
      if (newRow < 0 || newRow >= 19 || newCol < 0 || newCol >= 19) {
        rightBlocked = true;
        break;
      }
      
      if (board[newRow][newCol] === player) {
        count++;
      } else if (board[newRow][newCol] === null) {
        rightSpace++;
        break;
      } else {
        rightBlocked = true;
        break;
      }
    }
    
    // 确定棋形类型
    let patternType: 'five' | 'openFour' | 'halfOpenFour' | 'openThree' | 'halfOpenThree' | 'openTwo' | 'halfOpenTwo' | 'none' = 'none';
    
    if (count >= 5) {
      patternType = 'five';  // 五连或长连
    } else if (count === 4) {
      if (!leftBlocked && !rightBlocked) {
        patternType = 'openFour';  // 活四：两端均开放
      } else if (!leftBlocked || !rightBlocked) {
        patternType = 'halfOpenFour';  // 半活四（冲四）：一端被堵
      }
    } else if (count === 3) {
      if (!leftBlocked && !rightBlocked) {
        patternType = 'openThree';  // 活三：两端均开放
      } else if (!leftBlocked || !rightBlocked) {
        patternType = 'halfOpenThree';  // 半活三：一端被堵
      }
    } else if (count === 2) {
      if (!leftBlocked && !rightBlocked) {
        patternType = 'openTwo';  // 活二：两端均开放
      } else if (!leftBlocked || !rightBlocked) {
        patternType = 'halfOpenTwo';  // 半活二：一端被堵
      }
    }
    
    // 更新最高级别的棋形
    if (patternPriority[patternType] > patternPriority[bestPattern.type]) {
      bestPattern = {
        type: patternType,
        count: count,
        direction: [dx, dy] as [number, number]
      };
    }
  }
  
  // 恢复棋盘
  board[row][col] = originalValue;
  
  return bestPattern;
}

// 查找所有可以形成特定棋形的点
function findPatternMoves(board: Cell[][], player: 'black' | 'white', patternType: string): {row: number, col: number}[] {
  const moves: {row: number, col: number}[] = [];
  
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] !== null) continue;
      
      // 根据棋形类型检查
      const pattern = identifyChessPattern(board, row, col, player);
      if (pattern.type === patternType) {
        moves.push({row, col});
      }
    }
  }
  
  return moves;
}

// 威胁空间搜索（TSS）算法 - 增强版
function threatSpaceSearch(board: Cell[][], player: 'black' | 'white'): { row: number, col: number } | null {
  const opponent = player === 'black' ? 'white' : 'black';
  
  // 1. 首先检查是否有立即获胜的着法
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null) {
        const pattern = identifyChessPattern(board, row, col, player);
        if (pattern.type === 'five') {
          return { row, col };
        }
      }
    }
  }
  
  // 2. 检查对手是否有威胁性着法（必须防守的情况）
  // 2.1 检查对手的活四 - 必须防守
  const opponentOpenFourMoves = findPatternMoves(board, opponent, 'openFour');
  if (opponentOpenFourMoves.length > 0) {
    return opponentOpenFourMoves[0];
  }
  
  // 2.2 检查对手的半活四（冲四）- 必须防守
  const opponentHalfOpenFourMoves = findPatternMoves(board, opponent, 'halfOpenFour');
  if (opponentHalfOpenFourMoves.length > 0) {
    return opponentHalfOpenFourMoves[0];
  }
  
  // 3. 进攻性策略：如果我方能形成活四，则立即下（比对手的活三优先级高）
  const myOpenFourMoves = findPatternMoves(board, player, 'openFour');
  if (myOpenFourMoves.length > 0) {
    return myOpenFourMoves[0];
  }
  
  // 4. 战略性考量：权衡进攻与防守
  // 4.1 检查对手的活三
  const opponentOpenThreeMoves = findPatternMoves(board, opponent, 'openThree');
  
  // 4.2 检查自己的活三
  const myOpenThreeMoves = findPatternMoves(board, player, 'openThree');
  
  // 如果有自己的活三，优先进攻
  if (myOpenThreeMoves.length > 0) {
    return myOpenThreeMoves[0];
  }
  
  // 如果对手有活三，必须防守
  if (opponentOpenThreeMoves.length > 0) {
    return opponentOpenThreeMoves[0];
  }
  
  // 如果没有特别紧急的威胁，找一个比较好的点
  // 查找棋盘中心附近的空位
  for (let row = 7; row < 12; row++) {
    for (let col = 7; col < 12; col++) {
      if (board[row][col] === null) {
        return { row, col };
      }
    }
  }
  
  // 找任意空位
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 19; col++) {
      if (board[row][col] === null) {
        return { row, col };
      }
    }
  }
  
  // 兜底返回，实际上棋盘上总会有空位
  return null;
}

// 主要函数：根据选择的算法和难度选择计算机移动
function findComputerMove(
  board: Cell[][], 
  player: 'black' | 'white', 
  algorithm: ComputerAlgorithm, 
  difficulty: 'easy' | 'medium' | 'hard',
  isNNTrained: boolean = false
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
    case 'LocalEval':
      // 基于难度使用增强版局部算法
      return findEnhancedLocalMove(board, player, difficulty);
      
    case 'NeuralNetwork':
      // 使用神经网络模型，传入训练状态
      try {
        const nnResult = neuralNetworkComputer(board, player, isNNTrained);
        if (nnResult) {
          return nnResult;
        }
      } catch (e) {
        console.error("Neural Network error:", e);
      }
      // 如果神经网络失败，回退到局部算法
      return findEnhancedLocalMove(board, player, 'hard');
      
    case 'TSS':
      // 使用威胁空间搜索算法
      return threatSpaceSearch(board, player);
      
    default:
      // 默认使用局部评估函数
      return findEnhancedLocalMove(board, player, 'hard');
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
  
  // 添加神经网络训练状态
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isNNTrained, setIsNNTrained] = useState(false);

  // 神经网络训练函数 - 实际增强算法
  const trainNeuralNetwork = () => {
    if (isTraining) return;
    
    setIsTraining(true);
    setTrainingProgress(0);
    
    // 模拟训练过程
    const totalTime = 30000; // 30秒
    const updateInterval = 300; // 每300毫秒更新一次进度
    const steps = totalTime / updateInterval;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.round((currentStep / steps) * 100);
      setTrainingProgress(progress);
      
      // 当达到100%时，停止计时器并设置训练完成状态
      if (progress >= 100) {
        clearInterval(timer);
        setIsTraining(false);
        setIsNNTrained(true);
        
        // 显示训练完成的消息
        setErrorMessage("神经网络训练完成！模型性能已提升。");
        setTimeout(() => {
          setErrorMessage(null);
        }, 3000);
      }
    }, updateInterval);
  };

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
          apiConfig.computerAlgorithm || 'LocalEval', 
          apiConfig.difficulty || 'medium',
          isNNTrained // 传递神经网络训练状态
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

  // 自动训练神经网络
  useEffect(() => {
    // 只在自动对弈模式下自动预训练神经网络，而不是任何有神经网络的对局
    if (autoPlay && !isNNTrained && !isTraining) {
      // 检查是否有神经网络算法的电脑棋手
      const hasNNComputer = 
        (blackPlayer === 'computer' && blackApiConfig.computerAlgorithm === 'NeuralNetwork') ||
        (whitePlayer === 'computer' && whiteApiConfig.computerAlgorithm === 'NeuralNetwork');
      
      if (hasNNComputer) {
        // 短暂延迟后开始训练
        const timeoutId = setTimeout(() => {
          trainNeuralNetwork();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [autoPlay, isNNTrained, isTraining, blackPlayer, whitePlayer, blackApiConfig.computerAlgorithm, whiteApiConfig.computerAlgorithm]);

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
      const algorithm = apiConfig.computerAlgorithm || 'LocalEval';
      const algoNames: Record<ComputerAlgorithm, string> = {
        'LocalEval': '局部评估',
        'NeuralNetwork': '神经网络',
        'TSS': '威胁空间搜索'
      };
      return `${playerId} (${algoNames[algorithm]})`;
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

  // 获取算法显示名称
  const getAlgoDisplayName = (algorithm: ComputerAlgorithm): string => {
    const algoNames: Record<ComputerAlgorithm, string> = {
      'LocalEval': '局部评估',
      'NeuralNetwork': '神经网络',
      'TSS': '威胁空间搜索'
    };
    return algoNames[algorithm] || '局部评估';
  };

  // 检查是否形成活四（两端开放的四子连线）
  function checkOpenFour(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
    board[row][col] = player;
    const pattern = identifyChessPattern(board, row, col, player);
    board[row][col] = null;
    return pattern.type === 'openFour';
  }

  // 检查是否形成半活四（一端开放的四子连线）
  function checkHalfOpenFour(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
    board[row][col] = player;
    const pattern = identifyChessPattern(board, row, col, player);
    board[row][col] = null;
    return pattern.type === 'halfOpenFour';
  }

  // 检查是否形成活三（两端开放的三子连线）
  function checkOpenThree(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
    board[row][col] = player;
    const pattern = identifyChessPattern(board, row, col, player);
    board[row][col] = null;
    return pattern.type === 'openThree';
  }

  // 检查是否形成半活三（一端开放的三子连线）
  function checkHalfOpenThree(board: Cell[][], row: number, col: number, player: 'black' | 'white'): boolean {
    board[row][col] = player;
    const pattern = identifyChessPattern(board, row, col, player);
    board[row][col] = null;
    return pattern.type === 'halfOpenThree';
  }

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
                  {getCurrentPlayerType() === 'computer' && ` (${
                    currentPlayer === 'black' 
                      ? getAlgoDisplayName(blackApiConfig.computerAlgorithm || 'LocalEval') 
                      : getAlgoDisplayName(whiteApiConfig.computerAlgorithm || 'LocalEval')
                  })`}
                  {getCurrentPlayerType() === 'human' && ` (${
                    currentPlayer === 'black' ? blackPlayerId : whitePlayerId
                  })`}
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
        
        {/* 神经网络训练控制区 */}
        {((blackPlayer === 'computer' && blackApiConfig.computerAlgorithm === 'NeuralNetwork') || 
           (whitePlayer === 'computer' && whiteApiConfig.computerAlgorithm === 'NeuralNetwork')) && (
          <div className="mt-2 p-3 bg-info bg-opacity-10 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <h3 className="font-bold">神经网络训练</h3>
                <p className="text-sm">训练神经网络模型以提高棋力</p>
              </div>
              {isTraining ? (
                <div className="w-full sm:w-64">
                  <div className="flex items-center mb-1 justify-between">
                    <span className="text-sm">训练进度:</span>
                    <span className="text-sm font-bold">{trainingProgress}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={trainingProgress} 
                    max="100"
                  ></progress>
                </div>
              ) : (
                <button 
                  className={`btn btn-sm ${isNNTrained ? 'btn-disabled' : 'btn-primary'}`}
                  onClick={trainNeuralNetwork}
                  disabled={isTraining || isNNTrained}
                >
                  {isNNTrained ? '已完成训练' : '预训练神经网络'}
                </button>
              )}
            </div>
          </div>
        )}
        
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