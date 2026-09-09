"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MainWrapper from "@/components/layout/MainWrapper";
import GlobalOverlay from "@/components/GlobalOverlay";
import AuthGuard from "@/components/AuthGuard";
import { useAppStore } from "@/lib/app-store";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isGlobalSidebarCollapsed = useAppStore((state) => state.isGlobalSidebarCollapsed);
  const toggleGlobalSidebar = useAppStore((state) => state.toggleGlobalSidebar);

  const footer = (
    <footer className="w-full text-center py-5 mt-auto border-t border-slate-200/50 dark:border-white/[0.04] text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider bg-transparent">
      Developed by{" "}
      <a
        href="https://leadspree.in"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary dark:text-indigo-400 hover:underline transition-colors font-bold"
      >
        LeadSpree Business Solutions
      </a>
    </footer>
  );

  if (isAuthPage) {
    return (
      <AuthGuard>
        <div className="relative min-h-screen w-full bg-[#0c0c14] text-slate-100 selection:bg-primary/20 transition-colors duration-300 flex flex-col justify-between overflow-hidden">
          {/* Galaxy Animated Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
            {/* Galaxy Image Layer */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-65"
              style={{
                backgroundImage: "url('/galaxy_bg.png')",
                animation: "galaxyMotion 60s ease-in-out infinite",
              }}
            />
            {/* Dark radial overlay for text readability */}
            <div className="absolute inset-0 bg-[#0c0c14]/75 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/30 to-transparent" />
            
            {/* Thunder Flash Layers (Atmospheric lightning at different screen sections & paces) */}
            <div className="absolute top-0 left-[-5%] w-[40vw] h-[50vh] bg-gradient-to-br from-white/20 via-indigo-400/15 to-transparent blur-3xl opacity-0"
                 style={{ animation: 'thunderLeft 9s infinite' }} />
            <div className="absolute top-0 right-[-5%] w-[50vw] h-[65vh] bg-gradient-to-bl from-white/15 via-purple-500/10 to-transparent blur-3xl opacity-0"
                 style={{ animation: 'thunderRight 13s infinite', animationDelay: '2.5s' }} />
            <div className="absolute bottom-0 left-[20%] w-[60vw] h-[40vh] bg-gradient-to-t from-indigo-500/8 via-purple-500/8 to-transparent blur-3xl opacity-0"
                 style={{ animation: 'thunderCenter 17s infinite', animationDelay: '5s' }} />

            {/* Minimal Subtle Twinkling Stars */}
            <div className="absolute inset-0 opacity-40">
              {[...Array(20)].map((_, i) => {
                const size = Math.random() * 2 + 1;
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                const duration = Math.random() * 4 + 3;
                const delay = Math.random() * 5;

                return (
                  <div
                    key={i}
                    className="absolute rounded-full bg-white shadow-sm"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `${left}%`,
                      top: `${top}%`,
                      animation: `twinkle ${duration}s ease-in-out infinite`,
                      animationDelay: `${delay}s`
                    }}
                  />
                );
              })}
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes galaxyMotion {
              0% { transform: scale(1.02) translate(0px, 0px); }
              50% { transform: scale(1.10) translate(-15px, 10px); }
              100% { transform: scale(1.02) translate(0px, 0px); }
            }
            @keyframes twinkle {
              0%, 100% { opacity: 0.1; transform: scale(0.8); }
              50% { opacity: 1; transform: scale(1.2); }
            }
            @keyframes thunderLeft {
              0%, 86%, 88%, 91%, 95%, 100% { opacity: 0; }
              87% { opacity: 0.65; }
              89% { opacity: 0.25; }
              92% { opacity: 0.85; }
              94% { opacity: 0.15; }
            }
            @keyframes thunderRight {
              0%, 88%, 90%, 93%, 97%, 100% { opacity: 0; }
              89% { opacity: 0.55; }
              91% { opacity: 0.15; }
              94% { opacity: 0.75; }
              96% { opacity: 0.25; }
            }
            @keyframes thunderCenter {
              0%, 91%, 93%, 95%, 98%, 100% { opacity: 0; }
              92% { opacity: 0.45; }
              94% { opacity: 0.15; }
              96% { opacity: 0.65; }
              97% { opacity: 0.25; }
            }
          `}} />

          {/* Centered Page Content */}
          <div className="relative z-10 flex-1 flex items-center justify-center w-full">
            {children}
          </div>

          {/* Footer */}
          <div className="relative z-10 w-full">
            {footer}
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Sidebar />
      {!isGlobalSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 md:hidden cursor-pointer" 
          onClick={toggleGlobalSidebar}
        />
      )}
      <MainWrapper>
        <Header />
        <div className="flex-1 flex flex-col justify-between w-full">
          <div className="flex-1">
            {children}
          </div>
          {footer}
        </div>
      </MainWrapper>
      <GlobalOverlay />
    </AuthGuard>
  );
}
