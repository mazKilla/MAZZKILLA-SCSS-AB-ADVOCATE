import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Terminal, Database, HardDrive, Settings, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground crt-flicker selection:bg-primary selection:text-background relative">
      <div className="scanline"></div>
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-primary/30 flex flex-col bg-background/80 backdrop-blur-md z-10">
        <div className="p-4 border-b border-primary/30">
          <Link href="/" className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors">
            <Terminal className="w-6 h-6" />
            <div>
              <h1 className="font-bold tracking-tighter text-glow">EML_CONVERTER</h1>
              <p className="text-[10px] text-primary/50 tracking-widest">v1.0.4 // SYSTEM_ACTIVE</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-4 mt-2 tracking-widest">MAIN_ROUTINES</div>
          
          <Link 
            href="/" 
            className={cn(
              "flex items-center gap-3 px-3 py-2 border transition-all duration-200 group",
              location === '/' 
                ? "border-primary bg-primary/10 text-primary shadow-[inset_4px_0_0_0_rgba(0,255,0,1)]" 
                : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5"
            )}
          >
            <Database className="w-4 h-4" />
            <span className="uppercase text-sm tracking-wider">Jobs_Queue</span>
            {location === '/' && <ChevronRight className="w-4 h-4 ml-auto animate-pulse" />}
          </Link>
        </nav>

        <div className="p-4 border-t border-primary/30 text-xs text-muted-foreground flex flex-col gap-1">
          <div className="flex justify-between">
            <span>SYS.TIME:</span>
            <span className="text-primary">{time.split('T')[1].substring(0,8)}</span>
          </div>
          <div className="flex justify-between">
            <span>SYS.MEM:</span>
            <span className="text-primary">OK</span>
          </div>
          <div className="flex justify-between">
            <span>NET.STAT:</span>
            <span className="text-primary animate-pulse">CONNECTED</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden relative z-0">
        <header className="h-12 border-b border-primary/30 flex items-center px-6 justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span>/root/api/emails{location}</span>
            <span className="w-2 h-4 bg-primary animate-blink inline-block ml-1"></span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
