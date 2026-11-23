// Re-exports ONLY the two Sentry functions we use. monitoring.jsx imports
// this file lazily; importing '@sentry/react' directly with import() would
// pull in the whole package (session replay, tracing, ...) — ~470 KB instead
// of a fraction of that — because a dynamic namespace import can't be trimmed.
export { init, captureException } from '@sentry/react';
