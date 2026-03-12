import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export function AppLayout() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-h-screen px-4 py-4 sm:px-6">
        <Header />
        <main className="mt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
