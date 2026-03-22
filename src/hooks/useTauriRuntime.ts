import * as React from 'react';
import { isTauriRuntime } from '@/store/documentStore';

export function useTauriRuntime() {
  const [tauriRuntime, setTauriRuntime] = React.useState(false);

  React.useEffect(() => {
    setTauriRuntime(isTauriRuntime());
  }, []);

  return tauriRuntime;
}
