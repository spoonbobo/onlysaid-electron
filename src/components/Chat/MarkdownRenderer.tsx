import { Box } from "@mui/material";
import { useRef, useState, useEffect, useMemo, useCallback, useTransition } from "react";
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import * as React from 'react';
import { equals } from 'ramda';

const markdownStyles = {
    color: "text.secondary",
    fontSize: "0.95rem",
    maxWidth: "100%",
    minHeight: "auto",
    contain: "content",
    '& p': { mb: 0.3, mt: 0.3, whiteSpace: "pre-line", fontSize: "0.95rem", color: "text.secondary" },
    '& h1': { fontSize: '1.25rem', mb: 0.5, mt: 0.5, fontWeight: 600 },
    '& h2': { fontSize: '1.15rem', mb: 0.5, mt: 0.5, fontWeight: 600 },
    '& h3': { fontSize: '1.1rem', fontWeight: 600, mb: 0.3, mt: 0.3 },
    '& ul': {
        paddingLeft: '1em',
        marginTop: 0.3,
        marginBottom: 0.3,
        listStyleType: 'disc'
    },
    '& ol': {
        paddingLeft: '1em',
        marginTop: 0.3,
        marginBottom: 0.3,
        listStyleType: 'decimal'
    },
    '& li': {
        marginBottom: 0.1,
        fontSize: '0.95rem',
        display: 'list-item'
    },
    '& li p': {
        margin: 0
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
        contain: 'content',
    },
    '& .python-code': {
        '& pre': {
            paddingTop: 2.5,
            paddingBottom: 1.5,
            maxHeight: 'none',
        },
        '& .language-label': {
            backgroundColor: 'rgba(53, 114, 165, 0.1)',
        }
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
        textTransform: 'uppercase'
    },
    '& .copy-button-container': {
        position: 'absolute',
        top: 2,
        right: 2,
        zIndex: 2,
        opacity: 1,
        transition: 'opacity 0.2s ease',
    },
    '& .copy-button': {
        minWidth: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid',
        borderColor: 'divider',
        padding: '0 8px',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            transform: 'scale(1.05)'
        }
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
        color: 'text.secondary'
    },
    '& .check-icon': {
        color: 'success.main'
    },
    '& .code-scroll-container': {
        overflowX: "auto",
        maxWidth: "100%",
        '&::-webkit-scrollbar': {
            height: '8px',
            backgroundColor: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'action.hover',
            borderRadius: '4px'
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
    },
    '& pre code': {
        display: "block",
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        fontSize: "0.9rem",
        lineHeight: 1.6,
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
    '@keyframes fadeInUpWord': {
        'from': { opacity: 0, transform: 'translateY(8px)' },
        'to': { opacity: 1, transform: 'translateY(0)' },
    },
    '.streamed-word': {
        display: 'inline-block',
        opacity: 0,
        animation: '$fadeInUpWord 0.25s ease-out forwards',
        willChange: 'opacity, transform',
    },
};

const COPY_SVG_PATH = 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z';
const CHECK_SVG_PATH = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z';

const highlightCache = new Map<string, string>();

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
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const markdownContainerRef = useRef<HTMLDivElement>(null);
    const codeBlockIdRef = useRef(0);
    const [markdownToRender, setMarkdownToRender] = useState(() => isStreaming ? (streamContent || "") : content);
    const [isPending, startTransition] = useTransition();

    const getNextCodeBlockId = useCallback(() => {
        const id = `codeblock-${codeBlockIdRef.current++}`;
        return id;
    }, []);

    useEffect(() => {
        if (isStreaming) {
            if (typeof streamContent === 'object') {
                console.error('Received object in streamContent:', streamContent);
                startTransition(() => {
                    setMarkdownToRender(JSON.stringify(streamContent));
                });
            } else if (isStreaming) {
                startTransition(() => {
                    setMarkdownToRender(streamContent || "");
                });
            }
        } else {
            if (content !== markdownToRender) {
                if (typeof content !== 'string') {
                    console.error('[MarkdownRenderer] content prop for setMarkdownToRender (non-streaming) is NOT a string!', typeof content, content);
                    setMarkdownToRender(`[DEBUG: static content was ${typeof content}]`);
                } else {
                    setMarkdownToRender(content);
                }
            }
        }
    }, [isStreaming, streamContent, content, markdownToRender]);

    const md = useMemo(() => {
        const mdInstance = new MarkdownIt({
            html: false,
            breaks: true,
            linkify: true,
            typographer: true
        });

        mdInstance.renderer.rules.fence = (tokens, idx, options, env, slf) => {
            const token = tokens[idx];
            const language = token.info.trim() || '';
            const codeBlockId = getNextCodeBlockId();
            const content = token.content;
            const isPython = language.toLowerCase() === 'python';

            const cacheKey = `${language}:${content}`;

            let highlighted;
            try {
                if (language && hljs.getLanguage(language)) {
                    highlighted = hljs.highlight(content, { language }).value;
                } else {
                    highlighted = hljs.highlightAuto(content).value;
                }

                highlightCache.set(cacheKey, highlighted);
            } catch (e) {
                highlighted = mdInstance.utils.escapeHtml(content);
            }

            return `
        <div class="code-block-wrapper ${isPython ? 'python-code' : ''}" data-id="${codeBlockId}">
          <div class="language-label">${language || 'plaintext'}</div>
          <div class="copy-button-container" data-id="${codeBlockId}">
            <button class="copy-button" data-id="${codeBlockId}" aria-label="Copy code" onclick="document.dispatchEvent(new CustomEvent('onlysaid-copy', {detail: '${codeBlockId}'}))">
              <svg class="copy-icon" viewBox="0 0 24 24"><path d="${COPY_SVG_PATH}"></path></svg>
              <span class="copy-text">Copied!</span>
            </button>
          </div>
          <div class="code-scroll-container">
            <pre class="language-${language}" data-id="${codeBlockId}"><code>${highlighted}</code></pre>
          </div>
        </div>
      `;
        };

        mdInstance.renderer.rules.image = (tokens, idx, options, env, slf) => {
            const token = tokens[idx];
            const attrs = token.attrs || [];
            const srcIndex = token.attrIndex('src');
            const src = srcIndex >= 0 && attrs[srcIndex] ? attrs[srcIndex][1] : '';
            const altIndex = token.attrIndex('alt');
            const alt = altIndex >= 0 && attrs[altIndex] ? attrs[altIndex][1] : '';
            const titleIndex = token.attrIndex('title');
            const title = titleIndex >= 0 && attrs[titleIndex] ? ` title="${mdInstance.utils.escapeHtml(attrs[titleIndex][1])}"` : '';

            return `
    <span class="image-container">
      <img
        loading="lazy"
        src="${mdInstance.utils.escapeHtml(src)}"
        alt="${mdInstance.utils.escapeHtml(alt)}"${title}
        onerror="this.style.display='none'; this.parentNode.setAttribute('data-error', 'true')"
      />
      <span class="image-error-message">Image not available</span>
    </span>
  `;
        };

        mdInstance.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
            const token = tokens[idx];
            if (!token.attrs) token.attrs = [];

            token.attrPush(['target', '_blank']);
            token.attrPush(['rel', 'noopener noreferrer']);

            return slf.renderToken(tokens, idx, options);
        };

        return mdInstance;
    }, [getNextCodeBlockId]);

    const html = useMemo(() => {
        if (typeof markdownToRender !== 'string') {
            console.error('[MarkdownRenderer] markdownToRender is NOT a string!', typeof markdownToRender, markdownToRender);
            return md.render(`[DEBUG: markdownToRender was ${typeof markdownToRender}]`);
        }

        return md.render(markdownToRender || "");
    }, [md, markdownToRender]);

    useEffect(() => {
        const copyToClipboard = async (text: string) => {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.cssText = 'position:fixed;left:-999px;top:-999px;';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (err) {
                    document.body.removeChild(textArea);
                    return false;
                }
            }
        };

        const handleCopyEvent = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const id = customEvent.detail;
            if (!id || !markdownContainerRef.current) return;

            const wrapper = markdownContainerRef.current.querySelector(`.code-block-wrapper[data-id="${id}"]`) as HTMLElement;
            if (!wrapper) return;

            const pre = wrapper.querySelector('pre');
            if (!pre) return;

            const code = pre.querySelector('code');
            const text = code?.textContent || pre.textContent || '';

            const success = await copyToClipboard(text);
            if (success) {
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 2000);
            }
        };

        document.addEventListener('onlysaid-copy', handleCopyEvent);
        return () => {
            document.removeEventListener('onlysaid-copy', handleCopyEvent);
        };
    }, []);

    useEffect(() => {
        if (!markdownContainerRef.current || !copiedId) return;

        const copiedButton = markdownContainerRef.current.querySelector(`.copy-button[data-id="${copiedId}"]`);
        if (!copiedButton) return;

        const copyText = copiedButton.querySelector('.copy-text');
        if (copyText) {
            (copyText as HTMLElement).style.display = 'inline-block';
        }

        const copyIcon = copiedButton.querySelector('.copy-icon');
        if (copyIcon) {
            copyIcon.classList.add('check-icon');
            (copyIcon as SVGElement).innerHTML = `<path d="${CHECK_SVG_PATH}"></path>`;
        }

        return () => {
            if (markdownContainerRef.current) {
                const resetButton = markdownContainerRef.current.querySelector(`.copy-button[data-id="${copiedId}"]`);
                if (resetButton) {
                    const copyText = resetButton.querySelector('.copy-text');
                    if (copyText) {
                        (copyText as HTMLElement).style.display = 'none';
                    }
                    const copyIcon = resetButton.querySelector('.copy-icon');
                    if (copyIcon) {
                        copyIcon.classList.remove('check-icon');
                        (copyIcon as SVGElement).innerHTML = `<path d="${COPY_SVG_PATH}"></path>`;
                    }
                }
            }
        };
    }, [copiedId]);

    const dynamicStyles = useMemo(() => {
        const displayText = isStreaming ? (streamContent || "") : content;

        return {
            ...markdownStyles,
            minHeight: displayText.trim() === "" ? "1.5rem" : "auto",
            '& .copy-button-container': {
                ...markdownStyles['& .copy-button-container'],
                opacity: isStreaming && isConnecting && !streamContent ? 0 : 1,
            }
        };
    }, [isStreaming, isConnecting, streamContent, content]);

    const previousStreamedTextRef = useRef("");
    const animationIdRef = useRef(0);

    useEffect(() => {
        if (!isStreaming) {
            previousStreamedTextRef.current = "";
            return;
        }

        const currentContent = streamContent || "";

        if (markdownContainerRef.current) {
            if (currentContent !== previousStreamedTextRef.current) {
                previousStreamedTextRef.current = currentContent;
            }
        }
    }, [isStreaming, streamContent]);

    return (
        <Box
            ref={markdownContainerRef}
            className="markdown-body"
            sx={dynamicStyles}
        >
            <div
                dangerouslySetInnerHTML={{ __html: html }}
                data-is-streaming={isStreaming ? "true" : "false"}
            />
        </Box>
    );
}, (prevProps, nextProps) => {
    if (prevProps.isStreaming !== nextProps.isStreaming ||
        prevProps.isConnecting !== nextProps.isConnecting) {
        return false;
    }

    if (nextProps.isStreaming) {
        return equals(prevProps.streamContent, nextProps.streamContent);
    } else {
        return equals(prevProps.content, nextProps.content);
    }
});

export default MarkdownRenderer;