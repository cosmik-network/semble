'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { newMessagePortRpcSession, type RpcStub } from 'capnweb';

// Define the interface the *host* exposes (methods you can call)
export type HostMethods = {
  open(url: string): void;
};

export type HostSession = RpcStub<HostMethods>;

const RpcSessionContext = createContext<HostSession | null>(null);

function connectToHost(): Promise<HostSession> {
  return new Promise((resolve) => {
    // Listen for the host to send us a MessagePort
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'parts.page.channel') return;

      const port = event.ports[0];
      if (!port) return;

      // Start the RPC session over the transferred port
      const session = newMessagePortRpcSession(port, null) as HostSession;
      resolve(session);

      // Remove listener once connected
      window.removeEventListener('message', handleMessage);
    }

    window.addEventListener('message', handleMessage);

    // Signal to the host that we want to connect
    window.parent.postMessage({ type: 'parts.page.connect' }, '*');
  });
}

export function RpcSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<HostSession | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    // De-dupe: only connect once even in StrictMode double-mount
    if (connectingRef.current) return;
    connectingRef.current = true;

    connectToHost().then(setSession);

    return () => {
      // Cleanup on unmount
      session?.[Symbol.dispose]();
    };
  }, [session]);

  return (
    <RpcSessionContext.Provider value={session}>
      {children}
    </RpcSessionContext.Provider>
  );
}

export function useRpcSession() {
  return useContext(RpcSessionContext);
}
