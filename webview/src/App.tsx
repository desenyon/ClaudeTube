import { useCallback, useEffect, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import { NowPlaying } from "./components/NowPlaying";
import { PlayerFrame } from "./components/PlayerFrame";
import { UrlBar } from "./components/UrlBar";
import { VideoList } from "./components/VideoList";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";
import { getInitialState, mergeState, useVsCodeBridge } from "./hooks/useVsCodeBridge";
import { buildYouTubeUrl, parseYouTubeUrl } from "./lib/parseYouTubeUrl";
import { thumbnailUrlForVideo } from "./lib/thumbnail";
import type {
  ClaudeTubeState,
  ExtensionToWebviewMessage,
  HistoryItem,
  QueueItem,
  RepeatMode,
} from "./lib/types";
import { DEFAULT_STATE } from "./lib/types";
import styles from "./styles/app.module.css";

const PLAYER_CONTAINER_ID = "claudetube-player";
const MAX_HISTORY = 50;

function upsertHistory(
  history: HistoryItem[],
  item: Omit<HistoryItem, "watchedAt">
): HistoryItem[] {
  const filtered = history.filter((entry) => entry.videoId !== item.videoId);
  return [{ ...item, watchedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
}

function shuffleQueue(queue: QueueItem[]): QueueItem[] {
  const copy = [...queue];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cycleRepeat(current: RepeatMode): RepeatMode {
  if (current === "off") return "one";
  if (current === "one") return "all";
  return "off";
}

export default function App() {
  const [state, setState] = useState<ClaudeTubeState>(getInitialState);
  const [urlInput, setUrlInput] = useState("");
  const [config, setConfig] = useState({
    autoplay: true,
    defaultLayout: DEFAULT_STATE.layout,
    defaultPlaybackRate: 1,
    miniOpacity: 1,
  });
  const [duration, setDuration] = useState(0);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<ReturnType<typeof useYouTubePlayer>["controls"]>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistState = useCallback((next: ClaudeTubeState) => {
    setState(next);
    stateRef.current = next;
  }, []);

  const postPartialState = useCallback(
    (partial: Partial<ClaudeTubeState>, bridge: ReturnType<typeof useVsCodeBridge>["bridge"]) => {
      const next = mergeState(stateRef.current, partial);
      persistState(next);
      bridge.setPersistedState(next);
      bridge.postMessage({ type: "stateChanged", state: partial });
    },
    [persistState]
  );

  const requestMetadata = useCallback(
    (videoId: string, url: string, bridge: ReturnType<typeof useVsCodeBridge>["bridge"]) => {
      bridge.postMessage({ type: "requestMetadata", videoId, url });
    },
    []
  );

  const loadVideo = useCallback(
    (
      videoId: string,
      url: string,
      options?: {
        startSeconds?: number;
        title?: string;
        thumbnailUrl?: string;
        playlistId?: string | null;
        fromQueue?: boolean;
      }
    ) => {
      const current = stateRef.current;
      const history = upsertHistory(current.history, {
        videoId,
        url,
        title: options?.title,
        thumbnailUrl: options?.thumbnailUrl ?? thumbnailUrlForVideo(videoId),
        lastPosition: options?.startSeconds ?? 0,
      });

      let queue = current.queue;
      if (options?.fromQueue) {
        queue = queue.filter((item) => item.videoId !== videoId);
      }

      const next: ClaudeTubeState = {
        ...current,
        videoId,
        playlistId: options?.playlistId ?? null,
        title: options?.title,
        thumbnailUrl: options?.thumbnailUrl ?? thumbnailUrlForVideo(videoId),
        currentTime: options?.startSeconds ?? 0,
        history,
        queue,
        isPlaying: config.autoplay,
      };

      persistState(next);
      setUrlInput(url);
    },
    [config.autoplay, persistState]
  );

  const bridgeRef = useRef<ReturnType<typeof useVsCodeBridge>["bridge"] | null>(null);

  const playNextInQueue = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }
    const current = stateRef.current;
    if (current.repeat === "one" && current.videoId) {
      controlsRef.current?.seekTo(0);
      controlsRef.current?.play();
      return;
    }

    let queue = current.queue;
    if (current.shuffle && queue.length > 1) {
      queue = shuffleQueue(queue);
      persistState({ ...current, queue });
    }

    const [next, ...rest] = queue;
    if (!next) {
      if (current.repeat === "all" && current.history.length > 0) {
        const last = current.history[0];
        loadVideo(last.videoId, last.url, {
          title: last.title,
          thumbnailUrl: last.thumbnailUrl,
          startSeconds: 0,
        });
        return;
      }
      postPartialState({ isPlaying: false }, bridge);
      return;
    }

    persistState({ ...current, queue: rest });
    loadVideo(next.videoId, next.url, {
      title: next.title,
      thumbnailUrl: next.thumbnailUrl,
      fromQueue: true,
    });
  }, [loadVideo, persistState, postPartialState]);

  const handleExtensionMessage = useCallback(
    (message: ExtensionToWebviewMessage) => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        return;
      }
      switch (message.type) {
        case "init":
          setConfig(message.config);
          persistState(message.state);
          if (message.state.videoId) {
            setUrlInput(buildYouTubeUrl(message.state.videoId, undefined, message.state.playlistId ?? undefined));
          }
          break;
        case "play":
          if (message.videoId) {
            loadVideo(message.videoId, message.url ?? buildYouTubeUrl(message.videoId), {
              title: message.title,
              thumbnailUrl: message.thumbnailUrl,
              playlistId: message.playlistId,
            });
          } else if (message.playlistId) {
            persistState({
              ...stateRef.current,
              videoId: null,
              playlistId: message.playlistId,
              title: message.title ?? "Playlist",
            });
          }
          break;
        case "enqueue": {
          const item: QueueItem = {
            videoId: message.videoId,
            url: message.url,
            title: message.title,
            thumbnailUrl: message.thumbnailUrl ?? thumbnailUrlForVideo(message.videoId),
            addedAt: Date.now(),
          };
          persistState({ ...stateRef.current, queue: [...stateRef.current.queue, item] });
          break;
        }
        case "togglePlay":
          controlsRef.current?.toggle();
          break;
        case "next":
          playNextInQueue();
          break;
        case "seek":
          controlsRef.current?.seekTo(message.seconds);
          postPartialState({ currentTime: message.seconds }, bridge);
          break;
        case "setMuted":
          if (message.muted) {
            controlsRef.current?.mute();
          } else {
            controlsRef.current?.unMute();
          }
          postPartialState({ muted: message.muted }, bridge);
          break;
        case "clearQueue":
          persistState({ ...stateRef.current, queue: [] });
          break;
        case "setLayout":
          persistState({ ...stateRef.current, layout: message.layout });
          break;
        case "setPlaybackRate":
          persistState({ ...stateRef.current, playbackRate: message.rate });
          controlsRef.current?.setPlaybackRate(message.rate);
          break;
        case "metadata":
          if (stateRef.current.videoId === message.videoId) {
            postPartialState(
              { title: message.title, thumbnailUrl: message.thumbnailUrl },
              bridge
            );
          }
          break;
        case "theme":
          document.documentElement.dataset.theme = message.kind;
          break;
        default:
          break;
      }
    },
    [loadVideo, persistState, playNextInQueue, postPartialState]
  );

  const { bridge } = useVsCodeBridge(handleExtensionMessage);
  bridgeRef.current = bridge;

  const { controls, error, isLoading } = useYouTubePlayer(PLAYER_CONTAINER_ID, {
    videoId: state.videoId,
    playlistId: state.playlistId,
    autoplay: config.autoplay,
    startSeconds: state.currentTime > 0 ? state.currentTime : undefined,
    volume: state.volume,
    muted: state.muted,
    playbackRate: state.playbackRate,
    onStateChange: (isPlaying) => {
      postPartialState({ isPlaying }, bridge);
    },
    onTimeUpdate: (currentTime, nextDuration) => {
      setDuration(nextDuration);
      postPartialState({ currentTime }, bridge);
    },
    onReady: () => {
      if (state.videoId) {
        requestMetadata(state.videoId, buildYouTubeUrl(state.videoId, undefined, state.playlistId ?? undefined), bridge);
      }
    },
  });

  controlsRef.current = controls;

  useEffect(() => {
    const player = controls;
    if (!player || !state.isPlaying) {
      return;
    }
    const stateCode = player.getPlayerState();
    if (stateCode !== window.YT?.PlayerState.PLAYING) {
      player.play();
    }
  }, [controls, state.videoId, state.isPlaying]);

  useEffect(() => {
    if (!controls) {
      return;
    }
    const interval = setInterval(() => {
      const playerState = controls.getPlayerState();
      if (playerState === window.YT?.PlayerState.ENDED) {
        playNextInQueue();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [bridge, controls, playNextInQueue]);

  const handlePlayInput = useCallback(() => {
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed) {
      bridge.postMessage({
        type: "showInfo",
        message: "Enter a valid YouTube URL or 11-character video ID.",
      });
      return;
    }
    if (parsed.videoId) {
      loadVideo(parsed.videoId, parsed.url, {
        startSeconds: parsed.startSeconds,
        playlistId: parsed.playlistId ?? null,
      });
      requestMetadata(parsed.videoId, parsed.url, bridge);
    } else if (parsed.playlistId) {
      persistState({
        ...stateRef.current,
        videoId: null,
        playlistId: parsed.playlistId,
        title: "Playlist",
        isPlaying: config.autoplay,
      });
    }
  }, [bridge, config.autoplay, loadVideo, persistState, requestMetadata, urlInput]);

  const handleEnqueueInput = useCallback(() => {
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed?.videoId) {
      bridge.postMessage({
        type: "showInfo",
        message: "Enter a valid YouTube URL before adding to queue.",
      });
      return;
    }
    const item: QueueItem = {
      videoId: parsed.videoId,
      url: parsed.url,
      title: undefined,
      thumbnailUrl: thumbnailUrlForVideo(parsed.videoId),
      addedAt: Date.now(),
    };
    postPartialState({ queue: [...stateRef.current.queue, item] }, bridge);
    requestMetadata(parsed.videoId, parsed.url, bridge);
  }, [bridge, postPartialState, requestMetadata, urlInput]);

  useKeyboardShortcuts({
    onTogglePlay: () => controlsRef.current?.toggle(),
    onNext: () => playNextInQueue(),
    onFocusUrl: () => urlInputRef.current?.focus(),
  });

  const hasMedia = Boolean(state.videoId || state.playlistId);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div>
            <h1 className={styles.title}>ClaudeTube</h1>
            <p className={styles.subtitle}>YouTube in your sidebar</p>
          </div>
        </div>
      </header>

      <UrlBar
        ref={urlInputRef}
        value={urlInput}
        onChange={setUrlInput}
        onSubmit={handlePlayInput}
      />

      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={handleEnqueueInput}>
          Add to queue
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => postPartialState({ queue: [] }, bridge)}
        >
          Clear queue
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => playNextInQueue()}
          disabled={state.queue.length === 0}
        >
          Skip
        </button>
      </div>

      <PlayerFrame
        containerId={PLAYER_CONTAINER_ID}
        layout={state.layout}
        miniOpacity={state.miniOpacity}
        hasVideo={hasMedia}
        isLoading={isLoading}
        error={error}
        onRetry={handlePlayInput}
        onOpenExternal={
          state.videoId
            ? () =>
                bridge.postMessage({
                  type: "openExternal",
                  url: buildYouTubeUrl(state.videoId!, state.currentTime, state.playlistId ?? undefined),
                })
            : undefined
        }
      />

      <NowPlaying
        videoId={state.videoId}
        title={state.title}
        thumbnailUrl={state.thumbnailUrl}
        isPlaying={state.isPlaying}
        currentTime={state.currentTime}
        duration={duration}
        onCopyUrl={() => {
          if (state.videoId) {
            bridge.postMessage({
              type: "copyToClipboard",
              text: buildYouTubeUrl(state.videoId, state.currentTime, state.playlistId ?? undefined),
            });
          }
        }}
        onOpenExternal={() => {
          if (state.videoId) {
            bridge.postMessage({
              type: "openExternal",
              url: buildYouTubeUrl(state.videoId, state.currentTime, state.playlistId ?? undefined),
            });
          }
        }}
      />

      <Controls
        layout={state.layout}
        onLayoutChange={(layout) => postPartialState({ layout }, bridge)}
        playbackRate={state.playbackRate}
        onPlaybackRateChange={(playbackRate) => {
          controls?.setPlaybackRate(playbackRate);
          postPartialState({ playbackRate }, bridge);
        }}
        volume={state.volume}
        onVolumeChange={(volume) => {
          controls?.setVolume(volume);
          postPartialState({ volume }, bridge);
        }}
        muted={state.muted}
        onMuteToggle={() => {
          if (state.muted) {
            controls?.unMute();
          } else {
            controls?.mute();
          }
          postPartialState({ muted: !state.muted }, bridge);
        }}
        isPlaying={state.isPlaying}
        onTogglePlay={() => controls?.toggle()}
        onNext={() => playNextInQueue()}
        shuffle={state.shuffle}
        onShuffleToggle={() => postPartialState({ shuffle: !state.shuffle }, bridge)}
        repeat={state.repeat}
        onRepeatCycle={() => postPartialState({ repeat: cycleRepeat(state.repeat) }, bridge)}
        miniOpacity={state.miniOpacity}
        onMiniOpacityChange={(miniOpacity) => postPartialState({ miniOpacity }, bridge)}
        currentTime={state.currentTime}
        duration={duration}
        onSeek={(currentTime) => {
          controls?.seekTo(currentTime);
          postPartialState({ currentTime }, bridge);
        }}
        onEnqueue={() => {
          if (!state.videoId) return;
          const item: QueueItem = {
            videoId: state.videoId,
            url: buildYouTubeUrl(state.videoId, state.currentTime, state.playlistId ?? undefined),
            title: state.title,
            thumbnailUrl: state.thumbnailUrl,
            addedAt: Date.now(),
          };
          postPartialState({ queue: [...state.queue, item] }, bridge);
        }}
        hasVideo={hasMedia}
        queueLength={state.queue.length}
      />

      <VideoList
        title="Queue"
        items={state.queue}
        emptyLabel="Queue is empty — add videos to binge tutorials"
        onSelect={(item) =>
          loadVideo(item.videoId, item.url, {
            title: item.title,
            thumbnailUrl: item.thumbnailUrl,
            fromQueue: true,
          })
        }
        onRemove={(videoId) => {
          postPartialState({ queue: state.queue.filter((item) => item.videoId !== videoId) }, bridge);
        }}
      />

      <VideoList
        title="History"
        items={state.history}
        emptyLabel="No watch history yet"
        showTimestamp
        searchable
        onSelect={(item) => {
          const startSeconds = "lastPosition" in item ? item.lastPosition : undefined;
          loadVideo(item.videoId, item.url, {
            title: item.title,
            thumbnailUrl: item.thumbnailUrl,
            startSeconds,
          });
        }}
      />

      <p className={styles.hint}>
        Shortcuts: Space play/pause · Shift+N next · Cmd+/ focus URL
      </p>
    </div>
  );
}
