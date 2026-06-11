import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface Props {
  source: string;
}

export default function MarkdownReadme({ source }: Props) {
  if (!source) {
    return (
      <p className="text-text-muted italic">
        No README found in this skill's GitHub repo.
      </p>
    );
  }
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
