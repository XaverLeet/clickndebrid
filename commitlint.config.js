export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Relaxed rules for body content
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [1, 'always', 500], // Increased to 500, warning level
    
    // Relaxed rules for footer content
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [1, 'always', 500], // Increased to 500, warning level
    
    // Increased header length and changed to warning
    'header-max-length': [1, 'always', 300], // Increased to 300, changed to warning level
    
    // Rules for subject formatting
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    
    // Rules for type formatting
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'security', // Added security type
        'deps',     // Added dependencies type
      ],
    ],
  },
};
