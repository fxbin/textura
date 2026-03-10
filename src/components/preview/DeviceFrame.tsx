import React from 'react';

interface DeviceFrameProps {
    device: 'iphone-15-pro-max' | 'android-flagship';
    children: React.ReactNode;
}

export default function DeviceFrame({ device, children }: DeviceFrameProps) {
    const isAndroid = device === 'android-flagship';

    return (
        <div
            className={`relative mx-auto overflow-hidden bg-[#101114] transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
            ${isAndroid
                ? 'h-[860px] w-[398px] rounded-[42px] border-[10px] border-[#1b1d22] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_28px_70px_-18px_rgba(0,0,0,0.65)]'
                : 'h-[812px] w-[375px] rounded-[50px] border-[8px] border-[#1a1a1a] shadow-[0_0_0_2px_#3a3a3a,0_20px_50px_-10px_rgba(0,0,0,0.5)]'}`}
        >
            {isAndroid ? (
                <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center">
                        <div className="mt-3 h-4 w-4 rounded-full border border-black/50 bg-[#050505] shadow-[0_0_0_4px_rgba(0,0,0,0.16)]" />
                    </div>
                    <div className="absolute left-1/2 top-3 z-30 h-6 w-[132px] -translate-x-1/2 rounded-full bg-white/5 blur-md" />
                    <div className="absolute -left-[11px] top-[148px] h-[60px] w-[3px] rounded-l-md bg-[#262a31]" />
                    <div className="absolute -right-[11px] top-[180px] h-[92px] w-[3px] rounded-r-md bg-[#262a31]" />
                    <div className="absolute inset-[4px] overflow-hidden rounded-[34px] bg-white">
                        <div className="h-full w-full overflow-y-auto no-scrollbar scroll-smooth px-4 pb-8 pt-8">
                            {children}
                        </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex justify-center">
                        <div className="h-1.5 w-28 rounded-full bg-black/15" />
                    </div>
                </>
            ) : (
                <>
                    <div className="absolute left-1/2 top-0 z-50 flex h-[34px] w-[120px] -translate-x-1/2 items-center justify-center rounded-b-[18px] bg-black">
                        <div className="h-4 w-16 rounded-full bg-[#1a1a1a]/50 blur-[1px]" />
                    </div>
                    <div className="absolute -left-[10px] top-[120px] h-[32px] w-[2px] rounded-l-md bg-[#2a2a2a]" />
                    <div className="absolute -left-[10px] top-[170px] h-[64px] w-[2px] rounded-l-md bg-[#2a2a2a]" />
                    <div className="absolute -right-[10px] top-[170px] h-[96px] w-[2px] rounded-r-md bg-[#2a2a2a]" />
                    <div className="relative z-10 h-full w-full overflow-hidden rounded-[42px] bg-white">
                        <div className="h-full w-full overflow-y-auto no-scrollbar scroll-smooth px-4 pb-8 pt-[44px]">
                            {children}
                        </div>
                    </div>
                    <div className="pointer-events-none absolute bottom-2 left-1/2 z-50 h-[5px] w-[130px] -translate-x-1/2 rounded-full bg-black/20 backdrop-blur-sm dark:bg-black/40" />
                </>
            )}
        </div>
    );
}
