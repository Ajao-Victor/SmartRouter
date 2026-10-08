import type { Classification } from '@/lib/api/types';

import { Chip } from '@/components/ui/Chip';

/** PDF classifier output: task type · short/long · language · needs-web. */
export function ClassificationTags({ c }: { c: Classification }) {
  const tags = [c.task_type, c.complexity, c.language.toUpperCase(), ...(c.needs_web ? ['needs web'] : [])];
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Classification">
      {tags.map((t) => (
        <li key={t}>
          <Chip tone="neutral" className="pointer-events-none h-7 px-2.5 text-xs" tabIndex={-1}>
            {t}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
