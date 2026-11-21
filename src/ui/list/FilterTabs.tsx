import { Link } from '@tanstack/react-router';
import type { StatusFilter } from '../../domain/selectors';
import styles from './ListView.module.css';

const LABELS: Record<StatusFilter, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
};

export interface FilterTabsProps {
  counts: Readonly<Record<StatusFilter, number>>;
}

/**
 * The All / Active / Completed filter (FR-9). Each option is a link that sets
 * `?status=` in the URL, so the filter survives a reload and works with the
 * Back button.
 */
export function FilterTabs({ counts }: FilterTabsProps) {
  return (
    <nav aria-label="Filter todos" className={styles.filters}>
      {(['active', 'completed', 'all'] as const).map((status) => (
        <Link
          key={status}
          to="/"
          search={{ status }}
          className={styles.filter}
          // Compare the whole search, not a partial match. Otherwise the Active
          // link (whose URL is just "/") also counts as active on "/?status=all".
          // When active, Link sets aria-current="page" itself.
          activeOptions={{ exact: true }}
        >
          {LABELS[status]} <span className={styles.count}>{counts[status]}</span>
        </Link>
      ))}
    </nav>
  );
}
