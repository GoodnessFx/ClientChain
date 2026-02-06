import { Outlet } from 'react-router';
import { AuthProvider } from '@/app/lib/auth';
import { Suspense } from 'react';

export function Root() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50">
        <Suspense 
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading...</p>
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </AuthProvider>
  );
}