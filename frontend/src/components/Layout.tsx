import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 overflow-x-hidden">
      <Sidebar />
      <main className="pb-safe md:pb-0 md:ml-64 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 py-5 md:px-6 md:py-8 w-full min-w-0">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
