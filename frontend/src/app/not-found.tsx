import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: '404 - Page Not Found | DICE',
  description: 'The requested page could not be found.',
};

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
        <div className="relative overflow-hidden max-w-lg w-full bg-[#121215]/90 border border-[#27272a] rounded-3xl p-8 sm:p-12 shadow-2xl text-center backdrop-blur-xl">
          {/* Ambient background glow */}
          <div
            className="absolute -top-20 -left-20 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Logo badge */}
          <div className="relative z-10 inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-xl mb-6 shadow-inner tracking-wider">
            DI<span className="text-blue-500">CE</span>
          </div>

          <h1 className="relative z-10 text-7xl sm:text-8xl font-black tracking-tighter bg-gradient-to-br from-white via-blue-400 to-neutral-400 bg-clip-text text-transparent mb-3 select-none">
            404
          </h1>

          <h2 className="relative z-10 text-2xl font-bold text-neutral-100 mb-3 tracking-tight">
            Page Not Found
          </h2>

          <p className="relative z-10 text-sm text-neutral-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Sorry, the page you are looking for does not exist, has been moved, or an unsupported language route was requested.
          </p>

          <div className="relative z-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
