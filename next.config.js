/** @type {import('next').NextConfig} */
const nextConfig = {
  // 在生产环境中使用静态导出，适用于GitHub Pages
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    basePath: '/Web_Gobang',
    images: {
      unoptimized: true,
    },
  }),
  // 在开发环境中不使用静态导出，这样API路由可以工作
  ...(process.env.NODE_ENV !== 'production' && {
    // 开发环境不需要特殊配置
  }),
};

module.exports = nextConfig; 