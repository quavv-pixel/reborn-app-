const PATHS = {
  all: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  sneakers: (
    <path d="M3 16.5c0-1 .6-1.6 1.4-2.1L9 11.8c.5-.3.8-.8.8-1.4V7.5l2.7 2.2c1 .8 2.2 1.3 3.5 1.5l3 .4c1.1.2 2 1.1 2 2.2v.7c0 1-.8 1.8-1.8 1.8H4.8c-1 0-1.8-.8-1.8-1.8Z" />
  ),
  streetwear: (
    <path d="M8 4 4 6.5 5.5 10 8 8.8V20h8V8.8L18.5 10 20 6.5 16 4l-2 1.5h-4Z" />
  ),
  electronics: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  collectibles: (
    <path d="m12 3 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16l-5.1 2.7 1-5.7-4.1-4 5.7-.8Z" />
  ),
  accessories: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 9v3l2 1.2M10 3h4M10 21h4" />
    </>
  ),
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" />,
  other: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
};

export default function CategoryIcon({ name, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.other}
    </svg>
  );
}
