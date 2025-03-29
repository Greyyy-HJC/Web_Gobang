'use client';

import { useState, useEffect, useCallback } from 'react';

type Cell = 'black' | 'white' | null;
type PlayerType = 'human' | 'ai' | 'computer';

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
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
  onReturnToSettings 
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
  const getCurrentPlayerConfig = () => {
    return currentPlayer === 'black' ? blackApiConfig : whiteApiConfig;
  };

  // 获取当前玩家的类型（人类或AI）
  const getCurrentPlayerType = () => {
    return currentPlayer === 'black' ? blackPlayer : whitePlayer;
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

  // 使用 AI 进行移动
  const makeAIMove = useCallback(async () => {
    if (isGameOver || isThinking) return;

    setIsThinking(true);
    try {
      const playerConfig = getCurrentPlayerConfig();
      const playerType = getCurrentPlayerType();
      
      // 验证API配置
      if (playerType === 'ai' && (!playerConfig.apiKey || playerConfig.apiKey.trim() === '')) {
        setErrorMessage("API密钥不能为空。将使用本地AI算法继续游戏。");
        // 使用本地AI逻辑替代
        await new Promise(resolve => setTimeout(resolve, 800));
        const move = findBestMoveClient(board, currentPlayer);
        if (move) {
          const gameEnded = addMove(move.row, move.col, currentPlayer);
          if (!gameEnded) {
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        }
        setIsThinking(false);
        return;
      }
      
      // 判断是否使用本地AI逻辑的情况：
      // 1. 是电脑棋手 (computer)
      // 2. 在GitHub Pages上（hostname包含github.io）
      // 3. 当前URL包含/Web_Gobang（说明在basePath配置的环境中）
      // 4. 使用file:///协议访问（本地静态文件）
      // 5. 生产环境
      const isStaticEnv = typeof window !== 'undefined' && (
        window.location.hostname.includes('github.io') ||
        window.location.pathname.includes('/Web_Gobang') ||
        window.location.protocol === 'file:' ||
        process.env.NODE_ENV === 'production'
      );
      
      if (playerType === 'computer' || isStaticEnv) {
        // 使用本地AI逻辑
        console.log("使用本地AI逻辑");
        // 等待一下以模拟思考时间
        await new Promise(resolve => setTimeout(resolve, 800));
        const move = findBestMoveClient(board, currentPlayer);
        if (move) {
          const gameEnded = addMove(move.row, move.col, currentPlayer);
          
          if (!gameEnded) {
            // 切换到下一个玩家
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        }
      } else {
        // 在开发环境中使用API
        console.log("使用API路由");
        const response = await fetch('/api/gobang/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            board,
            apiKey: playerConfig.apiKey,
            baseUrl: playerConfig.baseUrl,
            model: playerConfig.model,
            currentPlayer,
            promptType: currentPlayer === 'black' ? blackPromptType : whitePromptType,
            customPrompt: currentPlayer === 'black' ? blackCustomPrompt : whiteCustomPrompt
          }),
        });

        const data = await response.json();
        
        if (data.error) {
          console.error('AI API返回错误:', data.error);
          setErrorMessage(`AI API返回错误: ${data.error}。将使用本地AI算法继续游戏。`);
          // 使用本地AI逻辑作为备选
          const move = findBestMoveClient(board, currentPlayer);
          if (move) {
            const gameEnded = addMove(move.row, move.col, currentPlayer);
            if (!gameEnded) {
              setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
            }
          }
          return;
        }
        
        if (data.row !== undefined && data.col !== undefined) {
          const gameEnded = addMove(data.row, data.col, currentPlayer);
          
          if (!gameEnded) {
            // 切换到下一个玩家
            setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
          }
        } else {
          setErrorMessage(`AI返回了无效的移动。将使用本地AI算法继续游戏。`);
          // 使用本地AI逻辑作为备选
          const move = findBestMoveClient(board, currentPlayer);
          if (move) {
            const gameEnded = addMove(move.row, move.col, currentPlayer);
            if (!gameEnded) {
              setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
            }
          }
        }
      }
    } catch (error) {
      console.error('AI 移动出错:', error);
      // 错误时尝试使用本地逻辑
      console.log("出错，降级到本地AI逻辑");
      setErrorMessage(`API请求出错: ${error instanceof Error ? error.message : '未知错误'}。将使用本地AI算法继续游戏。`);
      const move = findBestMoveClient(board, currentPlayer);
      if (move) {
        const gameEnded = addMove(move.row, move.col, currentPlayer);
        
        if (!gameEnded) {
          // 切换到下一个玩家
          setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
        }
      }
    } finally {
      setIsThinking(false);
    }
  }, [board, currentPlayer, isGameOver, isThinking]);

  // 处理人类玩家移动
  const handleHumanMove = (row: number, col: number) => {
    if (isGameOver || board[row][col] !== null || isThinking) return;
    
    // 检查当前玩家是否是人类
    if (getCurrentPlayerType() !== 'human') return;
    
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
      return `电脑棋手`;
    }
    return playerId;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* 错误消息显示 - 移到顶部 */}
      <div className={`transition-all duration-300 overflow-hidden mb-2 ${errorMessage ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'}`} style={{ width: '570px' }}>
        <div className="alert alert-warning shadow-lg flex justify-between">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6 mt-1" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="ml-2 overflow-y-auto" style={{ maxHeight: '3rem' }}>
              AI API返回错误，由本地电脑玩家落子
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