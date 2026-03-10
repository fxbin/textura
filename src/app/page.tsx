'use client';

import { EditorPane } from '@/components/editor/EditorPane';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { RecoveryBanner } from '@/components/layout/RecoveryBanner';
import { TopNav } from '@/components/layout/TopNav';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useScrollSync } from '@/hooks/useScrollSync';

export default function Home() {
  // Use a shorter interval (e.g., 3 minutes) or the default 5 minutes
  useAutoSave(180000); // 3 minutes for peace of mind
  
  // Enable scroll synchronization
  useScrollSync();

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none select-none" />
      <TopNav />
      <RecoveryBanner />
      <div className="flex-1 min-h-0 z-10">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={20} className="h-full">
            <EditorPane />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={30} className="h-full">
            <PreviewPane />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </main>
  );
}
