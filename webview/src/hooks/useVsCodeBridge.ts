import { useCallback, useEffect, useRef } from "react";
import type {
  ClaudeTubeState,
  ExtensionToWebviewMessage,
  WebviewConfig,
  WebviewToExtensionMessage,
} from "../lib/types";
import { DEFAULT_STATE } from "../lib/types";

declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => ClaudeTubeState | undefined;
  setState: (state: ClaudeTubeState) => void;
};

interface VsCodeBridge {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getPersistedState: () => ClaudeTubeState | undefined;
  setPersistedState: (state: ClaudeTubeState) => void;
}

function createBridge(): VsCodeBridge {
  try {
    const api = acquireVsCodeApi();
    return {
      postMessage: (message) => api.postMessage(message),
      getPersistedState: () => api.getState(),
      setPersistedState: (state) => api.setState(state),
    };
  } catch {
    return {
      postMessage: () => undefined,
      getPersistedState: () => undefined,
      setPersistedState: () => undefined,
    };
  }
}

export function useVsCodeBridge(
  onMessage: (message: ExtensionToWebviewMessage) => void
): {
  bridge: VsCodeBridge;
  config: WebviewConfig;
} {
  const bridgeRef = useRef<VsCodeBridge>(createBridge());
  const configRef = useRef<WebviewConfig>({
    autoplay: true,
    defaultLayout: "compact",
    defaultPlaybackRate: 1,
    miniOpacity: 1,
  });

  const handleMessage = useCallback(
    (event: MessageEvent<ExtensionToWebviewMessage>) => {
      onMessage(event.data);
    },
    [onMessage]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    bridgeRef.current.postMessage({ type: "ready" });
    bridgeRef.current.postMessage({ type: "requestState" });
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return { bridge: bridgeRef.current, config: configRef.current };
}

export function mergeState(
  current: ClaudeTubeState,
  partial: Partial<ClaudeTubeState>
): ClaudeTubeState {
  return { ...current, ...partial };
}

export function getInitialState(): ClaudeTubeState {
  try {
    const api = acquireVsCodeApi();
    return api.getState() ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}
