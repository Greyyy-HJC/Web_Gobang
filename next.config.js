/** @type {import('next').NextConfig} */
const nextConfig = {
  // 根据环境变量决定是否输出静态文件
  ...(process.env.NODE_ENV === 'production' ? {
    output: 'export',
    images: {
      unoptimized: true,
    },
  } : {}),
  
  // basePath在生产环境下设置
  basePath: process.env.NODE_ENV === 'production' ? '/Web_Gobang' : '',
};

module.exports = nextConfig; 