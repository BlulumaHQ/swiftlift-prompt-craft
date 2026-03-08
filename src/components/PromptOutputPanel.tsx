import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  title: string;
  content: string;
}

export default function PromptOutputPanel({ title, content }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prompt-output flex-1 flex flex-col min-h-0">
      <div className="prompt-output-header">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {content && (
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        )}
      </div>
      <div className="prompt-output-body flex-1">
        {content ? (
          <pre className="whitespace-pre-wrap break-words">{content}</pre>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
            Prompt output will appear here after generation.
          </div>
        )}
      </div>
    </div>
  );
}
