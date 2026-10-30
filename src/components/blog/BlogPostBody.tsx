import type { BlogBlock } from "../../domain/blog";

export function BlogPostBody({ blocks }: { blocks: readonly BlogBlock[] }) {
  return (
    <div className="mt-10 space-y-6">
      {blocks.map((block, index) => (
        <BlogBlockView key={`${block.kind}-${index}`} block={block} />
      ))}
    </div>
  );
}

function BlogBlockView({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "heading":
      return (
        <h2 className="landing-display pt-4 text-2xl font-semibold leading-snug">{block.text}</h2>
      );
    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[17px] leading-relaxed">
              <span
                aria-hidden
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--landing-ink)]/40"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-[var(--landing-ink)] pl-5 text-lg italic leading-relaxed text-[var(--landing-mute)]">
          {block.text}
        </blockquote>
      );
    case "callout":
      return (
        <aside className="rounded-[var(--radius)] border border-[var(--landing-rule)] bg-[var(--landing-sheet)] p-5">
          <p className="landing-display text-sm font-semibold">{block.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--landing-mute)]">
            {block.text}
          </p>
        </aside>
      );
    default:
      return <p className="text-[17px] leading-relaxed">{block.text}</p>;
  }
}
