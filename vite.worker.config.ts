import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'dist',emptyOutDir:false,lib:{entry:'src/background/worker.ts',formats:['es'],fileName:()=> 'worker.js'},rollupOptions:{output:{inlineDynamicImports:true}}}});
