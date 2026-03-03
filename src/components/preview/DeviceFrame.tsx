import React from 'react';

interface DeviceFrameProps {
    device: 'mobile' | 'tablet';
    children: React.ReactNode;
}

export default function DeviceFrame({ device, children }: DeviceFrameProps) {
    const isMobile = device === 'mobile';
    
    return (
        <div className={`relative mx-auto border-[8px] border-[#1a1a1a] rounded-[50px] bg-[#1a1a1a] shadow-[0_0_0_2px_#3a3a3a,0_20px_50px_-10px_rgba(0,0,0,0.5)] overflow-hidden
            ${isMobile ? 'w-[375px] h-[812px]' : 'w-[768px] h-[1024px]'}
            transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)`}>
            
            {/* Dynamic Island / Notch Area */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-[34px] w-[120px] bg-black rounded-b-[18px] z-50 flex items-center justify-center">
                 {/* Camera lens simulation */}
                 <div className="w-16 h-4 bg-[#1a1a1a]/50 rounded-full blur-[1px]"></div>
            </div>
            
            {/* Screen Content */}
            <div className="w-full h-full bg-white overflow-hidden rounded-[42px] relative z-10">
                <div className="w-full h-full overflow-y-auto no-scrollbar scroll-smooth pt-[44px] px-4 pb-8">
                    {children}
                </div>
            </div>
            
            {/* Side Buttons (Volume/Power) */}
            <div className="absolute -left-[10px] top-[120px] w-[2px] h-[32px] bg-[#2a2a2a] rounded-l-md"></div>
            <div className="absolute -left-[10px] top-[170px] w-[2px] h-[64px] bg-[#2a2a2a] rounded-l-md"></div>
            <div className="absolute -right-[10px] top-[170px] w-[2px] h-[96px] bg-[#2a2a2a] rounded-r-md"></div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[130px] h-[5px] bg-black/20 dark:bg-black/40 rounded-full z-50 pointer-events-none backdrop-blur-sm"></div>
        </div>
    );
}
