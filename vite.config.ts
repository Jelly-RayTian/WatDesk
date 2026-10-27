import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'dist',emptyOutDir:true,rollupOptions:{input:{app:'index.html',offscreen:'offscreen.html'}}}});
