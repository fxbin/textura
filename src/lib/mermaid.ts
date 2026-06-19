'use client';

import mermaid from 'mermaid';

let initialized = false;

export function normalizeMermaidDefinition(content: string) {
  return content
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\r\n?/g, '\n')
    .trim();
}

function ensureMermaidInitialized() {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });
  initialized = true;
}

export async function renderMermaidSvg(chart: string, id: string) {
  ensureMermaidInitialized();
  return mermaid.render(id, normalizeMermaidDefinition(chart));
}

export async function renderMermaidInHtml(html: string) {
  if (typeof window === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const mermaidBlocks = Array.from(doc.querySelectorAll('pre > code.language-mermaid'));

  for (let index = 0; index < mermaidBlocks.length; index += 1) {
    const block = mermaidBlocks[index];
    const preParent = block.parentElement;

    if (!preParent || preParent.tagName !== 'PRE') {
      continue;
    }

    try {
      const { svg } = await renderMermaidSvg(
        block.textContent || '',
        `preset-mermaid-${index}-${Math.random().toString(36).slice(2, 9)}`
      );
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (!svgElement) {
        continue;
      }

      svgElement.setAttribute('style', 'display:block; max-width:100%; height:auto; margin:20px auto;');
      svgElement.removeAttribute('width');
      svgElement.removeAttribute('height');

      const wrapper = doc.createElement('div');
      wrapper.className = 'mermaid-preview-block';
      wrapper.style.margin = '20px 0';
      wrapper.style.overflowX = 'auto';
      wrapper.appendChild(svgElement);
      preParent.replaceWith(wrapper);
    } catch (error) {
      const errorDiv = doc.createElement('div');
      errorDiv.className = 'mermaid-error-block';
      errorDiv.style.color = '#ef4444';
      errorDiv.style.fontSize = '12px';
      errorDiv.style.padding = '8px';
      errorDiv.style.marginTop = '4px';
      errorDiv.style.backgroundColor = '#fef2f2';
      errorDiv.style.borderRadius = '4px';
      errorDiv.style.border = '1px solid #fee2e2';
      errorDiv.textContent = `Mermaid Error: ${error instanceof Error ? error.message : 'Syntax error'}`;
      preParent.replaceWith(errorDiv);
    }
  }

  return doc.body.innerHTML;
}
