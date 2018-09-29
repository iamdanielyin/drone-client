process.env.VUE_APP_VERSION = require('./package.json').version
module.exports = {
  baseUrl: './',
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000/',
        changeOrigin: true
      }
    }
  }
}
