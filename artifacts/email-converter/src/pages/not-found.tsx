import { Link } from "wouter";
import { AlertTriangle, Terminal } from "lucide-react";
import { TWindow, TButton } from "@/components/TerminalUI";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground crt-flicker">
      <div className="scanline"></div>
      
      <TWindow title="SYS.ERROR // 404" className="w-full max-w-md mx-4">
        <div className="flex flex-col items-center text-center py-8">
          <AlertTriangle className="w-16 h-16 text-destructive mb-6 animate-pulse" />
          
          <h1 className="text-4xl font-bold text-destructive text-glow-destructive mb-2">
            404_NOT_FOUND
          </h1>
          
          <div className="bg-destructive/10 border border-destructive/50 p-4 w-full mb-8 font-mono text-sm text-left">
            <p className="text-destructive/80 mb-2">&gt; Requesting sector coordinates...</p>
            <p className="text-destructive font-bold">&gt; FATAL: Invalid path specified.</p>
            <p className="text-destructive/80 mt-2">&gt; The requested endpoint does not exist in the current directory tree.</p>
          </div>
          
          <Link href="/">
            <TButton variant="outline" className="w-full">
              <Terminal className="w-4 h-4 mr-2" />
              RETURN_TO_ROOT
            </TButton>
          </Link>
        </div>
      </TWindow>
    </div>
  );
}
