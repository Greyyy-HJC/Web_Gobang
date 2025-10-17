# Web Gobang

<div align="right">
  <a href="#english-version" style="display:inline-block;padding:6px 12px;border-radius:9999px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;font-weight:600;text-decoration:none;margin-left:8px;">English</a>
  <a href="#zh-version" style="display:inline-block;padding:6px 12px;border-radius:9999px;border:1px solid #2563eb;background:#2563eb;color:#ffffff;font-weight:600;text-decoration:none;margin-left:8px;">中文</a>
</div>

![Web Gobang Demo](./public/screenshot.png)

---

<a id="zh-version"></a>
## 中文版

### 简介
一个现代化、功能丰富的在线五子棋（Gobang）游戏，支持人人对战、人机对战和 AI 之间的对战。使用多种先进 AI 模型或内置的本地 AI 算法，提供流畅的游戏体验。**特别支持不同 AI 模型之间的对战**，可以让 OpenAI、Anthropic 等不同大语言模型一较高下，观察它们在策略游戏中的表现差异。

[在线体验](https://greyyy-hjc.github.io/Web_Gobang/) ｜ [GitHub 仓库](https://github.com/Greyyy-HJC/Web_Gobang)

### 特色功能
- 👥 **多种对战模式**：支持人人对战、人机对战、AI 互相对战，以及电脑棋手对战
- 🤖 **AI 模型对战**：可配置不同 AI 提供商的模型互相对战，如 GPT-4 vs Claude，观察 AI 间的策略差异
- 🧠 **多 AI 提供商**：支持 OpenAI、Anthropic、Deepseek、Qwen、Gemini 等多家 AI 服务
- 💻 **高级电脑棋手**：内置三种算法的电脑棋手，即使离线也能享受高质量对战
- 🎮 **友好的界面**：美观的棋盘界面、实时游戏状态和历史记录
- 🛠️ **灵活的设置**：可自定义玩家 ID、选择 AI 模型和配置 API
- 🔄 **自定义 AI 策略**：允许用户自定义 AI 的落子策略，调整 AI 的下棋风格
- 🏆 **胜利庆祝**：有动画效果的胜利提示
- ⚠️ **错误处理**：API 错误自动降级到本地 AI 逻辑，确保游戏流畅进行
- 📱 **响应式设计**：适配各种设备尺寸，提供良好的移动端体验
- 🔒 **安全 API 管理**：API 密钥在客户端安全处理，不会被泄露

### 技术栈
- Next.js 14 (App Router)
- React & React Hooks
- TypeScript
- Tailwind CSS & DaisyUI
- LLM API 集成 (OpenAI、Anthropic 等)

### 快速开始
#### 在线体验
直接访问 [Web Gobang 在线版](https://greyyy-hjc.github.io/Web_Gobang/) 开始游戏体验。在静态部署环境中，游戏会自动使用本地 AI 算法，无需 API 密钥。

#### 本地运行
1. 克隆仓库：
   ```bash
   git clone https://github.com/Greyyy-HJC/Web_Gobang.git
   cd Web_Gobang
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
4. 在浏览器中访问 `http://localhost:3000`

### 游戏使用指南
#### 1. 设置玩家
- **人类玩家**：选择“人类棋手”并设置您的棋手 ID
- **AI 玩家**：选择“AI 棋手”，然后配置以下设置：
  - 选择 AI 提供商（OpenAI、Anthropic、Deepseek 等）
  - 选择 AI 模型
  - 输入您的 API 密钥
  - 可选择默认策略或自定义策略
- **电脑棋手**：选择“电脑棋手”，然后选择以下算法之一：
  - **局部评估算法**：对棋盘位置进行静态评估，计算落子点周围的棋型分值。运算速度快，适合初学者。
  - **神经网络算法**：使用简化神经网络评估棋局，能识别基本棋型并进行防守。运算效率高，策略更灵活。
  - **威胁空间搜索算法**：分析棋盘威胁空间，优先形成连续攻击态势。识别活三、活四等高级棋型，具有较强攻击性。

#### 2. AI 模型对战设置
- 为黑方和白方分别选择不同的 AI 提供商和模型
- 可以配置不同的策略，例如让一个 AI 更激进，另一个更保守
- 使用“自动对弈模式”让两个 AI 自动进行整盘对局
- 观察不同模型在棋局中的决策过程和胜负结果

#### 3. 自定义 AI 策略
- 编写自己的五子棋策略指导
- 调整 AI 的攻守风格
- 设置不同的落子优先级
- 系统会自动处理棋盘状态和返回格式

#### 4. 开始游戏
- 点击“开始游戏”按钮
- 黑方先行，玩家轮流落子
- 当一方在横、竖或斜线上形成连续五子时获胜

#### 5. 游戏控制
- **重新开始**：重置棋盘，开始新游戏
- **返回设置**：回到游戏设置页面
- **自动对弈模式**：在 AI 或电脑对战时可启用，进行自动对弈
- **下一步按钮**：手动控制 AI 或电脑的每一步移动
- **历史记录**：查看棋局的完整历史

### API 集成与错误处理
游戏支持多种 AI 服务提供商的 API 集成：

- **OpenAI**：支持 GPT-4o、GPT-4-turbo、GPT-3.5-turbo
- **Anthropic**：支持 Claude-3-opus、Claude-3-sonnet、Claude-3-haiku
- **其他**：Deepseek、Qwen、Gemini 等

游戏对各种 API 错误情况进行了处理：
- 无效的 API 密钥
- API 服务器不可用
- AI 返回无效移动
- 网络连接问题

当出现这些错误时，游戏会：
1. 显示明确的错误消息提示
2. 自动切换到本地 AI 算法
3. 继续游戏流程而不中断
4. 允许用户手动关闭错误通知

### 本地 AI 算法
内置三种不同的本地 AI 算法，为玩家提供多样化的对战体验：

#### 局部评估算法 (LocalEval)
- **特点**：对棋盘位置进行静态评估，计算落子点周围的棋型分值
- **优势**：运算速度快，反应迅速
- **适合人群**：初学者，或希望快速对弈的玩家
- **策略**：基于位置价值和基本棋型的评分，包含简单的防守策略

#### 神经网络算法 (NeuralNetwork)
- **特点**：使用简化神经网络评估棋局，能识别基本棋型并进行防守
- **优势**：运算效率高，策略更灵活
- **适合人群**：有一定五子棋基础的玩家
- **策略**：结合位置评估和简化神经网络评分，能够识别并形成基本棋型

#### 威胁空间搜索算法 (TSS)
- **特点**：分析棋盘威胁空间，优先形成连续攻击态势
- **优势**：具有较强攻击性，能识别高级棋型
- **适合人群**：高级玩家，寻求挑战的玩家
- **策略**：识别活三、活四等高级棋型，积极进攻并防守对手威胁

所有算法都实现了五子棋的核心策略：
- **胜利判断**：检测连续五子并给予最高优先级
- **威胁检测**：识别对手可能形成的威胁并阻止
- **攻击模式**：主动形成活三、活四等有利局面
- **布局优化**：控制棋盘中心和关键位置
- **智能评估**：对每个可能的落子位置进行评分，选择最优点

### 部署到 GitHub Pages
要将此项目部署到 GitHub Pages，请按照以下步骤操作：

1. **添加部署配置**：在项目根目录下更新 `next.config.js` 文件：
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     ...(process.env.NODE_ENV === 'production' ? {
       output: 'export',
       basePath: '/Web_Gobang',
       images: {
         unoptimized: true,
       }
     } : {})
   };

   module.exports = nextConfig;
   ```
2. **添加部署工作流**：创建 `.github/workflows/deploy.yml` 文件：
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ master ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: "18"
             cache: 'npm'
         - name: Install dependencies
           run: npm ci
         - name: Build with Next.js
           run: npm run build
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./out

     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```
3. **在 GitHub 仓库设置中启用 GitHub Pages**
4. **推送代码到 GitHub，等待 Actions 工作流完成**

### 静态部署注意事项
由于 GitHub Pages 是静态网站托管服务，有以下使用限制和解决方案：

1. **无 API 路由支持**：
   - GitHub Pages 不支持服务器端 API 路由
   - 本项目会自动检测部署环境，在静态环境中自动切换到客户端 AI 逻辑
   - 在本地开发环境中保持使用 API 路由与真实 AI 模型交互的能力
2. **客户端 AI 模式**：
   - 在 GitHub Pages 环境中，即使配置了 API 密钥和选择了 AI 模型，游戏也会使用内置的本地 AI 算法
   - 本地 AI 算法经过优化，实现了五子棋的核心策略，确保良好的游戏体验
3. **环境检测逻辑**：
   - 系统会自动检测当前运行环境，并根据环境选择适当的 AI 逻辑
   - 环境检测包括：GitHub Pages 域名、部署路径和静态文件协议等

> 注意：如果希望在生产环境中使用真实 AI API 调用，建议部署到支持服务器端功能的平台，如 Vercel 或 Netlify。

### 最新更新
- **电脑棋手算法说明**：在选择电脑棋手算法时，现在会显示每种算法的详细说明
- **算法能力增强**：威胁空间搜索 (TSS) 算法增强，能够识别并防御多种复杂棋型
- **神经网络优化**：优化了神经网络算法的评估函数，提高对局部棋势的判断
- **UI 优化**：改进了用户界面，添加了更多提示信息
- **错误处理增强**：优化了 AI 棋手的错误处理流程

### 项目开发计划
- [ ] 添加游戏历史记录保存功能
- [ ] 实现更先进的本地 AI 算法
- [ ] 增加更多 AI 提供商支持
- [ ] 添加多语言支持
- [ ] 实现棋盘主题自定义

### 贡献
欢迎提交 Issue 和 Pull Request 来改进此项目！如果您有任何想法或发现了 bug，请在 GitHub 仓库上提交。

### 许可证
[MIT License](./LICENSE)

---

<a id="english-version"></a>
## English Version

### Overview
Web Gobang is a modern, feature-rich Gomoku experience that supports human vs. human, human vs. AI, and AI vs. AI matches. You can pit multiple cutting-edge language models against each other or fall back to the built-in offline engines for a smooth match every time. **Cross-provider battles** (for example GPT-4 vs. Claude) let you watch how different models approach board strategy.

[Try It Online](https://greyyy-hjc.github.io/Web_Gobang/) | [GitHub Repository](https://github.com/Greyyy-HJC/Web_Gobang)

### Key Features
- 👥 **Multiple match modes**: human vs. human, human vs. AI, AI vs. AI, and computer-engine battles
- 🤖 **AI model duels**: configure models from different providers (GPT-4, Claude, Deepseek, etc.) to challenge one another
- 🧠 **Rich provider support**: OpenAI, Anthropic, Deepseek, Qwen, Gemini, and more
- 💻 **Advanced offline engines**: three built-in computer algorithms deliver strong play even without network access
- 🎮 **Friendly UI**: polished board, live status panel, and move history timeline
- 🛠️ **Flexible setup**: customize player IDs, choose models, and configure API keys with ease
- 🔄 **Custom AI prompts**: tailor the move-order strategy to shape each model’s playing style
- 🏆 **Win celebrations**: animated victory modal highlights the winning player
- ⚠️ **Robust error handling**: automatically falls back to local AI when API calls fail
- 📱 **Responsive design**: optimized layout across desktop, tablet, and mobile devices
- 🔒 **Safe API management**: keeps API keys on the client side and out of the repo

### Tech Stack
- Next.js 14 (App Router)
- React with Hooks
- TypeScript
- Tailwind CSS & DaisyUI
- LLM API integrations (OpenAI, Anthropic, etc.)

### Quick Start
#### Try It Online
Visit the [Web Gobang demo](https://greyyy-hjc.github.io/Web_Gobang/) to play instantly. In static hosting environments the app automatically switches to the offline AI engines, so no API key is required.

#### Run Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/Greyyy-HJC/Web_Gobang.git
   cd Web_Gobang
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

### How to Play
#### 1. Configure players
- **Human player**: choose “Human Player” and set a custom ID.
- **AI player**: pick “AI Player”, then configure:
  - Provider (OpenAI, Anthropic, Deepseek, etc.)
  - Model name
  - API key
  - Default or custom strategy prompt
- **Computer player**: choose “Computer Player” and select one of the offline algorithms:
  - **Local Evaluation**: fast static evaluation around each candidate move; great for newcomers.
  - **Neural Network**: lightweight NN scorer that recognizes common patterns and defends reliably.
  - **Threat-Space Search**: aggressively chases forcing lines (double-threes, double-fours, etc.).

#### 2. Set up AI vs. AI showdowns
- Assign different providers or models to black and white.
- Mix strategies (aggressive vs. defensive) to compare play styles.
- Enable **Auto Play Mode** to let both sides move without manual input.
- Observe how each engine evaluates threats and converts a win.

#### 3. Create custom AI prompts
- Describe your preferred move priorities.
- Tune offensive vs. defensive play.
- Rank important board patterns.
- The app automatically adds board context and expected output format for you.

#### 4. Start a match
- Click **Start Game**.
- Black moves first; players alternate placing stones.
- The first to connect five in a row (horizontal, vertical, or diagonal) wins.

#### 5. In-game controls
- **Restart**: reset the board to a fresh game.
- **Back to Settings**: return to configuration without reloading the page.
- **Auto Play Mode**: drive fully automated AI/AI or computer/computer duels.
- **Next Move**: manually advance the turn when Auto Play is disabled.
- **Move History**: review every move with coordinates and player colors.

### API Integration & Error Handling
Supported providers include:
- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Others**: Deepseek, Qwen, Gemini, and more

Resilience features cover:
- Missing or invalid API keys
- Provider downtime or rate limits
- Invalid coordinates returned by the model
- Network interruptions

When an error occurs the app:
1. Surfaces a clear message in the UI.
2. Falls back to the offline algorithms automatically.
3. Continues the match without breaking turn order.
4. Lets players dismiss the warning once acknowledged.

### Local AI Engines
Three offline engines ship with the project:

#### Local Evaluation
- **What it does**: static scoring around each move to balance attack and defense.
- **Why it matters**: extremely fast; great for quick matches or teaching.
- **Strategy**: position value plus lightweight pattern scoring with simple defense heuristics.

#### Neural Network
- **What it does**: simplified neural-network evaluator detects basic shapes and responses.
- **Why it matters**: efficient and versatile with a calmer play style.
- **Strategy**: blends positional heuristics with NN outputs to shape opening, midgame, and defense.

#### Threat-Space Search (TSS)
- **What it does**: maps threat lines to prioritize forcing sequences.
- **Why it matters**: highly aggressive; excels at spotting double threats and lethal combinations.
- **Strategy**: hunts for open threes/fours, blocks incoming threats, and pressures the opponent continuously.

All engines share core logic:
- **Victory detection** for five-in-a-row.
- **Threat recognition** to block opponent wins in time.
- **Offensive planning** to create simultaneous threats.
- **Board control** favoring center influence and key intersections.
- **Scoring** for every legal move to pick the strongest option.

### Deploying to GitHub Pages
Follow these steps to publish the static export:
1. **Configure Next.js** (`next.config.js`):
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     ...(process.env.NODE_ENV === 'production' ? {
       output: 'export',
       basePath: '/Web_Gobang',
       images: {
         unoptimized: true,
       }
     } : {})
   };

   module.exports = nextConfig;
   ```
2. **Add the deployment workflow** (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ master ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: "18"
             cache: 'npm'
         - name: Install dependencies
           run: npm ci
         - name: Build with Next.js
           run: npm run build
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./out

     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```
3. **Enable GitHub Pages** in the repository settings.
4. **Push to GitHub** and wait for the workflow to finish.

### Static Deployment Notes
Because GitHub Pages is static hosting, keep these constraints in mind:
1. **No API routes**
   - Serverless/Edge routes are unavailable.
   - The app auto-detects static environments and switches to client-only AI.
   - Local development still calls real APIs for full fidelity.
2. **Client-side AI mode**
   - Even with API keys configured, the live demo relies on the offline engines.
   - The offline engines cover the essential Gomoku strategies for a solid experience.
3. **Environment detection**
   - Automatically checks the hostname, base path, and file protocol to pick the correct mode.

> Tip: For production scenarios that need real-time API calls, deploy to a platform with server support such as Vercel or Netlify.

### Recent Updates
- **Computer engine descriptions**: every offline algorithm now explains its style before you pick it.
- **Threat-Space upgrades**: the TSS engine better recognizes and counters complex formations.
- **Neural network tuning**: refined evaluation for sharper local judgment.
- **UI polish**: clearer prompts, improved layout, and richer status hints.
- **Error-handling improvements**: smoother fallbacks when API requests fail.

### Roadmap
- [ ] Persist match history
- [ ] Ship an even stronger offline AI engine
- [ ] Add more AI providers
- [ ] Expand multi-language UI coverage
- [ ] Offer custom board themes

### Contributing
Issues and pull requests are welcome! Share ideas, report bugs, or open discussions directly in the repository.

### License
[MIT License](./LICENSE)
