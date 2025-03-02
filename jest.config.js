/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#ansi-styles$': '<rootDir>/node_modules/chalk/source/vendor/ansi-styles/index.js',
    '^#supports-color$': '<rootDir>/node_modules/chalk/source/vendor/supports-color/index.js',
    '^#is-fullwidth-code-point$': '<rootDir>/node_modules/chalk/source/vendor/is-fullwidth-code-point/index.js',
    '^#emoji-regex$': '<rootDir>/node_modules/chalk/source/vendor/emoji-regex/index.js'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ansi-styles|supports-color|is-fullwidth-code-point|emoji-regex)/)',
  ]
};