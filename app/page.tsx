'use client';

import { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';

type PlayerType = 'human' | 'ai' | 'computer';
type GameModeSetting = {
  black: PlayerType;
  white: PlayerType;
};

type Provider = 'OpenAI' | 'Anthropic' | 'Deepseek' | 'Qwen' | 'Gemini' | 'Custom';
type ComputerAlgorithm = 'LocalEval' | 'NeuralNetwork' | 'TSS';
type Difficulty = 'easy' | 'medium' | 'hard';

interface ProviderConfig {
  name: Provider;
  baseUrl: string;
  models: string[];
}

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  isAI: boolean;
  provider: Provider;
  computerAlgorithm?: ComputerAlgorithm;
  difficulty?: Difficulty;
}

export default function Home() {
  // 电脑棋手算法选项
  const [computerAlgorithms] = useState<{name: ComputerAlgorithm, description: string}[]>([
    { 
      name: 'LocalEval', 
      description: '局部评估算法'
    },
    { 
      name: 'NeuralNetwork', 
      description: '神经网络算法'
    },
    { 
      name: 'TSS', 
      description: '威胁空间搜索算法'
    }
  ]);
  
  const [blackComputerAlgorithm, setBlackComputerAlgorithm] = useState<ComputerAlgorithm>('LocalEval');
  const [whiteComputerAlgorithm, setWhiteComputerAlgorithm] = useState<ComputerAlgorithm>('LocalEval');
  
  const [blackDifficulty, setBlackDifficulty] = useState<Difficulty>('hard');
  const [whiteDifficulty, setWhiteDifficulty] = useState<Difficulty>('hard');

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
  const [blackApiConfig, setBlackApiConfig] = useState<ApiConfig>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    isAI: false,
    provider: 'OpenAI',
    computerAlgorithm: 'LocalEval',
    difficulty: 'hard'
  });
  const [whiteApiConfig, setWhiteApiConfig] = useState<ApiConfig>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    isAI: false,
    provider: 'OpenAI',
    computerAlgorithm: 'LocalEval',
    difficulty: 'hard'
  });
  const [blackProvider, setBlackProvider] = useState<Provider>('OpenAI');
  const [whiteProvider, setWhiteProvider] = useState<Provider>('OpenAI');
  const [blackCustomBaseUrl, setBlackCustomBaseUrl] = useState('');
  const [whiteCustomBaseUrl, setWhiteCustomBaseUrl] = useState('');
  const [blackModel, setBlackModel] = useState('gpt-4o');
  const [whiteModel, setWhiteModel] = useState('gpt-4o');
  
  // 自定义指令设置
  const [blackPromptType, setBlackPromptType] = useState<'default' | 'custom'>('default');
  const [whitePromptType, setWhitePromptType] = useState<'default' | 'custom'>('default');
  const defaultCustomPrompt = `落子策略优先级:
1. 获胜优先：检查是否有任何位置可以形成连续5子获胜，如有则立即选择。
2. 防守反击：阻止对手连成5子，同时寻找反击机会。
3. 双向威胁：优先形成同时有多个威胁的局面，如双三、双四等。
4. 中心控制：优先在棋盘中心区域布局，扩大控制范围。
5. 连续进攻：形成连续的威胁，迫使对手被动防守。
6. 灵活应变：根据棋局发展灵活调整攻防策略。
7. 边缘防御：避免在棋盘边缘无效布局，除非有特殊战术需要。`;
  const [blackCustomPrompt, setBlackCustomPrompt] = useState(defaultCustomPrompt);
  const [whiteCustomPrompt, setWhiteCustomPrompt] = useState(defaultCustomPrompt);
  
  // 游戏模式设置
  const [gameModeSetting, setGameModeSetting] = useState<GameModeSetting>({ 
    black: 'human', 
    white: 'ai' 
  });
  const [gameStarted, setGameStarted] = useState(false);

  // 用于控制AI vs AI模式下的手动落子
  const [autoPlay, setAutoPlay] = useState(false);
  
  // 添加禁手设置
  const [forbiddenRules, setForbiddenRules] = useState({
    overline: false, // 长连禁手（五子以上）
    doubleFour: false, // 双四禁手
    doubleThree: false, // 双三禁手
  });

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
      if (gameModeSetting.black === 'ai' && !blackApiConfig.apiKey) {
        // 不直接阻止游戏启动，在API调用时会显示错误
        console.warn('警告：黑方AI缺少API密钥，可能导致API调用失败');
      }
      if (gameModeSetting.white === 'ai' && !whiteApiConfig.apiKey) {
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
    const apiConfig = isBlack ? blackApiConfig : whiteApiConfig;
    const setApiConfig = isBlack ? setBlackApiConfig : setWhiteApiConfig;
    const model = isBlack ? blackModel : whiteModel;
    const setModel = isBlack ? setBlackModel : setWhiteModel;
    const playerId = isBlack ? blackPlayerId : whitePlayerId;
    const setPlayerId = isBlack ? setBlackPlayerId : setWhitePlayerId;
    const computerAlgorithm = isBlack ? blackComputerAlgorithm : whiteComputerAlgorithm;
    const setComputerAlgorithm = isBlack ? setBlackComputerAlgorithm : setWhiteComputerAlgorithm;
    const difficulty = isBlack ? blackDifficulty : whiteDifficulty;
    const setDifficulty = isBlack ? setBlackDifficulty : setWhiteDifficulty;
    
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
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">算法选择</span>
              </label>
              <select
                className="select select-bordered"
                value={computerAlgorithm}
                onChange={(e) => {
                  const algo = e.target.value as ComputerAlgorithm;
                  setComputerAlgorithm(algo);
                  if (isBlack) {
                    handleBlackApiChange('computerAlgorithm', algo);
                  } else {
                    handleWhiteApiChange('computerAlgorithm', algo);
                  }
                }}
              >
                {computerAlgorithms.map((algo) => (
                  <option key={algo.name} value={algo.name}>
                    {algo.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-md">
              <p className="text-sm">电脑棋手使用本地算法，可在任何环境下运行（包括静态部署）</p>
            </div>
          </>
        ) : (
          <>
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text font-medium">选择AI提供商</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value as Provider);
                }}
                disabled={isStaticEnv}
              >
                <optgroup label="大语言模型">
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="Deepseek">Deepseek</option>
                  <option value="Qwen">Qwen</option>
                  <option value="Gemini">Gemini</option>
                </optgroup>
                <option value="Custom">Custom</option>
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
            
            {/* API密钥输入框，仅对需要API密钥的提供商显示 */}
            {!['AlphaZero', 'Minimax', 'MCTS'].includes(provider) && (
              <div className="form-control mt-3">
                <label className="label">
                  <span className="label-text font-medium">API密钥</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={apiConfig.apiKey}
                  onChange={(e) => {
                    const newApiKey = e.target.value;
                    if (side === 'black') {
                      handleBlackApiChange('apiKey', newApiKey);
                    } else {
                      handleWhiteApiChange('apiKey', newApiKey);
                    }
                  }}
                  placeholder="输入API密钥"
                  disabled={isStaticEnv}
                />
              </div>
            )}
            
            {/* 策略设置，仅对非专用棋类引擎显示 */}
            {!['AlphaZero', 'Minimax', 'MCTS'].includes(provider) && (
              <>
                <div className="form-control mt-3">
                  <label className="label">
                    <span className="label-text font-medium">策略设置</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={side === 'black' ? blackPromptType : whitePromptType}
                    onChange={(e) => {
                      if (side === 'black') {
                        setBlackPromptType(e.target.value as 'default' | 'custom');
                      } else {
                        setWhitePromptType(e.target.value as 'default' | 'custom');
                      }
                    }}
                    disabled={isStaticEnv}
                  >
                    <option value="default">默认策略</option>
                    <option value="custom">自定义策略</option>
                  </select>
                </div>
                
                {((side === 'black' && blackPromptType === 'custom') || 
                  (side === 'white' && whitePromptType === 'custom')) && (
                  <div className="form-control mt-3">
                    <label className="label">
                      <span className="label-text font-medium">自定义AI策略</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={5}
                      value={side === 'black' ? blackCustomPrompt : whiteCustomPrompt}
                      onChange={(e) => {
                        if (side === 'black') {
                          setBlackCustomPrompt(e.target.value);
                        } else {
                          setWhiteCustomPrompt(e.target.value);
                        }
                      }}
                      placeholder="请输入自定义的落子策略优先级列表。这将替换默认策略部分，其他提示词保持不变。"
                      disabled={isStaticEnv}
                    />
                    <label className="label">
                      <span className="label-text-alt text-info">提示：只需输入策略内容，无需包含棋盘描述和JSON返回格式说明。系统会自动处理这些部分。</span>
                    </label>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // 修改黑棋API配置处理函数
  const handleBlackApiChange = (
    field: 'apiKey' | 'baseUrl' | 'model' | 'isAI' | 'computerAlgorithm' | 'difficulty',
    value: string | boolean | ComputerAlgorithm | Difficulty
  ) => {
    setBlackApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 修改白棋API配置处理函数
  const handleWhiteApiChange = (
    field: 'apiKey' | 'baseUrl' | 'model' | 'isAI' | 'computerAlgorithm' | 'difficulty',
    value: string | boolean | ComputerAlgorithm | Difficulty
  ) => {
    setWhiteApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 更新处理AI类型选择的函数
  const handleBlackPlayerTypeChange = (type: string) => {
    setGameModeSetting({
      ...gameModeSetting,
      black: type as PlayerType
    });
    
    // 如果选择了AI类型，设置isAI为true
    if (type === 'ai') {
      handleBlackApiChange('isAI', true);
    } else {
      handleBlackApiChange('isAI', false);
    }
  };
  
  const handleWhitePlayerTypeChange = (type: string) => {
    setGameModeSetting({
      ...gameModeSetting,
      white: type as PlayerType
    });
    
    // 如果选择了AI类型，设置isAI为true
    if (type === 'ai') {
      handleWhiteApiChange('isAI', true);
    } else {
      handleWhiteApiChange('isAI', false);
    }
  };

  // 处理禁手设置更改
  const handleForbiddenRuleChange = (rule: keyof typeof forbiddenRules, checked: boolean) => {
    setForbiddenRules(prev => ({
      ...prev,
      [rule]: checked
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-300">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          <h1 className="text-5xl font-bold text-center mb-4 text-primary">Web Gobang</h1>
          <a 
            href="https://github.com/Greyyy-HJC/Web_Gobang"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-primary mb-4 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>在 GitHub 上查看源码</span>
          </a>
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

            <h2 className="text-xl font-bold mt-6 mb-3">禁手规则</h2>
            <div className="flex justify-between items-center my-4">
              <div className="form-control flex-row items-center">
                <span className="font-medium mr-2 tooltip" data-tip="黑棋不能形成连续六子或更多子的连线">长连禁手 (≥6子)</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={forbiddenRules.overline}
                  onChange={(e) => handleForbiddenRuleChange('overline', e.target.checked)}
                />
              </div>
              <div className="form-control flex-row items-center">
                <span className="font-medium mr-2 tooltip" data-tip="黑棋一步棋不能同时形成两个活四">双四禁手</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={forbiddenRules.doubleFour}
                  onChange={(e) => handleForbiddenRuleChange('doubleFour', e.target.checked)}
                />
              </div>
              <div className="form-control flex-row items-center">
                <span className="font-medium mr-2 tooltip" data-tip="黑棋一步棋不能同时形成两个活三">双三禁手</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={forbiddenRules.doubleThree}
                  onChange={(e) => handleForbiddenRuleChange('doubleThree', e.target.checked)}
                />
              </div>
            </div>
            <div className="mt-2 p-3 bg-base-200 rounded-md text-sm">
              <p className="font-medium">注意：</p>
              <p>以上禁手规则仅适用于黑棋。白棋无禁手限制。</p>
              <p>启用禁手规则可以平衡黑棋先行的优势，是标准的五子棋比赛规则。</p>
            </div>

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
                apiKey: blackApiConfig.apiKey,
                baseUrl: blackProvider === 'Custom' ? blackCustomBaseUrl : getProviderConfig(blackProvider).baseUrl,
                model: blackModel,
                isAI: blackApiConfig.isAI,
                provider: blackProvider,
                computerAlgorithm: blackComputerAlgorithm,
                difficulty: blackDifficulty
              }}
              whiteApiConfig={{
                apiKey: whiteApiConfig.apiKey,
                baseUrl: whiteProvider === 'Custom' ? whiteCustomBaseUrl : getProviderConfig(whiteProvider).baseUrl,
                model: whiteModel,
                isAI: whiteApiConfig.isAI,
                provider: whiteProvider,
                computerAlgorithm: whiteComputerAlgorithm,
                difficulty: whiteDifficulty
              }}
              blackPlayerId={blackPlayerId}
              whitePlayerId={whitePlayerId}
              blackPromptType={blackPromptType}
              whitePromptType={whitePromptType}
              blackCustomPrompt={blackCustomPrompt}
              whiteCustomPrompt={whiteCustomPrompt}
              autoPlay={autoPlay}
              forbiddenRules={forbiddenRules}
              onReturnToSettings={() => setGameStarted(false)}
            />
          </div>
        )}
      </div>
      
      <footer className="py-6 text-center text-sm text-gray-500 mt-12">
        <p>© 2024 Web Gobang | 五子棋在线游戏</p>
        <a 
          href="https://github.com/Greyyy-HJC/Web_Gobang"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-primary mt-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span>GitHub</span>
        </a>
      </footer>
    </div>
  );
} 