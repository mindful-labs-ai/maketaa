export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className='fixed inset-0 z-[100] overflow-y-auto'
      style={{ background: 'var(--surface-0)' }}
    >
      {children}
    </div>
  );
}
