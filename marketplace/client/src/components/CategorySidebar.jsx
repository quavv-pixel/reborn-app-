import { CATEGORIES } from '../lib/constants';
import CategoryIcon from './CategoryIcon';

export default function CategorySidebar({ active, onSelect, counts, total }) {
  return (
    <nav className="space-y-0.5">
      <SidebarItem
        icon="all"
        label="All listings"
        count={total}
        active={!active}
        onClick={() => onSelect('')}
      />
      {CATEGORIES.map((c) => (
        <SidebarItem
          key={c.value}
          icon={c.value}
          label={c.label}
          count={counts?.[c.value] ?? 0}
          active={active === c.value}
          onClick={() => onSelect(c.value)}
        />
      ))}
    </nav>
  );
}

function SidebarItem({ icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <CategoryIcon name={icon} className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && (
        <span className={`text-xs tabular-nums ${active ? 'text-indigo-500' : 'text-slate-400'}`}>{count}</span>
      )}
    </button>
  );
}
