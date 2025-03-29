'use client';

import { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';

type PlayerType = 'human' | 'ai' | 'computer';
type GameModeSetting = {
  black: PlayerType;
  white: PlayerType;
};

type Provider = 'OpenAI' | 'Anthropic' | 'Deepseek' | 'Qwen' | 'Gemini' | 'Custom';

interface ProviderConfig {
  name: Provider;
  baseUrl: string;
  models: string[];
}

export default function Home() {
  // 检测是否在静态环境中
  const [isStaticEnv, setIsStaticEnv] = useState(false);
  
  // 初始化时检测环境
  useEffect(() => {
    const staticEnv = typeof window !== 'undefined' && (
      window.location.hostname.includes('github.io') ||
      window.location.pathname.includes('/Web_Gobang') ||
      window.location.protocol === 'file:' ||
      process.env.NODE_ENV === 'production'
    );
    setIsStaticEnv(staticEnv);
  }, []);

  // API提供商配置
  const [providers] = useState<ProviderConfig[]>([
    {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    {
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
    },
    {
      name: 'Deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-coder']
    },
    {
      name: 'Qwen',
      baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
      models: ['qwen-max', 'qwen-plus', 'qwen-turbo']
    },
    {
      name: 'Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: ['gemini-pro', 'gemini-1.5-pro']
    },
    {
      name: 'Custom',
      baseUrl: '',
      models: ['custom-model']
    }
  ]);

  // 玩家ID设置
  const [blackPlayerId, setBlackPlayerId] = useState('黑方玩家');
  const [whitePlayerId, setWhitePlayerId] = useState('白方玩家');
  
  // API配置
  const [blackApiKey, setBlackApiKey] = useState('');
  const [whiteApiKey, setWhiteApiKey] = useState('');
  const [blackProvider, setBlackProvider] = useState<Provider>('OpenAI');
  const [whiteProvider, setWhiteProvider] = useState<Provider>('OpenAI');
  const [blackCustomBaseUrl, setBlackCustomBaseUrl] = useState('');
  const [whiteCustomBaseUrl, setWhiteCustomBaseUrl] = useState('');
  const [blackModel, setBlackModel] = useState('gpt-4o');
  const [whiteModel, setWhiteModel] = useState('gpt-4o');
  
  // 游戏模式设置
  const [gameModeSetting, setGameModeSetting] = useState<GameModeSetting>({ 
    black: 'human', 
    white: 'ai' 
  });
  const [gameStarted, setGameStarted] = useState(false);

  // 用于控制AI vs AI模式下的手动落子
  const [autoPlay, setAutoPlay] = useState(false);
  
  // 根据选择的提供商获取配置
  const getProviderConfig = (provider: Provider): ProviderConfig => {
    return providers.find(p => p.name === provider) || providers[0];
  };

  // 获取实际的基础URL
  const getBaseUrl = (provider: Provider, customUrl: string): string => {
    if (provider === 'Custom') {
      return customUrl;
    }
    return getProviderConfig(provider).baseUrl;
  };

  // 获取提供商的可用模型
  const getModelsForProvider = (provider: Provider, customUrl: string): string[] => {
    return getProviderConfig(provider).models;
  };

  // 当提供商变化时更新模型
  useEffect(() => {
    const models = getModelsForProvider(blackProvider, blackCustomBaseUrl);
    if (!models.includes(blackModel)) {
      setBlackModel(models[0]);
    }
  }, [blackProvider, blackModel, blackCustomBaseUrl]);

  useEffect(() => {
    const models = getModelsForProvider(whiteProvider, whiteCustomBaseUrl);
    if (!models.includes(whiteModel)) {
      setWhiteModel(models[0]);
    }
  }, [whiteProvider, whiteModel, whiteCustomBaseUrl]);
  
  const isAIvsAI = gameModeSetting.black === 'ai' && gameModeSetting.white === 'ai';
  const isHumanVsHuman = gameModeSetting.black === 'human' && gameModeSetting.white === 'human';

  const handleStartGame = () => {
    // 只在非静态环境下验证API设置
    if (!isStaticEnv) {
      // 验证输入
      if (gameModeSetting.black === 'ai' && !blackApiKey) {
        // 不直接阻止游戏启动，在API调用时会显示错误
        console.warn('警告：黑方AI缺少API密钥，可能导致API调用失败');
      }
      if (gameModeSetting.white === 'ai' && !whiteApiKey) {
        console.warn('警告：白方AI缺少API密钥，可能导致API调用失败');
      }
      
      if (blackProvider === 'Custom' && !blackCustomBaseUrl) {
        console.warn('警告：黑方AI缺少自定义API基础URL，可能导致API调用失败');
      }
      
      if (whiteProvider === 'Custom' && !whiteCustomBaseUrl) {
        console.warn('警告：白方AI缺少自定义API基础URL，可能导致API调用失败');
      }
    }
    
    setGameStarted(true);
  };

  // 渲染玩家设置
  const renderPlayerSettings = (side: 'black' | 'white') => {
    const isBlack = side === 'black';
    const playerType = isBlack ? gameModeSetting.black : gameModeSetting.white;
    const provider = isBlack ? blackProvider : whiteProvider;
    const setProvider = isBlack ? setBlackProvider : setWhiteProvider;
    const customBaseUrl = isBlack ? blackCustomBaseUrl : whiteCustomBaseUrl;
    const setCustomBaseUrl = isBlack ? setBlackCustomBaseUrl : setWhiteCustomBaseUrl;
    const apiKey = isBlack ? blackApiKey : whiteApiKey;
    const setApiKey = isBlack ? setBlackApiKey : setWhiteApiKey;
    const model = isBlack ? blackModel : whiteModel;
    const setModel = isBlack ? setBlackModel : setWhiteModel;
    const playerId = isBlack ? blackPlayerId : whitePlayerId;
    const setPlayerId = isBlack ? setBlackPlayerId : setWhitePlayerId;
    
    return (
      <div className="col-span-2 md:col-span-1 p-4 border rounded-lg bg-base-200">
        <h3 className="font-bold mb-3 flex items-center">
          <span className={`inline-block w-4 h-4 rounded-full ${isBlack ? 'bg-black' : 'bg-white border border-gray-300'} mr-2`}></span>
          {isBlack ? '黑方设置' : '白方设置'}
        </h3>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">玩家类型</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={playerType}
            onChange={(e) => setGameModeSetting({
              ...gameModeSetting,
              [side]: e.target.value as PlayerType
            })}
          >
            <option value="human">人类棋手</option>
            {!isStaticEnv && <option value="ai">AI棋手</option>}
            {isStaticEnv && <option value="ai" disabled title="静态部署环境不支持AI棋手">AI棋手 (仅本地开发可用)</option>}
            <option value="computer">电脑棋手</option>
          </select>
          {isStaticEnv && playerType === 'ai' && (
            <div className="text-sm text-warning mt-1">
              注意：在静态部署环境下，AI棋手将使用本地AI算法，不会调用外部API
            </div>
          )}
        </div>
        
        {playerType === 'human' ? (
          <div className="form-control mt-3">
            <label className="label">
              <span className="label-text font-medium">棋手ID</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="输入棋手ID"
            />
          </div>
        ) : playerType === 'computer' ? (
          <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-md">
            <p className="text-sm">电脑棋手使用本地AI算法，无需额外设置。</p>
          </div>
        ) : (
          <>
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text font-medium">选择AI提供商</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                disabled={isStaticEnv}
              >
                {providers.map(p => (
                  <option key={`${side}-${p.name}`} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {provider === 'Custom' && (
              <div className="form-control mt-3">
                <label className="label">
                  <span className="label-text font-medium">自定义API基础URL</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="例如：https://api.example.com/v1"
                  disabled={isStaticEnv}
                />
              </div>
            )}
            
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text font-medium">API密钥</span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入API密钥"
                disabled={isStaticEnv}
              />
            </div>
            
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text font-medium">选择模型</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isStaticEnv}
              >
                {getModelsForProvider(provider, customBaseUrl).map(m => (
                  <option key={`${side}-${m}`} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-300">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          <h1 className="text-5xl font-bold text-center mb-4 text-primary">Web Gobang</h1>
          <p className="text-xl text-center mb-8 max-w-2xl">
            经典五子棋游戏，支持人人对战、人机对战和AI互相对战
          </p>
        </div>
        
        {!gameStarted ? (
          <div className="max-w-2xl mx-auto bg-base-100 p-8 rounded-xl shadow-xl border border-base-300">
            <h2 className="text-2xl font-bold mb-6 text-center">游戏设置</h2>
            
            {/* 玩家设置部分 */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {renderPlayerSettings('black')}
              {renderPlayerSettings('white')}
            </div>
            
            {/* 自动对弈设置 */}
            {(isAIvsAI || 
              (gameModeSetting.black === 'computer' && gameModeSetting.white === 'computer') ||
              (gameModeSetting.black === 'ai' && gameModeSetting.white === 'computer') ||
              (gameModeSetting.black === 'computer' && gameModeSetting.white === 'ai')) && (
              <div className="form-control my-4 p-4 bg-info bg-opacity-10 rounded-lg">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary mr-3" 
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                  />
                  <span>自动对弈模式（自动对战，无需手动控制）</span>
                </div>
              </div>
            )}
            
            {isHumanVsHuman && (
              <div className="form-control my-4 p-4 bg-warning bg-opacity-10 rounded-lg">
                <div className="flex items-center">
                  <span className="text-warning-content">人人对战模式下，黑白两方玩家将轮流在同一设备上落子。</span>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary w-full mt-6 text-lg"
              onClick={handleStartGame}
            >
              开始游戏
            </button>
            
            <div className="mt-8 p-4 bg-base-200 rounded-lg">
              <h3 className="font-bold mb-2">游戏规则</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>棋盘大小为19×19，与围棋棋盘相同</li>
                <li>黑方先行，双方轮流在棋盘交叉点落子</li>
                <li>任意一方在横、竖或斜线上形成连续五子，即为胜利</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <GameBoard
              blackPlayer={gameModeSetting.black}
              whitePlayer={gameModeSetting.white}
              blackApiConfig={{
                apiKey: blackApiKey,
                baseUrl: getBaseUrl(blackProvider, blackCustomBaseUrl),
                model: blackModel
              }}
              whiteApiConfig={{
                apiKey: whiteApiKey,
                baseUrl: getBaseUrl(whiteProvider, whiteCustomBaseUrl),
                model: whiteModel
              }}
              blackPlayerId={blackPlayerId}
              whitePlayerId={whitePlayerId}
              autoPlay={autoPlay}
              onReturnToSettings={() => setGameStarted(false)}
            />
          </div>
        )}
      </div>
      
      <footer className="py-6 text-center text-sm text-gray-500 mt-12">
        <p>© 2024 Web Gobang | 五子棋在线游戏</p>
      </footer>
    </div>
  );
} 