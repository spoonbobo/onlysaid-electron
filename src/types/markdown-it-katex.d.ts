declare module '@iktakahiro/markdown-it-katex' {
  import { PluginSimple } from 'markdown-it';
  
  interface KatexOptions {
    throwOnError?: boolean;
    errorColor?: string;
    strict?: boolean;
    trust?: boolean;
    output?: string;
  }
  
  const markdownItKatex: PluginSimple & {
    (md: any, options?: KatexOptions): void;
  };
  
  export = markdownItKatex;
} 