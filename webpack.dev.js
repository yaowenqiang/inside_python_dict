const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'cheap-module-eval-source-map',
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/autogenerated/chapter1.html',
            filename: 'chapter1.html',
        }),
        new HtmlWebpackPlugin({
            template: 'src/autogenerated/chapter2.html',
            filename: 'chapter2.html',
        }),
        new HtmlWebpackPlugin({
            template: 'src/autogenerated/chapter3.html',
            filename: 'chapter3.html',
        }),
        new HtmlWebpackPlugin({
            template: 'src/autogenerated/chapter4.html',
            filename: 'chapter4.html',
        }),
    ],
    devServer: {
        contentBase: './dist',
    },
});
