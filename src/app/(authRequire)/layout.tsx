import AuthRequired from '@/components/layout/AuthRequired';
import { Sidebar } from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import { InsufficientCreditsDialog } from '@/components/credits/InsufficientCreditsDialog';

export default function AuthRequireLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthRequired>
      <Sidebar />
      <div className='lg:ml-56 min-h-screen flex flex-col'>
        <TopNav />
        <main className='flex-1'>{children}</main>
      </div>
      <InsufficientCreditsDialog />
    </AuthRequired>
  );
}
