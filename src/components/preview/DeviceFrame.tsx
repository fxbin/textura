import React from 'react';
import { Wifi } from 'lucide-react';

interface DeviceFrameProps {
  device: 'iphone-15-pro-max' | 'android-flagship';
  children: React.ReactNode;
}

export default function DeviceFrame({ device, children }: DeviceFrameProps) {
  const isAndroid = device === 'android-flagship';

  return (
    <div
      className={`relative mx-auto max-w-full overflow-hidden bg-[#101114] transition-all duration-500 ${
        isAndroid
          ? 'h-[800px] max-h-[82vh] w-[392px] rounded-[40px] border-[9px] border-[#1c1e23] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_26px_64px_-16px_rgba(16,17,20,0.45)]'
          : 'h-[780px] max-h-[82vh] w-[375px] rounded-[48px] border-[8px] border-[#191a1c] shadow-[0_0_0_1.5px_#3a3a3c,0_24px_56px_-14px_rgba(16,17,20,0.45)]'
      }`}
    >
      {isAndroid ? (
        <>
          {/* Punch-hole camera */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center print:hidden">
            <div className="mt-2.5 h-3.5 w-3.5 rounded-full border border-black/50 bg-[#050505] shadow-[0_0_0_3px_rgba(0,0,0,0.12)]" />
          </div>
          {/* Hardware buttons */}
          <div className="pointer-events-none absolute -left-[10px] top-[148px] h-[56px] w-[3px] rounded-l-md bg-[#262a31]" />
          <div className="pointer-events-none absolute -right-[10px] top-[180px] h-[88px] w-[3px] rounded-r-md bg-[#262a31]" />

          {/* Screen */}
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[31px] bg-white">
            {/* Status bar outside #print-area */}
            <div className="flex h-9 shrink-0 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-neutral-800 select-none print:hidden">
              <span>9:41</span>
              <div className="flex items-center gap-1.5 text-neutral-700">
                <Wifi className="h-3 w-3" />
                <div className="flex h-2.5 w-4 items-center rounded-[2px] border border-neutral-600 p-[1px]">
                  <div className="h-full w-3/4 rounded-[1px] bg-neutral-800" />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

            <div className="pointer-events-none flex h-5 shrink-0 items-center justify-center bg-white print:hidden">
              <div className="h-1 w-24 rounded-full bg-black/15" />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-40 flex h-[24px] w-[96px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-2.5 print:hidden">
            <div className="h-2.5 w-2.5 rounded-full bg-[#161922] ring-1 ring-white/10" />
          </div>
          {/* Hardware buttons */}
          <div className="pointer-events-none absolute -left-[9px] top-[120px] h-[30px] w-[2px] rounded-l-md bg-[#2a2a2a]" />
          <div className="pointer-events-none absolute -left-[9px] top-[168px] h-[60px] w-[2px] rounded-l-md bg-[#2a2a2a]" />
          <div className="pointer-events-none absolute -right-[9px] top-[168px] h-[90px] w-[2px] rounded-r-md bg-[#2a2a2a]" />

          {/* Screen */}
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-white">
            {/* Status bar outside #print-area */}
            <div className="flex h-11 shrink-0 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-neutral-900 select-none print:hidden">
              <span>9:41</span>
              <div className="flex items-center gap-1.5 text-neutral-800">
                <Wifi className="h-3 w-3" />
                <div className="flex h-2.5 w-4 items-center rounded-[2px] border border-neutral-700 p-[1px]">
                  <div className="h-full w-4/5 rounded-[1px] bg-neutral-900" />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

            <div className="pointer-events-none flex h-5 shrink-0 items-center justify-center bg-white print:hidden">
              <div className="h-1 w-28 rounded-full bg-black/20" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
