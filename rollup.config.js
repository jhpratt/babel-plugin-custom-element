import typescript from 'rollup-plugin-typescript';

export default {
    input: './src/index.ts',
    plugins: [typescript()],
    output: {
        format: 'cjs',
        file: 'bundle.js',
    },
};
