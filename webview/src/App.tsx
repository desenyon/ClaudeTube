import { useCallback, useEffect, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import { PlayerFrame } from "./components/PlayerFrame";
import { UrlBar } from "./components/UrlBar";
import { VideoList } from "./components/VideoList";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";
import { getInitialState, mergeState, useVsCodeBridge } from "./hooks/useVsCodeBridge";
import { buildYouTubeUrl, parseYouTubeUrl } from "./lib/parseYouTubeUrl";
import type {
  ClaudeTubeState,
  ExtensionToWebviewMessage,
  HistoryItem,
  QueueItem,
} from "./lib/types";
import { DEFAULT_STATE } from "./lib/types";
import styles from "./styles/app.module.css";

const PLAYER_CONTAINER_ID = "claudetube-player";
const MAX_HISTORY = 30;

function upsertHistory(
  history: HistoryItem[],
  item: Omit<HistoryItem, "watchedAt">
): HistoryItem[] {
  const filtered = history.filter((entry) => entry.videoId !== item.videoId);
  return [{ ...item, watchedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
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

  const loadVideo = useCallback(
    (
      videoId: string,
      url: string,
      options?: { startSeconds?: number; title?: string; fromQueue?: boolean }
    ) => {
      const current = stateRef.current;
      const history = upsertHistory(current.history, {
        videoId,
        url,
        title: options?.title,
        lastPosition: options?.startSeconds ?? 0,
      });

      let queue = current.queue;
      if (options?.fromQueue) {
        queue = queue.filter((item) => item.videoId !== videoId);
      }

      const next: ClaudeTubeState = {
        ...current,
        videoId,
        title: options?.title,
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

  const handleExtensionMessage = useCallback(
    (message: ExtensionToWebviewMessage) => {
      switch (message.type) {
        case "init":
          setConfig(message.config);
          persistState(message.state);
          if (message.state.videoId) {
            setUrlInput(buildYouTubeUrl(message.state.videoId));
          }
          break;
        case "play":
          loadVideo(message.videoId, message.url ?? buildYouTubeUrl(message.videoId), {
            title: message.title,
          });
          break;
        case "enqueue": {
          const item: QueueItem = {
            videoId: message.videoId,
            url: message.url,
            title: message.title,
            addedAt: Date.now(),
          };
          const next = {
            ...stateRef.current,
            queue: [...stateRef.current.queue, item],
          };
          persistState(next);
          break;
        }
        case "togglePlay":
          controlsRef.current?.toggle();
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
        default:
          break;
      }
    },
    [loadVideo, persistState]
  );

  const { bridge } = useVsCodeBridge(handleExtensionMessage);

  const { controls, error } = useYouTubePlayer(PLAYER_CONTAINER_ID, {
    videoId: state.videoId,
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

  const handlePlayInput = useCallback(() => {
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed) {
      bridge.postMessage({
        type: "showInfo",
        message: "Enter a valid YouTube URL or 11-character video ID.",
      });
      return;
    }
    loadVideo(parsed.videoId, parsed.url, { startSeconds: parsed.startSeconds });
  }, [bridge, loadVideo, urlInput]);

  const handleEnqueueInput = useCallback(() => {
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed) {
      bridge.postMessage({
        type: "showInfo",
        message: "Enter a valid YouTube URL before adding to queue.",
      });
      return;
    }
    const item: QueueItem = {
      videoId: parsed.videoId,
      url: parsed.url,
      addedAt: Date.now(),
    };
    postPartialState({ queue: [...stateRef.current.queue, item] }, bridge);
  }, [bridge, postPartialState, urlInput]);

  const playNextInQueue = useCallback(() => {
    const [next, ...rest] = stateRef.current.queue;
    if (!next) {
      postPartialState({ isPlaying: false }, bridge);
      return;
    }
    persistState({ ...stateRef.current, queue: rest });
    loadVideo(next.videoId, next.url, { title: next.title, fromQueue: true });
  }, [bridge, loadVideo, persistState, postPartialState]);

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
  }, [controls, playNextInQueue]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ClaudeTube</h1>
          <p className={styles.subtitle}>YouTube in your sidebar</p>
        </div>
      </header>

      <UrlBar value={urlInput} onChange={setUrlInput} onSubmit={handlePlayInput} />

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleEnqueueInput}
        >
          Add to queue
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => postPartialState({ queue: [] }, bridge)}
        >
          Clear queue
        </button>
      </div>

      <PlayerFrame
        containerId={PLAYER_CONTAINER_ID}
        layout={state.layout}
        miniOpacity={state.miniOpacity}
        hasVideo={Boolean(state.videoId)}
        error={error}
        onOpenExternal={
          state.videoId
            ? () =>
                bridge.postMessage({
                  type: "openExternal",
                  url: buildYouTubeUrl(state.videoId!, state.currentTime),
                })
            : undefined
        }
      />

      {state.title && <p className={styles.nowPlaying}>Now playing: {state.title}</p>}

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
        miniOpacity={state.miniOpacity}
        onMiniOpacityChange={(miniOpacity) =>
          postPartialState({ miniOpacity }, bridge)
        }
        currentTime={state.currentTime}
        duration={duration}
        onSeek={(currentTime) => {
          controls?.seekTo(currentTime);
          postPartialState({ currentTime }, bridge);
        }}
        onEnqueue={() => {
          if (!state.videoId) {
            return;
          }
          const item: QueueItem = {
            videoId: state.videoId,
            url: buildYouTubeUrl(state.videoId, state.currentTime),
            title: state.title,
            addedAt: Date.now(),
          };
          postPartialState({ queue: [...state.queue, item] }, bridge);
        }}
        hasVideo={Boolean(state.videoId)}
      />

      <VideoList
        title="Queue"
        items={state.queue}
        emptyLabel="Queue is empty"
        onSelect={(item) =>
          loadVideo(item.videoId, item.url, {
            title: item.title,
            fromQueue: true,
          })
        }
        onRemove={(videoId) => {
          const queue = state.queue.filter((item) => item.videoId !== videoId);
          postPartialState({ queue }, bridge);
        }}
      />

      <VideoList
        title="History"
        items={state.history}
        emptyLabel="No watch history yet"
        showTimestamp
        onSelect={(item) => {
          const startSeconds =
            "lastPosition" in item ? item.lastPosition : undefined;
          loadVideo(item.videoId, item.url, {
            title: item.title,
            startSeconds,
          });
        }}
      />
    </div>
  );
}
