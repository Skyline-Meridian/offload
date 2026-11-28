import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'
import betterTailwind from 'eslint-plugin-better-tailwindcss'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'dist/**', 'next-env.d.ts', 'src/generated/**', 'wp-db-export/**', 'scripts/migration/**']),
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
      // No inline styles (coding standards, styling rule 4)
      'react/forbid-dom-props': ['error', { forbid: ['style'] }],
      'react/forbid-component-props': ['error', { forbid: ['style'] }],
    },
  },
  {
    // Scripts, workers and seeds may print to the console
    files: ['scripts/**', 'worker/**', 'realtime/**', 'prisma/**', 'src/server/log.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Data and UI are separate layers: components and hooks never import server code
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/server/*', '@/server'], message: 'Components and hooks must not import server code. Pass data as props or call a Server Action.' }] },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: { 'better-tailwindcss': { entryPoint: 'src/app/globals.css' } },
    rules: {
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-restricted-classes': [
        'error',
        { restrict: [{ pattern: '\\[.+\\]', message: 'Arbitrary Tailwind values are not allowed. Add a token to globals.css instead.' }] },
      ],
    },
  },
])

export default eslintConfig
