export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-4 text-center text-xs text-[var(--text-muted)]">
      &copy; {new Date().getFullYear()} <span className="brand-gradient-text font-bold">CareerIQ</span> &mdash; AI-Powered Career Intelligence
    </footer>
  );
}
