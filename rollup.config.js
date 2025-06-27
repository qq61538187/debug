import { readFileSync } from 'node:fs';
import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const pkgName = packageJson.umdModuleName;
export default {
	input: 'src/index.ts',
	output: [
		{
			file: 'dist/esm/index.js',
			format: 'esm',
		},
		{
			file: 'dist/cjs/index.js',
			format: 'cjs',
		},
		{
			file: 'dist/umd/index.js',
			format: 'umd',
			name: pkgName,
			globals: {},
		},
		{
			file: 'dist/bundle/index.js',
			format: 'iife',
			name: pkgName,
		},
	],
	plugins: [
		terser(),
		typescript({
			tsconfig: './tsconfig.json',
		}),
		alias({
			resolve: ['.js'],
		}),
		resolve(),
	],
};
