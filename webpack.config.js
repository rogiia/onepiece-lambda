module.exports = {
    entry: './lambda.js',
    output: {
        filename: 'index.js',
        libraryTarget: 'umd'
    },
    target: 'node'
}