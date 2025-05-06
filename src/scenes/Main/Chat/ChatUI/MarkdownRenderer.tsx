import { Box } from "@mui/material";
import { useRef, useState, useEffect, useMemo } from "react";
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import * as React from 'react';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  isConnecting?: boolean;
  streamContent?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
  isConnecting = false,
  streamContent = ""
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const markdownContainerRef = useRef<HTMLDivElement>(null);
  const codeBlockIdRef = useRef(0);

  // Generate unique ID for each code block
  const getNextCodeBlockId = () => `codeblock-${content.length}-${Date.now()}-${codeBlockIdRef.current++}`;

  // Determine what text to display
  const displayText = isStreaming
    ? streamContent || ""
    : content;

  // Initialize markdown-it with options
  const md = useMemo(() => {
    const mdInstance = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
      typographer: true
    });

    // Custom rendering for code blocks with highlight.js
    mdInstance.renderer.rules.fence = (tokens, idx, options, env, slf) => {
      const token = tokens[idx];
      const language = token.info.trim() || '';
      const codeBlockId = getNextCodeBlockId();
      const content = token.content;
      const isPython = language.toLowerCase() === 'python';

      let highlighted;
      try {
        if (language && hljs.getLanguage(language)) {
          highlighted = hljs.highlight(content, { language }).value;
        } else {
          highlighted = hljs.highlightAuto(content).value;
        }
      } catch (e) {
        highlighted = mdInstance.utils.escapeHtml(content);
      }

      // Include the SVG directly in the HTML to reduce DOM manipulations
      return `
        <div class="code-block-wrapper ${isPython ? 'python-code' : ''}" data-id="${codeBlockId}">
          <div class="language-label">${language || 'plaintext'}</div>
          <div class="copy-button-container" data-id="${codeBlockId}">
            <button class="copy-button" data-id="${codeBlockId}" aria-label="Copy code" onclick="document.dispatchEvent(new CustomEvent('onlysaid-copy', {detail: '${codeBlockId}'}))">
              <svg class="copy-icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>
              <span class="copy-text">Copied!</span>
            </button>
          </div>
          <div class="code-scroll-container">
            <pre class="language-${language}" data-id="${codeBlockId}"><code>${highlighted}</code></pre>
          </div>
        </div>
      `;
    };

    // Override image renderer to handle broken images
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
            src="${mdInstance.utils.escapeHtml(src)}"
            alt="${mdInstance.utils.escapeHtml(alt)}"${title}
            onerror="this.classList.add('image-error'); this.parentNode.classList.add('image-container-error')"
          />
          <span class="image-error-message">Image not available</span>
        </span>
      `;
    };

    // Override link renderer to make links open externally
    mdInstance.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
      const token = tokens[idx];
      if (!token.attrs) token.attrs = [];

      // Add target="_blank" and rel="noopener noreferrer" for security
      token.attrPush(['target', '_blank']);
      token.attrPush(['rel', 'noopener noreferrer']);

      return slf.renderToken(tokens, idx, options);
    };

    return mdInstance;
  }, []);

  // Process markdown content
  const htmlContent = useMemo(() => md.render(displayText), [displayText, md]);

  // Setup interactivity for code blocks using custom event approach
  useEffect(() => {
    const handleCopyEvent = (e: CustomEvent) => {
      const id = e.detail;
      if (!id || !markdownContainerRef.current) return;

      const wrapper = markdownContainerRef.current.querySelector(`.code-block-wrapper[data-id="${id}"]`) as HTMLElement;
      if (!wrapper) return;

      const pre = wrapper.querySelector('pre');
      if (!pre) return;

      const code = pre.querySelector('code');
      const text = code?.textContent || pre.textContent || '';

      // Use fallback copy method
      try {
        // Try the clipboard API first
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
          })
          .catch(err => {
            // Fallback to document.execCommand
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
              const successful = document.execCommand('copy');
              document.body.removeChild(textArea);

              if (successful) {
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 2000);
              }
            } catch (execError) {
              console.error('execCommand error:', execError);
              document.body.removeChild(textArea);
            }
          });
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    };

    // Add event listener to document for copy events
    document.addEventListener('onlysaid-copy', handleCopyEvent as EventListener);

    return () => {
      document.removeEventListener('onlysaid-copy', handleCopyEvent as EventListener);
    };
  }, []); // No dependencies means this only runs once on mount

  // Handle copy success state separately
  useEffect(() => {
    if (!markdownContainerRef.current || !copiedId) return;

    const copiedButton = markdownContainerRef.current.querySelector(`.copy-button[data-id="${copiedId}"]`);
    if (copiedButton) {
      const copyText = copiedButton.querySelector('.copy-text');
      if (copyText) {
        (copyText as HTMLElement).style.display = 'inline-block';
      }
      const copyIcon = copiedButton.querySelector('.copy-icon');
      if (copyIcon) {
        copyIcon.classList.add('check-icon');
        copyIcon.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>';
      }
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
            copyIcon.innerHTML = '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>';
          }
        }
      }
    };
  }, [copiedId]);

  // Click handler to clear highlight/copy when clicking outside
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Box
      ref={markdownContainerRef}
      className="markdown-body"
      sx={{
        color: "text.secondary",
        fontSize: "0.95rem",
        maxWidth: "100%",
        minHeight: displayText.trim() === "" ? "1.5rem" : "auto",
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
          my: 1.2, // Increased vertical margin
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
        },
        '& .python-code': {
          '& pre': {
            paddingTop: 2.5, // More space for Python code
            paddingBottom: 1.5,
            maxHeight: 'none', // Remove max height restriction for Python
          },
          '& .language-label': {
            backgroundColor: 'rgba(53, 114, 165, 0.1)', // Python blue tint
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
          opacity: isStreaming && isConnecting && !streamContent ? 0 : 1,
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
            height: '8px', // Slightly larger scrollbar
            backgroundColor: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'action.hover',
            borderRadius: '4px'
          }
        },
        '& pre': {
          p: 1.2, // Increased overall padding
          pt: 2, // Increased top padding
          pb: 1.2, // Increased bottom padding
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
          fontSize: "0.9rem", // Slightly larger font size
          lineHeight: 1.6, // Increased line height for better readability
          p: 0,
          m: 0,
          color: "text.primary",
          whiteSpace: "pre", // No wrapping
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
        },
        '& .image-container-error': {
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
        '& .image-error': {
          display: 'none',
        },
        '& .image-error-message': {
          display: 'none',
          color: 'text.disabled',
          fontSize: '0.85rem',
          fontStyle: 'italic',
          textAlign: 'center',
        },
        '& .image-container-error .image-error-message': {
          display: 'block',
        },
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent || '<p>&nbsp;</p>' }}
      onClick={handleClick}
    />
  );
};

export default MarkdownRenderer;