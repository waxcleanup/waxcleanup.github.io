// src/components/MusicPlayerMini.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import TrackDetailsModal from './TrackDetailsModal';
import '../styles/Skins.css';
import './MusicPlayerMini.css';

const API_BASE = (process.env.REACT_APP_API_BASE_URL || '').trim().replace(/\/+$/, '');
const IPFS_GATEWAY = (process.env.REACT_APP_IPFS_GATEWAY || '').trim().replace(/\/+$/, '');
const PLAYLIST_SIZE = 15;
const VOLUME_KEY = 'cleanupcentr_music_volume';

function resolveMediaUrl(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  if (/^https?:\/\//i.test(source)) return source;
  const hash = source.replace(/^ipfs:\/\//i, '').replace(/^\/+/, '');
  return `${IPFS_GATEWAY}/${hash}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function initialVolume() {
  try {
    const saved = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.8;
  } catch {
    return 0.8;
  }
}

export default function MusicPlayerMini() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [playbackNotice, setPlaybackNotice] = useState('');
  const audioRef = useRef(null);
  const playIntentRef = useRef(false);
  const failedTrackCountRef = useRef(0);

  const loadPlaylist = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(
        `${API_BASE}/waxmusic/audio/random?limit=${PLAYLIST_SIZE}`,
        { signal }
      );
      if (!response.ok) throw new Error(`Music API returned ${response.status}`);

      const payload = await response.json();
      const tracks = Array.isArray(payload?.data)
        ? payload.data.filter((track) => track?.ipfs_hash)
        : [];
      if (!tracks.length) throw new Error('No playable tracks were returned');

      setPlaylist(tracks);
      setCurrentIndex(0);
      failedTrackCountRef.current = 0;
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Error loading playlist:', error);
        setLoadError('Music is temporarily unavailable.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPlaylist(controller.signal);
    return () => controller.abort();
  }, [loadPlaylist]);

  const item = playlist[currentIndex] || {};
  const mediaUrl = resolveMediaUrl(item.ipfs_hash);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !mediaUrl) return;

    setCurrentTime(0);
    setDuration(0);
    setPlaybackNotice('');
    audio.load();
  }, [mediaUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Storage may be disabled; playback still works.
    }
  }, [volume]);

  const advance = useCallback((direction, preservePlayback = playIntentRef.current) => {
    if (!playlist.length) return;
    playIntentRef.current = preservePlayback;
    setCurrentIndex((index) => (
      direction > 0
        ? (index + 1) % playlist.length
        : (index - 1 + playlist.length) % playlist.length
    ));
  }, [playlist.length]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      playIntentRef.current = false;
      audio.pause();
      return;
    }

    playIntentRef.current = true;
    setPlaybackNotice('');
    try {
      await audio.play();
    } catch (error) {
      playIntentRef.current = false;
      setPlaybackNotice('Playback could not start. Try again.');
    }
  };

  const handleLoadedMetadata = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    if (playIntentRef.current) {
      try {
        await audio.play();
      } catch {
        playIntentRef.current = false;
        setPlaybackNotice('Playback could not start. Try again.');
      }
    }
  };

  const handleTrackError = () => {
    if (!playlist.length) return;
    failedTrackCountRef.current += 1;

    if (failedTrackCountRef.current < playlist.length) {
      setPlaybackNotice('Track unavailable — skipping.');
      advance(1, playIntentRef.current);
    } else {
      playIntentRef.current = false;
      setIsPlaying(false);
      setPlaybackNotice('No tracks in this playlist could be played.');
    }
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);
    if (!audio || !Number.isFinite(nextTime)) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  if (loading && !playlist.length) {
    return <div className="mini-player mini-player-state">Loading music…</div>;
  }

  if (loadError && !playlist.length) {
    return (
      <div className="mini-player mini-player-state mini-player-error">
        <span>{loadError}</span>
        <button type="button" onClick={() => loadPlaylist()}>Retry</button>
      </div>
    );
  }

  if (!mediaUrl) return null;

  return (
    <>
      <div className="mini-player">
        <button
          type="button"
          className="mini-cover-button"
          onClick={() => setShowDetails(true)}
          aria-label="Show track details"
        >
          {item.img ? (
            <img className="mini-cover" src={resolveMediaUrl(item.img)} alt="" />
          ) : (
            <span className="mini-cover-placeholder" aria-hidden="true">♫</span>
          )}
        </button>

        <div className="mini-info">
          <div className="mini-title" title={item.title}>{item.title || 'Untitled'}</div>
          <div className="mini-author">{item.author || item.collection || 'Unknown artist'}</div>
          <div className="mini-track-meta">{item.collection} · Template #{item.template_id}</div>
        </div>

        <audio
          ref={audioRef}
          src={mediaUrl}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => {
            failedTrackCountRef.current = 0;
            setIsPlaying(true);
            setPlaybackNotice('');
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => advance(1, true)}
          onError={handleTrackError}
        />

        <div className="mini-controls" aria-label="Music controls">
          <button type="button" onClick={() => advance(-1)} aria-label="Previous track">‹</button>
          <button type="button" className="mini-play-button" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>
          <button type="button" onClick={() => advance(1)} aria-label="Next track">›</button>
          <button type="button" className="mini-details-button" onClick={() => setShowDetails(true)}>Details</button>
        </div>

        <div className="mini-timeline">
          <input
            className="mini-seek"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label="Track position"
            style={{ '--mini-progress': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>

        <div className="mini-volume">
          <span aria-hidden="true">{volume === 0 ? '🔇' : '🔊'}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
          />
        </div>

        {playbackNotice && <div className="mini-playback-notice" role="status">{playbackNotice}</div>}
      </div>

      {showDetails && (
        <TrackDetailsModal item={item} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}
