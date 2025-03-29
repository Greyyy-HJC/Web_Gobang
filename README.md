# Web Gobang - 在线五子棋游戏

![Web Gobang Demo](./public/screenshot.png)

一个现代化、功能丰富的在线五子棋（Gobang）游戏，支持人人对战、人机对战和AI之间的对战。使用多种先进AI模型或内置的本地AI算法，提供流畅的游戏体验。**特别支持不同AI模型之间的对战**，可以让OpenAI、Anthropic等不同大语言模型一较高下，观察它们在策略游戏中的表现差异。

[在线体验](https://greyyy-hjc.github.io/Web_Gobang/) | [GitHub 仓库](https://github.com/Greyyy-HJC/Web_Gobang)

## 特色功能

- 👥 **多种对战模式**：支持人人对战、人机对战、AI互相对战，以及电脑棋手对战
- 🤖 **AI模型对战**：可配置不同AI提供商的模型互相对战，如GPT-4 vs Claude，观察AI间的策略差异
- 🧠 **多AI提供商**：支持OpenAI、Anthropic、Deepseek、Qwen、Gemini等多家AI服务
- 🎮 **友好的界面**：美观的棋盘界面、实时游戏状态和历史记录
- 🛠️ **灵活的设置**：可自定义玩家ID、选择AI模型和配置API
- 🔄 **自定义AI策略**：允许用户自定义AI的落子策略，调整AI的下棋风格
- 🌐 **本地AI逻辑**：内置电脑棋手，即使没有API密钥，也能享受棋牌对战
- 🏆 **胜利庆祝**：有动画效果的胜利提示
- ⚠️ **错误处理**：API错误自动降级到本地AI逻辑，确保游戏流畅进行
- 📱 **响应式设计**：适配各种设备尺寸，提供良好的移动端体验
- 🔒 **安全API管理**：API密钥在客户端安全处理，不会被泄露

## 技术栈

- Next.js 14 (App Router)
- React & React Hooks
- TypeScript
- Tailwind CSS & DaisyUI
- LLM API集成 (OpenAI, Anthropic等)

## 快速开始

### 在线体验

直接访问 [Web Gobang 在线版](https://greyyy-hjc.github.io/Web_Gobang/) 开始游戏体验。在静态部署环境中，游戏会自动使用本地AI算法，无需API密钥。

### 本地运行

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

## 游戏使用指南

### 1. 设置玩家

- **人类玩家**：选择"人类棋手"并设置您的棋手ID
- **AI玩家**：选择"AI棋手"，然后配置以下设置：
  - 选择AI提供商（OpenAI、Anthropic、Deepseek等）
  - 选择AI模型
  - 输入您的API密钥
  - 可选择默认策略或自定义策略
- **电脑棋手**：选择"电脑棋手"，无需额外设置，使用内置AI算法

### 2. AI模型对战设置

你可以让不同的AI模型互相对战，观察它们的策略差异：
- 为黑方和白方分别选择不同的AI提供商和模型
- 可以配置不同的策略，例如让一个AI更激进，另一个更保守
- 使用"自动对弈模式"让两个AI自动进行整盘对局
- 观察不同模型在棋局中的决策过程和胜负结果

### 3. 自定义AI策略

当选择"自定义策略"时，您可以：
- 编写自己的五子棋策略指导
- 调整AI的攻守风格
- 设置不同的落子优先级
- 系统会自动处理棋盘状态和返回格式

### 4. 开始游戏

- 点击"开始游戏"按钮
- 黑方先行，玩家轮流落子
- 当一方在横、竖或斜线上形成连续五子时获胜

### 5. 游戏控制

- **重新开始**：重置棋盘，开始新游戏
- **返回设置**：回到游戏设置页面
- **自动对弈模式**：在AI或电脑对战时可启用，进行自动对弈
- **下一步按钮**：手动控制AI或电脑的每一步移动
- **历史记录**：查看棋局的完整历史

## API集成与错误处理

游戏支持多种AI服务提供商的API集成：

- **OpenAI**：支持GPT-4o, GPT-4-turbo, GPT-3.5-turbo
- **Anthropic**：支持Claude-3-opus, Claude-3-sonnet, Claude-3-haiku
- **其他**：Deepseek, Qwen, Gemini等

游戏对各种API错误情况进行了处理：
- 无效的API密钥
- API服务器不可用
- AI返回无效移动
- 网络连接问题

当出现这些错误时，游戏会：
1. 显示明确的错误消息提示
2. 自动切换到本地AI算法
3. 继续游戏流程而不中断
4. 允许用户手动关闭错误通知

## 本地AI算法

内置的本地AI算法实现了五子棋的核心策略：

- **胜利判断**：检测连续五子并给予最高优先级
- **威胁检测**：识别对手可能形成的威胁并阻止
- **攻击模式**：主动形成活三、活四等有利局面
- **布局优化**：控制棋盘中心和关键位置
- **智能评估**：对每个可能的落子位置进行评分，选择最优点

## 部署到GitHub Pages

要将此项目部署到GitHub Pages，请按照以下步骤操作：

1. 添加部署配置：

在项目根目录下更新 `next.config.js` 文件：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 根据环境选择静态导出配置
  ...(process.env.NODE_ENV === 'production' ? {
    output: 'export',  // 启用静态导出
    basePath: '/Web_Gobang', // 设置基本路径
    images: {
      unoptimized: true,
    }
  } : {})
};

module.exports = nextConfig;
```

2. 添加部署工作流：

创建一个 `.github/workflows/deploy.yml` 文件：

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

3. 在GitHub仓库设置中启用GitHub Pages
4. 推送代码到GitHub，等待Actions工作流完成

## 静态部署注意事项

由于GitHub Pages是静态网站托管服务，有以下使用限制和解决方案：

1. **无API路由支持**：
   - GitHub Pages不支持服务器端API路由
   - 本项目会自动检测部署环境，在静态环境中自动切换到客户端AI逻辑
   - 在本地开发环境中保持使用API路由与真实AI模型交互的能力

2. **客户端AI模式**：
   - 在GitHub Pages环境中，即使配置了API密钥和选择了AI模型，游戏也会使用内置的本地AI算法
   - 本地AI算法经过优化，实现了五子棋的核心策略，确保良好的游戏体验

3. **环境检测逻辑**：
   - 系统会自动检测当前运行环境，并根据环境选择适当的AI逻辑
   - 环境检测包括：GitHub Pages域名、部署路径和静态文件协议等

> 注意：如果希望在生产环境中使用真实AI API调用，建议部署到支持服务器端功能的平台，如Vercel或Netlify。

## 项目开发计划

- [ ] 添加游戏历史记录保存功能
- [ ] 实现更先进的本地AI算法
- [ ] 增加更多AI提供商支持
- [ ] 添加多语言支持
- [ ] 实现棋盘主题自定义

## 贡献

欢迎提交Issue和Pull Request来改进此项目！如果您有任何想法或发现了bug，请在GitHub仓库上提交。

## 许可证

[MIT License](./LICENSE) 