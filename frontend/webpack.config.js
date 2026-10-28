const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const readManualUrlsFromConfigFile = () => {
  try {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'public/smartq-config.js'),
      'utf8'
    );
    const apiMatch = source.match(/apiUrl\s*=\s*["']([^"']+)["']/);
    const mlMatch = source.match(/mlUrl\s*=\s*["']([^"']+)["']/);
    return {
      api: apiMatch ? apiMatch[1].replace(/\/+$/, '') : '',
      ml: mlMatch ? mlMatch[1].replace(/\/+$/, '') : '',
    };
  } catch {
    return { api: '', ml: '' };
  }
};

class SmartQRuntimeConfigPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('SmartQRuntimeConfigPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'SmartQRuntimeConfigPlugin',
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        () => {
          const manual = readManualUrlsFromConfigFile();
          const apiFromEnv = String(process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
          const mlFromEnv = String(process.env.REACT_APP_ML_URL || '').replace(/\/+$/, '');
          const apiUrl = apiFromEnv || manual.api;
          const mlUrl = mlFromEnv || manual.ml;
          const content = [
            '/* Smart\'Q runtime config — generated at build */',
            `window.__SMARTQ_API_URL__=${JSON.stringify(apiUrl)};`,
            `window.__SMARTQ_ML_BASE_URL__=${JSON.stringify(mlUrl)};`,
            '',
          ].join('\n');
          compilation.emitAsset(
            'smartq-config.js',
            new webpack.sources.RawSource(content)
          );
        }
      );
    });
  }
}

module.exports = {
  entry: './src/index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: 'auto',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
          },
        },
      },

      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },

      // allow images to load
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || ''),
      'process.env.REACT_APP_ML_URL': JSON.stringify(process.env.REACT_APP_ML_URL || ''),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      templateParameters: {
        SMARTQ_API_URL: process.env.REACT_APP_API_URL || readManualUrlsFromConfigFile().api || '',
        SMARTQ_ML_URL: process.env.REACT_APP_ML_URL || readManualUrlsFromConfigFile().ml || '',
      },
    }),
    new SmartQRuntimeConfigPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist'),
          globOptions: {
            ignore: ['**/index.html', '**/smartq-config.js'],
          },
        },
      ],
    }),
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api', '/socket.io'],
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
