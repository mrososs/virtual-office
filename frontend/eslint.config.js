import vueTsEslintConfig from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  {
    rules: {
      // TODO: tighten once the codebase grows past scaffolding.
      'vue/multi-word-component-names': 'off',
      // Layout-only rules: templates use a compact one-element-per-line style
      // (short elements and their attributes stay on one line).
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
];
