import { Box } from "@mui/material";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import MarkdownIt from 'markdown-it';
import markdownItKatex from '@iktakahiro/markdown-it-katex';
import hljs from 'highlight.js';
import * as React from 'react';
import { toast } from "@/utils/toast";
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';

// Optimized styles - reduced nesting and simplified selectors
const markdownStyles = {
  color: "text.secondary",
  fontSize: "0.95rem",
  maxWidth: "100%",
  minHeight: "auto",
  contain: "layout style",
  willChange: "contents",
  '& p': { 
    mb: 0.3, 
    mt: 0.3, 
    whiteSpace: "pre-line", 
    fontSize: "0.95rem", 
    color: "text.secondary",
    lineHeight: 1.5
  },
  '& h1, & h2, & h3': { 
    fontWeight: 600,
    mb: 0.4,
    mt: 0.4,
    lineHeight: 1.3
  },
  '& h1': { fontSize: '1.25rem' },
  '& h2': { fontSize: '1.15rem' },
  '& h3': { fontSize: '1.1rem' },
  '& ul, & ol': {
    paddingLeft: '1em',
    margin: '0.3rem 0',
  },
  '& ul': { listStyleType: 'disc' },
  '& ol': { listStyleType: 'decimal' },
  '& li': {
    marginBottom: 0.1,
    fontSize: '0.95rem',
    display: 'list-item',
    lineHeight: 1.4,
    '& p': { margin: 0 }
  },
  '& a': {
    color: "primary.main",
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" }
  },
  '& blockquote': {
    borderLeft: '4px solid',
    borderColor: 'divider',
    pl: 1.5,
    py: 0.3,
    my: 0.5,
    color: 'text.secondary',
    fontStyle: 'italic',
    bgcolor: 'action.hover',
    borderRadius: '0 4px 4px 0'
  },
  '& code:not(pre code)': {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    bgcolor: "rgba(0, 0, 0, 0.04)",
    p: 0.3,
    borderRadius: 0.5
  },
  '& .code-block-wrapper': {
    position: 'relative',
    my: 1.2,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: 'divider',
    contain: 'layout',
  },
  '& .language-label': {
    position: 'absolute',
    top: 0,
    left: 0,
    fontSize: '0.7rem',
    color: 'text.secondary',
    px: 1,
    py: 0.2,
    zIndex: 1,
    fontFamily: 'monospace',
    fontWeight: 600,
    textTransform: 'uppercase',
    pointerEvents: 'none'
  },
  '& .copy-button-container': {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 2,
    opacity: 1,
    transition: 'opacity 0.15s ease',
    display: 'flex',
    gap: '4px', // Add gap between buttons
  },
  '& .copy-button, & .apply-button': {
    minWidth: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '12px',
    backgroundColor: 'action.hover',
    border: 'none',
    padding: '4px',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: 'action.selected',
      '& .copy-icon, & .apply-icon': {
        color: 'primary.main'
      }
    }
  },
  '& .apply-button': {
    backgroundColor: 'success.light',
    '&:hover': {
      backgroundColor: 'success.main',
      '& .apply-icon': {
        color: 'success.contrastText'
      }
    }
  },
  '& .copy-icon, & .apply-icon': {
    width: 16,
    height: 16,
    color: 'text.secondary'
  },
  '& .apply-icon': {
    color: 'success.contrastText'
  },
  '& .copy-text': {
    display: 'none',
    fontSize: '10px',
    marginLeft: '4px',
    color: 'success.main',
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  '& .copy-icon': {
    width: 16,
    height: 16,
    color: 'action.active'
  },
  '& .code-scroll-container': {
    overflowX: "auto",
    maxWidth: "100%",
    '&::-webkit-scrollbar': {
      height: '6px',
      backgroundColor: 'transparent'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'action.hover',
      borderRadius: '3px'
    }
  },
  '& pre': {
    p: 1.2,
    pt: 2,
    pb: 1.2,
    borderRadius: 0,
    width: "fit-content",
    minWidth: "100%",
    margin: 0,
    bgcolor: 'background.paper',
    border: 'none',
    fontOptimization: 'optimizeSpeed',
    textRendering: 'optimizeSpeed'
  },
  '& pre code': {
    display: "block",
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    p: 0,
    m: 0,
    color: "text.primary",
    whiteSpace: "pre",
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    my: 1,
    border: '1px solid',
    borderColor: 'divider'
  },
  '& th, & td': {
    border: '1px solid',
    borderColor: 'divider',
    p: 0.5,
    textAlign: 'left'
  },
  '& th': {
    bgcolor: 'action.hover',
    fontWeight: 600
  },
  '& .image-container': {
    display: 'inline-block',
    position: 'relative',
    maxWidth: '100%',
    margin: '0.5rem 0',
    minHeight: '100px',
  },
  '& .image-container[data-error="true"]': {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed',
    borderColor: 'divider',
    borderRadius: 1,
    padding: '1rem',
    margin: '0.5rem 0',
    minWidth: '150px',
    minHeight: '100px',
    maxWidth: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  '& .image-error-message': {
    display: 'none',
    color: 'text.disabled',
    fontSize: '0.85rem',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  '& .image-container[data-error="true"] .image-error-message': {
    display: 'block',
  },
  
  // Enhanced mathematical expressions styling
  '& sub': {
    fontSize: '0.85em !important',
    lineHeight: '1 !important',
    verticalAlign: 'sub',
    fontWeight: 'inherit'
  },
  '& sup': {
    fontSize: '0.85em !important', 
    lineHeight: '1 !important',
    verticalAlign: 'super',
    fontWeight: 'inherit'
  },
  '& span[style*="font-size: 1.1em"]': {
    fontWeight: '600 !important',
    display: 'inline-block'
  },
  // Mathematical formulas get Times New Roman for better readability
  '& span[style*="Times New Roman"]': {
    fontFamily: '"Times New Roman", "Times", serif !important',
    fontSize: '1.05em !important',
    fontWeight: '500 !important',
    letterSpacing: '0.02em'
  },
};

const COPY_SVG_PATH = 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z';
const APPLY_SVG_PATH = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'; // Checkmark icon

// Optimized cache with size limit
const highlightCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  isConnecting?: boolean;
  streamContent?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({
  content,
  isStreaming = false,
  isConnecting = false,
  streamContent = ""
}) => {
  const markdownContainerRef = useRef<HTMLDivElement>(null);
  const codeBlockIdRef = useRef(0);
  
  // Simplified state management
  const markdownToRender = useMemo(() => {
    if (isStreaming) {
      return typeof streamContent === 'string' ? streamContent : JSON.stringify(streamContent);
    }
    return typeof content === 'string' ? content : `[DEBUG: content was ${typeof content}]`;
  }, [isStreaming, streamContent, content]);

  const instanceId = useMemo(() => `md-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, []);

  const getNextCodeBlockId = useCallback(() => {
    return `${instanceId}-cb-${codeBlockIdRef.current++}`;
  }, [instanceId]);

  // Check if we're in copilot mode
  const isCopilotMode = useTopicStore((state) => state.selectedContext?.section === 'local:copilot');
  const { currentDocument } = useCopilotStore();

  // Optimized markdown instance with better caching
  const md = useMemo(() => {
    const mdInstance = new MarkdownIt({
      html: true, // Enable HTML for enhanced mathematical expressions
      breaks: true,
      linkify: true,
      typographer: false // Disable for better performance
    });

    mdInstance.use(markdownItKatex, {
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false,
      trust: true,
      output: 'html'
    }); // Add KaTeX plugin with configuration

    mdInstance.renderer.rules.fence = (tokens, idx) => {
      const token = tokens[idx];
      const language = token.info.trim() || '';
      const codeBlockId = getNextCodeBlockId();
      const codeContent = token.content;
      const cacheKey = `${language}:${codeContent.substring(0, 100)}:${codeContent.length}`;

      let highlighted = highlightCache.get(cacheKey);
      
      if (!highlighted) {
        try {
          if (language && hljs.getLanguage(language)) {
            highlighted = hljs.highlight(codeContent, { language }).value;
          } else {
            highlighted = hljs.highlightAuto(codeContent).value;
          }
          
          // Manage cache size
          if (highlightCache.size >= MAX_CACHE_SIZE) {
            const firstKey = highlightCache.keys().next().value;
            if (firstKey) {
              highlightCache.delete(firstKey);
            }
          }
          highlightCache.set(cacheKey, highlighted);
        } catch (e) {
          highlighted = mdInstance.utils.escapeHtml(codeContent);
        }
      }

      // Generate buttons based on mode
      const copyButton = `
        <button class="copy-button" data-id="${codeBlockId}" aria-label="Copy code" onclick="document.dispatchEvent(new CustomEvent('onlysaid-copy', {detail: '${codeBlockId}'}))">
          <svg class="copy-icon" viewBox="0 0 24 24"><path d="${COPY_SVG_PATH}"></path></svg>
        </button>
      `;

      const applyButton = isCopilotMode && currentDocument ? `
        <button class="apply-button" data-id="${codeBlockId}" data-language="${language}" aria-label="Apply code" onclick="document.dispatchEvent(new CustomEvent('onlysaid-apply', {detail: '${codeBlockId}'}))">
          <svg class="apply-icon" viewBox="0 0 24 24"><path d="${APPLY_SVG_PATH}"></path></svg>
        </button>
      ` : '';

      return `<div class="code-block-wrapper" data-id="${codeBlockId}">
        <div class="language-label">${language || 'text'}</div>
        <div class="copy-button-container" data-id="${codeBlockId}">
          ${applyButton}${copyButton}
        </div>
        <div class="code-scroll-container">
          <pre class="language-${language}" data-id="${codeBlockId}"><code>${highlighted}</code></pre>
        </div>
      </div>`;
    };

    mdInstance.renderer.rules.image = (tokens, idx) => {
      const token = tokens[idx];
      const attrs = token.attrs || [];
      const srcIndex = token.attrIndex('src');
      const src = srcIndex >= 0 && attrs[srcIndex] ? attrs[srcIndex][1] : '';
      const altIndex = token.attrIndex('alt');
      const alt = altIndex >= 0 && attrs[altIndex] ? attrs[altIndex][1] : '';
      const titleIndex = token.attrIndex('title');
      const title = titleIndex >= 0 && attrs[titleIndex] ? ` title="${mdInstance.utils.escapeHtml(attrs[titleIndex][1])}"` : '';

      return `<span class="image-container">
        <img loading="lazy" src="${mdInstance.utils.escapeHtml(src)}" alt="${mdInstance.utils.escapeHtml(alt)}"${title} onerror="this.style.display='none'; this.parentNode.setAttribute('data-error', 'true')" />
        <span class="image-error-message">Image not available</span>
      </span>`;
    };

    mdInstance.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
      const token = tokens[idx];
      if (!token.attrs) token.attrs = [];
      token.attrPush(['target', '_blank']);
      token.attrPush(['rel', 'noopener noreferrer']);
      return slf.renderToken(tokens, idx, options);
    };

    return mdInstance;
  }, [getNextCodeBlockId, isCopilotMode, currentDocument]);

  // Optimized HTML rendering with debouncing for streaming
  const html = useMemo(() => {
    return md.render(markdownToRender || "");
  }, [md, markdownToRender]);

  // Simplified copy functionality with toast
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.cssText = 'position:fixed;left:-999px;top:-999px;opacity:0;';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }, []);

  // Add apply functionality
  const applyCodeToFile = useCallback(async (code: string): Promise<boolean> => {
    if (!isCopilotMode || !currentDocument) {
      toast.error('Apply is only available in copilot mode');
      return false;
    }

    try {
      // Check if DocumentPreview component exists and has content change handler
      const event = new CustomEvent('onlysaid-apply-code', {
        detail: { code, documentPath: currentDocument.path }
      });
      
      // Dispatch event that CopilotView can listen to
      document.dispatchEvent(event);
      
      toast.success('Code applied to file');
      return true;
    } catch (error) {
      console.error('Failed to apply code:', error);
      toast.error('Failed to apply code to file');
      return false;
    }
  }, [isCopilotMode, currentDocument]);

  useEffect(() => {
    const handleCopyEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = customEvent.detail;
      if (!id || !markdownContainerRef.current) return;

      const wrapper = markdownContainerRef.current.querySelector(`.code-block-wrapper[data-id="${id}"]`) as HTMLElement;
      if (!wrapper) return;

      const code = wrapper.querySelector('code');
      const text = code?.textContent || '';

      const success = await copyToClipboard(text);
      if (success) {
        toast.success('Code copied to clipboard');
      } else {
        toast.error('Failed to copy code');
      }
    };

    const handleApplyEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = customEvent.detail;
      if (!id || !markdownContainerRef.current) return;

      const wrapper = markdownContainerRef.current.querySelector(`.code-block-wrapper[data-id="${id}"]`) as HTMLElement;
      if (!wrapper) return;

      const code = wrapper.querySelector('code');
      const text = code?.textContent || '';
      
      // Get the language from the button or language label
      const applyButton = wrapper.querySelector('.apply-button') as HTMLElement;
      const languageLabel = wrapper.querySelector('.language-label') as HTMLElement;
      const language = applyButton?.dataset?.language || languageLabel?.textContent || '';
      
      // Reconstruct the proper format for DOCX patches
      let formattedCode = text;
      if (language && ['docx-structure-patch', 'docx-patch', 'anchor-patch', 'docx-content'].includes(language.toLowerCase())) {
        formattedCode = `\`\`\`${language}\n${text}\n\`\`\``;
        console.log('🔧 [APPLY] Reconstructed code block format:', formattedCode.substring(0, 100) + '...');
      }

      await applyCodeToFile(formattedCode);
    };

    document.addEventListener('onlysaid-copy', handleCopyEvent);
    document.addEventListener('onlysaid-apply', handleApplyEvent);
    
    return () => {
      document.removeEventListener('onlysaid-copy', handleCopyEvent);
      document.removeEventListener('onlysaid-apply', handleApplyEvent);
    };
  }, [copyToClipboard, applyCodeToFile]);

  // Simplified dynamic styles
  const dynamicStyles = useMemo(() => ({
    ...markdownStyles,
    minHeight: markdownToRender.trim() === "" ? "1.5rem" : "auto",
    '& .copy-button-container': {
      ...markdownStyles['& .copy-button-container'],
      opacity: isStreaming && isConnecting && !streamContent ? 0.3 : 1,
    }
  }), [markdownToRender, isStreaming, isConnecting, streamContent]);

  return (
    <Box
      ref={markdownContainerRef}
      className="markdown-body"
      sx={dynamicStyles}
    >
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        data-is-streaming={isStreaming}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming ||
      prevProps.isConnecting !== nextProps.isConnecting) {
    return false;
  }

  if (nextProps.isStreaming) {
    return prevProps.streamContent === nextProps.streamContent;
  } else {
    return prevProps.content === nextProps.content;
  }
});

export default MarkdownRenderer;