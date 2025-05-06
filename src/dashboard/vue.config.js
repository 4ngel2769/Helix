const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // Set the public path if your dashboard is not served from the root
  // publicPath: process.env.NODE_ENV === 'production' ? '/dashboard/' : '/',
  
  // Configure the dev server
  devServer: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  // Add pages configuration to specify the entry point
  pages: {
    index: {
      entry: 'client/main.ts',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Helix Dashboard'
    }
  }
})