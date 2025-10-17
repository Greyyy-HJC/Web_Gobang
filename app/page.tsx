'use client';

import { useState, useEffect, useMemo } from 'react';
import GameBoard, { GameBoardCopy } from './components/GameBoard';

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

const iosCardClass = "rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_28px_60px_-30px_rgba(30,41,59,0.45)] backdrop-blur-xl";
const iosSectionCardClass = `${iosCardClass} transition-transform hover:-translate-y-0.5`;
const iosSubtleCardClass = "rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur";
const iosInputClass = "w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40";
const iosSelectClass = `${iosInputClass} appearance-none pr-10`;
const iosTextareaClass = "w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40";
const iosLabelClass = "text-sm font-semibold text-slate-700";
const iosHelperTextClass = "text-xs text-slate-500";
const iosPrimaryButtonClass = "w-full rounded-full bg-[#007AFF] px-6 py-3 text-lg font-semibold text-white shadow-[0_24px_40px_-20px_rgba(0,122,255,0.65)] transition hover:bg-[#0066d6] active:bg-[#0054ad] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/40";

interface IOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

const IOSToggle = ({ checked, onChange, id, disabled }: IOSToggleProps) => (
  <label
    htmlFor={id}
    className={`relative inline-flex h-7 w-12 items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
  >
    <input
      id={id}
      type="checkbox"
      role="switch"
      aria-checked={checked}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
      className="peer sr-only"
    />
    <span className="absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-[#34C759] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0A84FF]" />
    <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition peer-checked:translate-x-5 peer-checked:shadow-[0_4px_12px_rgba(0,0,0,0.18)]" />
  </label>
);

type Language = 'zh' | 'en';

const translations: Record<Language, {
  defaults: {
    blackPlayerId: string;
    whitePlayerId: string;
    customPrompt: string;
  };
  languageToggle: {
    buttonText: string;
    ariaLabel: string;
  };
  hero: {
    title: string;
    subtitle: string;
    githubLabel: string;
  };
  settings: {
    title: string;
    description: string;
    sections: {
      black: string;
      white: string;
    };
    playerTypeLabel: string;
    playerTypes: {
      human: string;
      ai: string;
      aiStaticLimit: string;
      computer: string;
    };
    staticEnvNotice: string;
    playerIdLabel: string;
    playerIdPlaceholder: string;
    algorithmLabel: string;
    difficultyLabel: string;
    difficultyOptions: Record<Difficulty, string>;
    difficultyHelper: string;
    computerInfo: string;
    aiProviderLabel: string;
    providerGroup: string;
    customBaseUrlLabel: string;
    customBaseUrlPlaceholder: string;
    modelLabel: string;
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    strategyLabel: string;
    strategyOptions: {
      default: string;
      custom: string;
    };
    customStrategyLabel: string;
    customStrategyPlaceholder: string;
    customStrategyHelper: string;
  };
  computerAlgorithms: Record<ComputerAlgorithm, {
    option: string;
    description: string;
  }>;
  autoPlay: {
    title: string;
    helper: string;
    on: string;
    off: string;
  };
  humanVsHumanNotice: string;
  forbidden: {
    title: string;
    optional: string;
    overlineTitle: string;
    overlineDescription: string;
    doubleFourTitle: string;
    doubleFourDescription: string;
    doubleThreeTitle: string;
    doubleThreeDescription: string;
    tipTitle: string;
    tipDescription: string;
  };
  startGame: string;
  quickRulesTitle: string;
  quickRules: string[];
  footer: {
    copyright: string;
    github: string;
  };
  consoleWarnings: {
    missingBlackKey: string;
    missingWhiteKey: string;
    missingBlackCustomUrl: string;
    missingWhiteCustomUrl: string;
  };
  gameBoard: GameBoardCopy;
}> = {
  zh: {
    defaults: {
      blackPlayerId: '黑方玩家',
      whitePlayerId: '白方玩家',
      customPrompt: `落子策略优先级:
1. 获胜优先：检查是否有任何位置可以形成连续5子获胜，如有则立即选择。
2. 防守反击：阻止对手连成5子，同时寻找反击机会。
3. 双向威胁：优先形成同时有多个威胁的局面，如双三、双四等。
4. 中心控制：优先在棋盘中心区域布局，扩大控制范围。
5. 连续进攻：形成连续的威胁，迫使对手被动防守。
6. 灵活应变：根据棋局发展灵活调整攻防策略。
7. 边缘防御：避免在棋盘边缘无效布局，除非有特殊战术需要。`,
    },
    languageToggle: {
      buttonText: 'English',
      ariaLabel: '切换到英文',
    },
    hero: {
      title: 'Web Gobang',
      subtitle: '经典五子棋的现代演绎，支持人人对战、人机对战与 AI 策略对弈。',
      githubLabel: '在 GitHub 上查看源码',
    },
    settings: {
      title: '游戏设置',
      description: '自定义双方角色、AI 模型与禁手规则，打造理想的对局体验。',
      sections: {
        black: '黑方设置',
        white: '白方设置',
      },
      playerTypeLabel: '玩家类型',
      playerTypes: {
        human: '人类棋手',
        ai: 'AI棋手',
        aiStaticLimit: '（静态环境受限）',
        computer: '电脑棋手',
      },
      staticEnvNotice: '静态部署下无法调用外部API，AI棋手会自动切换为本地算法。',
      playerIdLabel: '棋手ID',
      playerIdPlaceholder: '输入棋手ID',
      algorithmLabel: '算法选择',
      difficultyLabel: '难度',
      difficultyOptions: {
        easy: '轻松',
        medium: '均衡',
        hard: '专家',
      },
      difficultyHelper: '调整电脑棋手的思考深度与防守强度。',
      computerInfo: '电脑棋手使用本地算法，可在任何环境下运行（包括静态部署）。',
      aiProviderLabel: '选择AI提供商',
      providerGroup: '大语言模型',
      customBaseUrlLabel: '自定义API基础URL',
      customBaseUrlPlaceholder: '例如：https://api.example.com/v1',
      modelLabel: '选择模型',
      apiKeyLabel: 'API密钥',
      apiKeyPlaceholder: '输入API密钥',
      strategyLabel: '策略设置',
      strategyOptions: {
        default: '默认策略',
        custom: '自定义策略',
      },
      customStrategyLabel: '自定义AI策略',
      customStrategyPlaceholder: '输入自定义的落子策略优先级，系统将自动补充棋盘描述与输出格式。',
      customStrategyHelper: '提示：只填写策略内容，无需包含棋盘状态或回答格式说明。',
    },
    computerAlgorithms: {
      LocalEval: {
        option: '局部评估算法',
        description: '局部评估：对棋盘位置进行静态评估，计算落子点周围的棋型分值，兼顾进攻与防守。',
      },
      NeuralNetwork: {
        option: '神经网络算法',
        description: '神经网络：识别复杂棋型并制定平衡策略，适合追求稳定表现的玩家。',
      },
      TSS: {
        option: '威胁空间搜索算法',
        description: '威胁空间搜索：优先寻找强力杀招与防守点，攻势凌厉，擅长制造双三、双四手段。',
      },
    },
    autoPlay: {
      title: '自动对弈模式',
      helper: '开启后双方自动依照策略落子，无需手动确认。',
      on: '已开启',
      off: '未开启',
    },
    humanVsHumanNotice: '人人对战模式下，黑白双方将在同一设备上轮流落子。',
    forbidden: {
      title: '禁手规则',
      optional: 'Optional',
      overlineTitle: '长连禁手 (≥6子)',
      overlineDescription: '黑棋不得形成六子或以上的连续棋子。',
      doubleFourTitle: '双四禁手',
      doubleFourDescription: '黑棋一步不可同时形成两个活四。',
      doubleThreeTitle: '双三禁手',
      doubleThreeDescription: '黑棋一步不可同时形成两个活三。',
      tipTitle: '提示',
      tipDescription: '禁手规则仅适用于黑棋，是正规比赛中平衡先手优势的常见设置。',
    },
    startGame: '开始游戏',
    quickRulesTitle: '游戏规则速览',
    quickRules: [
      '棋盘大小为 19 × 19，黑方先行。',
      '双方轮流在交叉点落子，形成五连即可获胜。',
      '可选禁手规则帮助平衡黑棋先行的优势。',
    ],
    footer: {
      copyright: '© 2024 Web Gobang · 在线五子棋体验',
      github: 'GitHub',
    },
    consoleWarnings: {
      missingBlackKey: '警告：黑方AI缺少API密钥，可能导致API调用失败',
      missingWhiteKey: '警告：白方AI缺少API密钥，可能导致API调用失败',
      missingBlackCustomUrl: '警告：黑方AI缺少自定义API基础URL，可能导致API调用失败',
      missingWhiteCustomUrl: '警告：白方AI缺少自定义API基础URL，可能导致API调用失败',
    },
    gameBoard: {
      players: {
        black: '黑方',
        white: '白方',
      },
      status: {
        victory: '{player}胜利!',
        draw: '平局',
        turn: '{player}回合',
      },
      victoryModal: {
        celebration: '{player}以出色的表现赢得了比赛！',
        keepWatching: '继续观看棋盘',
      },
      aiTagSuffix: ' → 电脑AI',
      actions: {
        nextMove: '下一步',
        restart: '重新开始',
        backToSettings: '返回设置',
      },
      training: {
        title: '神经网络训练',
        description: '训练神经网络模型以提高棋力',
        progressLabel: '训练进度:',
        completed: '已完成训练',
        cta: '预训练神经网络',
        doneMessage: '神经网络训练完成！模型性能已提升。',
      },
      history: {
        title: '历史记录',
      },
      algorithms: {
        LocalEval: '局部评估',
        NeuralNetwork: '神经网络',
        TSS: '威胁空间搜索',
      },
    },
  },
  en: {
    defaults: {
      blackPlayerId: 'Black Player',
      whitePlayerId: 'White Player',
      customPrompt: `Move priority:
1. Win first: Check for any position that can create an immediate five-in-a-row and take it at once.
2. Counter and defend: Block your opponent's five-in-a-row opportunities while looking for counter strikes.
3. Dual threats: Prefer moves that set up multiple threats at once, such as double threes or double fours.
4. Control the center: Expand influence from the center of the board whenever possible.
5. Sustained pressure: Chain continuous threats to keep the opponent on the defensive.
6. Stay flexible: Adapt attacking and defensive priorities as the situation changes.
7. Edge awareness: Avoid low-value placements near the edges unless a tactic requires it.`,
    },
    languageToggle: {
      buttonText: '中文',
      ariaLabel: 'Switch to Chinese',
    },
    hero: {
      title: 'Web Gobang',
      subtitle: 'A modern take on Gomoku with human, computer, and AI-powered matches.',
      githubLabel: 'View source on GitHub',
    },
    settings: {
      title: 'Game Settings',
      description: 'Configure player roles, AI models, and forbidden moves for your ideal match.',
      sections: {
        black: 'Black Player Settings',
        white: 'White Player Settings',
      },
      playerTypeLabel: 'Player Type',
      playerTypes: {
        human: 'Human Player',
        ai: 'AI Player',
        aiStaticLimit: ' (limited in static environments)',
        computer: 'Computer Player',
      },
      staticEnvNotice: 'AI players fall back to local algorithms when external APIs are unavailable in static deployments.',
      playerIdLabel: 'Player ID',
      playerIdPlaceholder: 'Enter player ID',
      algorithmLabel: 'Algorithm',
      difficultyLabel: 'Difficulty',
      difficultyOptions: {
        easy: 'Casual',
        medium: 'Balanced',
        hard: 'Expert',
      },
      difficultyHelper: 'Adjust how deep the computer player searches and how strong its defense becomes.',
      computerInfo: 'The computer player uses local algorithms and works in every environment, including static hosting.',
      aiProviderLabel: 'Choose AI Provider',
      providerGroup: 'Large Language Models',
      customBaseUrlLabel: 'Custom API Base URL',
      customBaseUrlPlaceholder: 'e.g., https://api.example.com/v1',
      modelLabel: 'Model',
      apiKeyLabel: 'API Key',
      apiKeyPlaceholder: 'Enter API key',
      strategyLabel: 'Strategy Preset',
      strategyOptions: {
        default: 'Default Strategy',
        custom: 'Custom Strategy',
      },
      customStrategyLabel: 'Custom AI Strategy',
      customStrategyPlaceholder: 'Describe your move priorities. The system will add board context and output formatting.',
      customStrategyHelper: 'Tip: Focus on the strategic guidance—no need to repeat board state or response formats.',
    },
    computerAlgorithms: {
      LocalEval: {
        option: 'Local Evaluation Algorithm',
        description: 'Local evaluation: Scores nearby formations for each move, balancing offense and defense.',
      },
      NeuralNetwork: {
        option: 'Neural Network Algorithm',
        description: 'Neural network: Recognizes complex patterns and keeps a steady play style.',
      },
      TSS: {
        option: 'Threat-Space Search Algorithm',
        description: 'Threat-space search: Hunts for forcing attacks and key defensive moves, excelling at double threats.',
      },
    },
    autoPlay: {
      title: 'Auto Play Mode',
      helper: 'Let both sides place stones automatically according to their strategies.',
      on: 'On',
      off: 'Off',
    },
    humanVsHumanNotice: 'In human vs. human mode, both players share the same device and take turns placing stones.',
    forbidden: {
      title: 'Forbidden Move Rules',
      optional: 'Optional',
      overlineTitle: 'Overline (≥6 Stones)',
      overlineDescription: 'Black may not create a line of six or more stones.',
      doubleFourTitle: 'Double Four',
      doubleFourDescription: 'Black may not form two open fours with a single move.',
      doubleThreeTitle: 'Double Three',
      doubleThreeDescription: 'Black may not form two open threes with a single move.',
      tipTitle: 'Tip',
      tipDescription: 'These rules apply only to Black and help balance the first-move advantage in official play.',
    },
    startGame: 'Start Game',
    quickRulesTitle: 'Quick Rules',
    quickRules: [
      'The board is 19 × 19 and Black plays first.',
      'Players alternate on the intersections—connect five stones in a row to win.',
      'Optional forbidden rules help balance Black’s first-move advantage.',
    ],
    footer: {
      copyright: '© 2024 Web Gobang · Online Gomoku Experience',
      github: 'GitHub',
    },
    consoleWarnings: {
      missingBlackKey: 'Warning: The black AI player is missing an API key. Calls may fail.',
      missingWhiteKey: 'Warning: The white AI player is missing an API key. Calls may fail.',
      missingBlackCustomUrl: 'Warning: The black AI player is missing a custom API base URL. Calls may fail.',
      missingWhiteCustomUrl: 'Warning: The white AI player is missing a custom API base URL. Calls may fail.',
    },
    gameBoard: {
      players: {
        black: 'Black',
        white: 'White',
      },
      status: {
        victory: '{player} Wins!',
        draw: 'Draw',
        turn: "{player}'s Turn",
      },
      victoryModal: {
        celebration: '{player} delivers outstanding play to win the match!',
        keepWatching: 'Keep Watching the Board',
      },
      aiTagSuffix: ' → Computer AI',
      actions: {
        nextMove: 'Next Move',
        restart: 'Restart',
        backToSettings: 'Back to Settings',
      },
      training: {
        title: 'Neural Network Training',
        description: 'Train the neural network model to boost playing strength.',
        progressLabel: 'Training Progress:',
        completed: 'Training Complete',
        cta: 'Pre-train Neural Network',
        doneMessage: 'Neural network training complete! Model strength improved.',
      },
      history: {
        title: 'Move History',
      },
      algorithms: {
        LocalEval: 'Local Evaluation',
        NeuralNetwork: 'Neural Network',
        TSS: 'Threat-Space Search',
      },
    },
  },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>('zh');
  const t = translations[language];

  const computerAlgorithms = useMemo(
    () => [
      {
        name: 'LocalEval' as const,
        label: t.computerAlgorithms.LocalEval.option,
      },
      {
        name: 'NeuralNetwork' as const,
        label: t.computerAlgorithms.NeuralNetwork.option,
      },
      {
        name: 'TSS' as const,
        label: t.computerAlgorithms.TSS.option,
      },
    ],
    [t],
  );

  const handleLanguageToggle = () => {
    setLanguage(prev => (prev === 'zh' ? 'en' : 'zh'));
  };
  
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
      models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini']
    },
    {
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      models: ['claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3-opus']
    },
    {
      name: 'Deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder']
    },
    {
      name: 'Qwen',
      baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
      models: ['qwen2.5-72b-instruct', 'qwen2.5-32b-instruct', 'qwen-max']
    },
    {
      name: 'Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-1.0-pro']
    },
    {
      name: 'Custom',
      baseUrl: '',
      models: ['custom-model']
    }
  ]);

  // 玩家ID设置
  const [blackPlayerId, setBlackPlayerId] = useState(translations.zh.defaults.blackPlayerId);
  const [whitePlayerId, setWhitePlayerId] = useState(translations.zh.defaults.whitePlayerId);
  
  // API配置
  const [blackApiConfig, setBlackApiConfig] = useState<ApiConfig>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    isAI: false,
    provider: 'OpenAI',
    computerAlgorithm: 'LocalEval',
    difficulty: 'hard'
  });
  const [whiteApiConfig, setWhiteApiConfig] = useState<ApiConfig>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    isAI: false,
    provider: 'OpenAI',
    computerAlgorithm: 'LocalEval',
    difficulty: 'hard'
  });
  const [blackProvider, setBlackProvider] = useState<Provider>('OpenAI');
  const [whiteProvider, setWhiteProvider] = useState<Provider>('OpenAI');
  const [blackCustomBaseUrl, setBlackCustomBaseUrl] = useState('');
  const [whiteCustomBaseUrl, setWhiteCustomBaseUrl] = useState('');
  const [blackModel, setBlackModel] = useState('gpt-4o-mini');
  const [whiteModel, setWhiteModel] = useState('gpt-4o-mini');
  
  // 自定义指令设置
  const [blackPromptType, setBlackPromptType] = useState<'default' | 'custom'>('default');
  const [whitePromptType, setWhitePromptType] = useState<'default' | 'custom'>('default');
  const [blackCustomPrompt, setBlackCustomPrompt] = useState(translations.zh.defaults.customPrompt);
  const [whiteCustomPrompt, setWhiteCustomPrompt] = useState(translations.zh.defaults.customPrompt);
  
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

  useEffect(() => {
    setBlackPlayerId(prev => {
      if (
        prev === translations.zh.defaults.blackPlayerId ||
        prev === translations.en.defaults.blackPlayerId
      ) {
        return translations[language].defaults.blackPlayerId;
      }
      return prev;
    });

    setWhitePlayerId(prev => {
      if (
        prev === translations.zh.defaults.whitePlayerId ||
        prev === translations.en.defaults.whitePlayerId
      ) {
        return translations[language].defaults.whitePlayerId;
      }
      return prev;
    });

    setBlackCustomPrompt(prev => {
      if (
        prev === translations.zh.defaults.customPrompt ||
        prev === translations.en.defaults.customPrompt
      ) {
        return translations[language].defaults.customPrompt;
      }
      return prev;
    });

    setWhiteCustomPrompt(prev => {
      if (
        prev === translations.zh.defaults.customPrompt ||
        prev === translations.en.defaults.customPrompt
      ) {
        return translations[language].defaults.customPrompt;
      }
      return prev;
    });
  }, [language]);

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
        console.warn(t.consoleWarnings.missingBlackKey);
      }
      if (gameModeSetting.white === 'ai' && !whiteApiConfig.apiKey) {
        console.warn(t.consoleWarnings.missingWhiteKey);
      }

      if (blackProvider === 'Custom' && !blackCustomBaseUrl) {
        console.warn(t.consoleWarnings.missingBlackCustomUrl);
      }

      if (whiteProvider === 'Custom' && !whiteCustomBaseUrl) {
        console.warn(t.consoleWarnings.missingWhiteCustomUrl);
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
    const model = isBlack ? blackModel : whiteModel;
    const setModel = isBlack ? setBlackModel : setWhiteModel;
    const playerId = isBlack ? blackPlayerId : whitePlayerId;
    const setPlayerId = isBlack ? setBlackPlayerId : setWhitePlayerId;
    const computerAlgorithm = isBlack ? blackComputerAlgorithm : whiteComputerAlgorithm;
    const setComputerAlgorithm = isBlack ? setBlackComputerAlgorithm : setWhiteComputerAlgorithm;
    const difficulty = isBlack ? blackDifficulty : whiteDifficulty;
    const setDifficulty = isBlack ? setBlackDifficulty : setWhiteDifficulty;

    const algorithmDescriptions: Record<ComputerAlgorithm, string> = {
      LocalEval: t.computerAlgorithms.LocalEval.description,
      NeuralNetwork: t.computerAlgorithms.NeuralNetwork.description,
      TSS: t.computerAlgorithms.TSS.description,
    };

    const handlePlayerTypeChange = (value: PlayerType) => {
      if (isBlack) {
        handleBlackPlayerTypeChange(value);
      } else {
        handleWhitePlayerTypeChange(value);
      }
    };

    const handleAlgorithmChange = (value: ComputerAlgorithm) => {
      setComputerAlgorithm(value);
      if (isBlack) {
        handleBlackApiChange('computerAlgorithm', value);
      } else {
        handleWhiteApiChange('computerAlgorithm', value);
      }
    };

    const handleDifficultyChange = (value: Difficulty) => {
      setDifficulty(value);
      if (isBlack) {
        handleBlackApiChange('difficulty', value);
      } else {
        handleWhiteApiChange('difficulty', value);
      }
    };

    const handleApiKeyChange = (newKey: string) => {
      if (isBlack) {
        handleBlackApiChange('apiKey', newKey);
      } else {
        handleWhiteApiChange('apiKey', newKey);
      }
    };

    const sectionTitle = isBlack ? t.settings.sections.black : t.settings.sections.white;
    const accentLabel = isBlack ? 'BLACK' : 'WHITE';

    return (
      <div className={`col-span-2 md:col-span-1 ${iosSectionCardClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${isBlack ? 'bg-slate-900' : 'bg-white border border-slate-300'}`}
            />
            <h3 className="text-lg font-semibold text-slate-900">{sectionTitle}</h3>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            {accentLabel}
          </span>
        </div>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <label className={iosLabelClass}>{t.settings.playerTypeLabel}</label>
            <select
              className={iosSelectClass}
              value={playerType}
              onChange={(event) => handlePlayerTypeChange(event.target.value as PlayerType)}
            >
              <option value="human">{t.settings.playerTypes.human}</option>
              <option value="ai" disabled={isStaticEnv}>
                {t.settings.playerTypes.ai}
                {isStaticEnv ? t.settings.playerTypes.aiStaticLimit : ''}
              </option>
              <option value="computer">{t.settings.playerTypes.computer}</option>
            </select>
            {isStaticEnv && playerType === 'ai' && (
              <p className="rounded-2xl bg-[#FFF4E5] px-3 py-2 text-xs font-medium text-[#B55B00]">
                {t.settings.staticEnvNotice}
              </p>
            )}
          </div>

          {playerType === 'human' && (
            <div className="space-y-2">
              <label className={iosLabelClass}>{t.settings.playerIdLabel}</label>
              <input
                type="text"
                className={iosInputClass}
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
                placeholder={t.settings.playerIdPlaceholder}
              />
            </div>
          )}

          {playerType === 'computer' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={iosLabelClass}>{t.settings.algorithmLabel}</label>
                <select
                  className={iosSelectClass}
                  value={computerAlgorithm}
                  onChange={(event) => handleAlgorithmChange(event.target.value as ComputerAlgorithm)}
                >
                  {computerAlgorithms.map((algo) => (
                    <option key={algo.name} value={algo.name}>
                      {algo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`${iosSubtleCardClass} text-sm text-slate-600`}>
                {algorithmDescriptions[computerAlgorithm]}
              </div>

              <div className="space-y-2">
                <label className={iosLabelClass}>{t.settings.difficultyLabel}</label>
                <select
                  className={iosSelectClass}
                  value={difficulty}
                  onChange={(event) => handleDifficultyChange(event.target.value as Difficulty)}
                >
                  <option value="easy">{t.settings.difficultyOptions.easy}</option>
                  <option value="medium">{t.settings.difficultyOptions.medium}</option>
                  <option value="hard">{t.settings.difficultyOptions.hard}</option>
                </select>
                <p className={iosHelperTextClass}>{t.settings.difficultyHelper}</p>
              </div>

              <div className="rounded-2xl border border-[#0A84FF]/25 bg-[#F0F6FF]/80 p-4 text-sm text-[#0A2463]">
                {t.settings.computerInfo}
              </div>
            </div>
          )}

          {playerType === 'ai' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={iosLabelClass}>{t.settings.aiProviderLabel}</label>
                <select
                  className={`${iosSelectClass} ${isStaticEnv ? 'opacity-50' : ''}`}
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as Provider)}
                  disabled={isStaticEnv}
                >
                  <optgroup label={t.settings.providerGroup}>
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
                <div className="space-y-2">
                  <label className={iosLabelClass}>{t.settings.customBaseUrlLabel}</label>
                  <input
                    type="text"
                    className={`${iosInputClass} ${isStaticEnv ? 'opacity-50' : ''}`}
                    value={customBaseUrl}
                    onChange={(event) => setCustomBaseUrl(event.target.value)}
                    placeholder={t.settings.customBaseUrlPlaceholder}
                    disabled={isStaticEnv}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className={iosLabelClass}>{t.settings.modelLabel}</label>
                <select
                  className={`${iosSelectClass} ${isStaticEnv ? 'opacity-50' : ''}`}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={isStaticEnv}
                >
                  {getModelsForProvider(provider, customBaseUrl).map((m) => (
                    <option key={`${side}-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {!['AlphaZero', 'Minimax', 'MCTS'].includes(provider) && (
                <div className="space-y-2">
                  <label className={iosLabelClass}>{t.settings.apiKeyLabel}</label>
                  <input
                    type="password"
                    className={`${iosInputClass} font-mono tracking-widest ${isStaticEnv ? 'opacity-50' : ''}`}
                    value={apiConfig.apiKey}
                    onChange={(event) => handleApiKeyChange(event.target.value)}
                    placeholder={t.settings.apiKeyPlaceholder}
                    disabled={isStaticEnv}
                  />
                </div>
              )}

              {!['AlphaZero', 'Minimax', 'MCTS'].includes(provider) && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className={iosLabelClass}>{t.settings.strategyLabel}</label>
                    <select
                      className={`${iosSelectClass} ${isStaticEnv ? 'opacity-50' : ''}`}
                      value={side === 'black' ? blackPromptType : whitePromptType}
                      onChange={(event) => {
                        const value = event.target.value as 'default' | 'custom';
                        if (isBlack) {
                          setBlackPromptType(value);
                        } else {
                          setWhitePromptType(value);
                        }
                      }}
                      disabled={isStaticEnv}
                    >
                      <option value="default">{t.settings.strategyOptions.default}</option>
                      <option value="custom">{t.settings.strategyOptions.custom}</option>
                    </select>
                  </div>

                  {((isBlack && blackPromptType === 'custom') || (!isBlack && whitePromptType === 'custom')) && (
                    <div className="space-y-2">
                      <label className={iosLabelClass}>{t.settings.customStrategyLabel}</label>
                      <textarea
                        className={`${iosTextareaClass} min-h-[160px] ${isStaticEnv ? 'opacity-50' : ''}`}
                        value={isBlack ? blackCustomPrompt : whiteCustomPrompt}
                        onChange={(event) => {
                          if (isBlack) {
                            setBlackCustomPrompt(event.target.value);
                          } else {
                            setWhiteCustomPrompt(event.target.value);
                          }
                        }}
                        placeholder={t.settings.customStrategyPlaceholder}
                        disabled={isStaticEnv}
                      />
                      <p className={`${iosHelperTextClass} text-[#0A84FF]`}>
                        {t.settings.customStrategyHelper}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
    <div className="relative min-h-screen bg-gradient-to-b from-[#F2F4F8] via-[#F8F8FB] to-[#E9ECF5]">
      <button
        type="button"
        onClick={handleLanguageToggle}
        aria-label={t.languageToggle.ariaLabel}
        className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#007AFF]/60 hover:text-[#007AFF]"
      >
        {t.languageToggle.buttonText}
      </button>
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            {t.hero.subtitle}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="https://github.com/Greyyy-HJC/Web_Gobang"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#007AFF]/60 hover:text-[#007AFF]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="text-slate-500">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>{t.hero.githubLabel}</span>
            </a>
          </div>
        </div>

        {!gameStarted ? (
          <div className={`${iosCardClass} mx-auto mt-12 w-full max-w-4xl`}>
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">{t.settings.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{t.settings.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {renderPlayerSettings('black')}
              {renderPlayerSettings('white')}
            </div>

            {(isAIvsAI ||
              (gameModeSetting.black === 'computer' && gameModeSetting.white === 'computer') ||
              (gameModeSetting.black === 'ai' && gameModeSetting.white === 'computer') ||
              (gameModeSetting.black === 'computer' && gameModeSetting.white === 'ai')) && (
              <div className={`${iosSubtleCardClass} my-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t.autoPlay.title}</p>
                  <p className={iosHelperTextClass}>{t.autoPlay.helper}</p>
                </div>
                <div className="flex items-center gap-3">
                  <IOSToggle id="auto-play-toggle" checked={autoPlay} onChange={(checked) => setAutoPlay(checked)} />
                  <span className="text-sm text-slate-500">{autoPlay ? t.autoPlay.on : t.autoPlay.off}</span>
                </div>
              </div>
            )}

            {isHumanVsHuman && (
              <div className="my-8 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm text-amber-700 shadow-sm">
                {t.humanVsHumanNotice}
              </div>
            )}

            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{t.forbidden.title}</h2>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  {t.forbidden.optional}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={iosSubtleCardClass}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{t.forbidden.overlineTitle}</p>
                      <p className={iosHelperTextClass}>{t.forbidden.overlineDescription}</p>
                    </div>
                    <div className="mt-1 shrink-0">
                      <IOSToggle
                        id="forbidden-overline"
                        checked={forbiddenRules.overline}
                        onChange={(checked) => handleForbiddenRuleChange('overline', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className={iosSubtleCardClass}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{t.forbidden.doubleFourTitle}</p>
                      <p className={iosHelperTextClass}>{t.forbidden.doubleFourDescription}</p>
                    </div>
                    <div className="mt-1 shrink-0">
                      <IOSToggle
                        id="forbidden-doubleFour"
                        checked={forbiddenRules.doubleFour}
                        onChange={(checked) => handleForbiddenRuleChange('doubleFour', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className={iosSubtleCardClass}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{t.forbidden.doubleThreeTitle}</p>
                      <p className={iosHelperTextClass}>{t.forbidden.doubleThreeDescription}</p>
                    </div>
                    <div className="mt-1 shrink-0">
                      <IOSToggle
                        id="forbidden-doubleThree"
                        checked={forbiddenRules.doubleThree}
                        onChange={(checked) => handleForbiddenRuleChange('doubleThree', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${iosSubtleCardClass} text-sm text-slate-500`}>
                <p className="font-semibold text-slate-700">{t.forbidden.tipTitle}</p>
                <p>{t.forbidden.tipDescription}</p>
              </div>
            </div>

            <button className={`${iosPrimaryButtonClass} mt-10`} onClick={handleStartGame}>
              {t.startGame}
            </button>

            <div className={`${iosSubtleCardClass} mt-10 space-y-2 text-sm text-slate-600`}>
              <h3 className="text-base font-semibold text-slate-800">{t.quickRulesTitle}</h3>
              <ul className="list-disc space-y-1 pl-5">
                {t.quickRules.map((rule, index) => (
                  <li key={`quick-rule-${index}`}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className={`${iosCardClass} mt-12 overflow-hidden`}> 
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
              copy={t.gameBoard}
              onReturnToSettings={() => setGameStarted(false)}
            />
          </div>
        )}
      </div>

      <footer className="mt-16 px-4 py-10 text-center text-sm text-slate-400">
        <p>{t.footer.copyright}</p>
        <a
          href="https://github.com/Greyyy-HJC/Web_Gobang"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition hover:text-[#007AFF]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="text-slate-500">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>{t.footer.github}</span>
        </a>
      </footer>
    </div>
  );
}
