'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize once
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
}

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // mermaid.render returns { svg, bindFunctions } in newer versions
        const { svg } = await mermaid.render(id, chart);
        
        if (mounted) {
          setSvg(svg);
          setError(null);
        }
      } catch (err: any) {
        console.error('Mermaid rendering failed:', err);
        if (mounted) {
          setError(err.message || 'Syntax error in graph');
        }
      }
    };

    if (chart) {
      renderChart();
    }

    return () => {
      mounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 my-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
        <p className="font-semibold">Mermaid Diagram Error:</p>
        <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
        <pre className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">{chart}</pre>
      </div>
    );
  }

  return (
    <div 
      className="mermaid my-6 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
