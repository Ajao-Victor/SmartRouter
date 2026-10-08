'use client';

import { clsx } from 'clsx';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * Sanitised markdown for model output (security.md §6): raw HTML is stripped, only http(s)/mailto
 * links survive, links open in a new tab with noopener. Code blocks render in mono with a one-shot
 * scanline sweep (design.md §4.5).
 */
const schema = {
  ...defaultSchema,
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'] },
};

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-2 underline decoration-accent-2/40 underline-offset-2">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="scanline-once num my-3 overflow-x-auto rounded-md bg-bg-0/70 p-3 text-xs leading-5 text-text-0 shadow-hairline">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code className={clsx('num rounded bg-bg-0/60 px-1 py-0.5 text-[0.85em] text-accent-2-hi', className)}>{children}</code>
  ),
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  p: ({ children }) => <p className="my-2 leading-6">{children}</p>,
  h1: ({ children }) => <h3 className="font-display my-3 text-lg text-text-0">{children}</h3>,
  h2: ({ children }) => <h3 className="font-display my-3 text-base text-text-0">{children}</h3>,
  h3: ({ children }) => <h4 className="my-2 text-sm font-medium text-text-0">{children}</h4>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-accent/50 pl-3 text-text-1">{children}</blockquote>,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={clsx('max-w-[68ch] text-base text-text-0', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
