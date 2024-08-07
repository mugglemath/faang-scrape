const { ESLint } = require('eslint');

const eslint = new ESLint({
  overrideConfig: {
    plugins: {
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      semi: 'error',
      'prefer-const': 'error',
      'prettier/prettier': 'error',
    },
  },
});

module.exports = eslint;
