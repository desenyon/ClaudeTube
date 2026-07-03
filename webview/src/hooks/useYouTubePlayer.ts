import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface UseYouTubePlayerOptions {
  videoId: string | null;
  playlistId?: string | null;
  autoplay?: boolean;
  startSeconds?: number;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  onReady?: () => void;
  onStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: (code: number) => void;
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve) => {
    const existing = document.getElementById("youtube-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => resolve();
  });

  return apiLoadPromise;
}

export function useYouTubePlayer(
  containerId: string,
  options: UseYouTubePlayerOptions
): {
  controls: YouTubePlayerControls | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const playerRef = useRef<YT.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const destroyPlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function init() {
      if (!options.videoId && !options.playlistId) {
        destroyPlayer();
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await loadYouTubeApi();
      if (cancelled) {
        return;
      }

      destroyPlayer();
      setError(null);

      const playerVars: Record<string, string | number | undefined> = {
        autoplay: options.autoplay ? 1 : 0,
        start: options.startSeconds ? Math.floor(options.startSeconds) : undefined,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
      };

      if (options.playlistId) {
        playerVars.listType = "playlist";
        playerVars.list = options.playlistId;
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId: options.videoId || undefined,
        width: "100%",
        height: "100%",
        playerVars,
        events: {
          onReady: (event) => {
            if (cancelled) {
              return;
            }
            const player = event.target;
            if (options.volume !== undefined) {
              player.setVolume(options.volume);
            }
            if (options.muted) {
              player.mute();
            }
            if (options.playbackRate) {
              player.setPlaybackRate(options.playbackRate);
            }
            setIsReady(true);
            setIsLoading(false);
            optionsRef.current.onReady?.();
          },
          onStateChange: (event) => {
            const playing = event.data === window.YT.PlayerState.PLAYING;
            optionsRef.current.onStateChange?.(playing);
          },
          onError: (event) => {
            const messages: Record<number, string> = {
              2: "Invalid video ID",
              5: "HTML5 player error",
              100: "Video not found or removed",
              101: "Embedding disabled by owner",
              150: "Embedding disabled by owner",
            };
            setError(messages[event.data] ?? `Playback error (${event.data})`);
            setIsLoading(false);
            optionsRef.current.onError?.(event.data);
          },
        },
      });

      intervalId = setInterval(() => {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== "function") {
          return;
        }
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if (Number.isFinite(current) && Number.isFinite(duration)) {
          optionsRef.current.onTimeUpdate?.(current, duration);
        }
      }, 1500);
    }

    void init();

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      destroyPlayer();
    };
  }, [
    containerId,
    options.videoId,
    options.playlistId,
    options.autoplay,
    options.startSeconds,
    destroyPlayer,
  ]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady) {
      return;
    }
    if (options.volume !== undefined) {
      player.setVolume(options.volume);
    }
    if (options.muted) {
      player.mute();
    } else {
      player.unMute();
    }
    if (options.playbackRate) {
      player.setPlaybackRate(options.playbackRate);
    }
  }, [isReady, options.volume, options.muted, options.playbackRate]);

  const controls: YouTubePlayerControls | null = playerRef.current
    ? {
        play: () => playerRef.current?.playVideo(),
        pause: () => playerRef.current?.pauseVideo(),
        toggle: () => {
          const state = playerRef.current?.getPlayerState();
          if (state === window.YT.PlayerState.PLAYING) {
            playerRef.current?.pauseVideo();
          } else {
            playerRef.current?.playVideo();
          }
        },
        seekTo: (seconds) => playerRef.current?.seekTo(seconds, true),
        setVolume: (volume) => playerRef.current?.setVolume(volume),
        mute: () => playerRef.current?.mute(),
        unMute: () => playerRef.current?.unMute(),
        setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate(rate),
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        getDuration: () => playerRef.current?.getDuration() ?? 0,
        getPlayerState: () => playerRef.current?.getPlayerState() ?? -1,
        destroy: destroyPlayer,
      }
    : null;

  return { controls, isReady, isLoading, error };
}
