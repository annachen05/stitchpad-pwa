// eslint.config.cjs
const vue = require('eslint-plugin-vue')

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ['**/*.js', '**/*.vue'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.cjs',
      'vite.config.js',
      'playwright.config.js',
      'playwright-report/**',  // Add this - ignores all Playwright reports
      'test-results/**',       // Add this - ignores test results
      'coverage/**',           // Add this - ignores coverage reports
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        
        // Web APIs
        FileReader: 'readonly',
        Blob: 'readonly',
        Image: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        
        // Node.js globals (for config files)
        process: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'writable',
      },
      parser: require('vue-eslint-parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      vue: vue,
    },
    rules: {
      // Vue rules
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/no-unused-components': 'warn',
      
      // JavaScript rules - set to 'warn' instead of 'error'
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  },
]
