import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.qa-cache/**', 'outputs/**'] },
  ...tseslint.configs.recommended,
);
