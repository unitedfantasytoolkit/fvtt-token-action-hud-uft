import { terser } from 'rollup-plugin-terser'
import multi from '@rollup/plugin-multi-entry'
import livereload from 'rollup-plugin-livereload';

const isWatchMode = !!process.env.ROLLUP_WATCH;

export default [
  {
    input: {
      include: [
        'scripts/*.js',
        'scripts/*/*.js'
      ],
      exclude: [
        'scripts/token-action-hud-template.min.js']
    },
    output: {
      format: 'esm',
      file: 'scripts/token-action-hud-template.min.js'
    },
    plugins: [
      terser({ keep_classnames: true, keep_fnames: true }),
      multi(),
      isWatchMode && livereload({
        port: 9999
      }),
    ]
  }
]
