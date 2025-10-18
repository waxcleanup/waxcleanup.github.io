// src/components/MusicPlayerMini.js
import React, { useEffect, useState, useRef } from 'react';
import TrackDetailsModal from './TrackDetailsModal';
import '../styles/Skins.css';
import './MusicPlayerMini.css';

const API_BASE      = 'https://maestrobeatz.servegame.com';
const IPFS_GATEWAY  = 'https://maestrobeatz.servegame.com/ipfs';
const PLAYLIST_SIZE = 15;    // ← now 15 tracks
const PER_PAGE      = 25;    // items per API page

function resolveMediaUrl(hash) {
  return hash.startsWith('http') ? hash : `${IPFS_GATEWAY}/${hash}`;
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function getTotalCount() {
  let total = 0, page = 1;
  while (true) {
    const res  = await fetch(`${API_BASE}/waxmusic/audio/latest?limit=${PER_PAGE}&page=${page}`);
    const json = await res.json();
    const count = json.meta.count;
    total += count;
    if (count < PER_PAGE) break;
    page++;
  }
  return total;
}

function pickRandomIndices(total, N) {
  const s = new Set();
  while (s.size < Math.min(N, total)) {
    s.add(Math.floor(Math.random() * total));
  }
  return [...s];
}

function idxToPageOffset(idx) {
  return {
    page: Math.floor(idx / PER_PAGE) + 1,
    offset: idx % PER_PAGE,
  };
}

async function fetchTrackAt(idx) {
  const { page, offset } = idxToPageOffset(idx);
  const res  = await fetch(`${API_BASE}/waxmusic/audio/latest?limit=${PER_PAGE}&page=${page}`);
  const json = await res.json();
  return json.data[offset];
}

export default function MusicPlayerMini() {
  const [playlist, setPlaylist]         = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [showDetails, setShowDetails]   = useState(false);
  const [volume, setVolume]             = useState(0.8);
  const audioRef                        = useRef(null);

  // Load 15 random tracks on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const total   = await getTotalCount();
        const indices = pickRandomIndices(total, PLAYLIST_SIZE);
        const tracks  = await Promise.all(indices.map(i => fetchTrackAt(i)));
        if (mounted) setPlaylist(tracks.filter(Boolean));
      } catch (err) {
        console.error('Error loading playlist:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When currentIndex or isPlaying changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    setCurrentTime(0);
    setDuration(0);

    const onLoaded = () => {
      setDuration(isNaN(audio.duration) ? 0 : audio.duration);
      if (isPlaying) audio.play().catch(() => {});
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => audio.removeEventListener('loadedmetadata', onLoaded);
  }, [currentIndex, isPlaying]);

  // Attach playback event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;

    const onTime  = () => setCurrentTime(audio.currentTime);
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd   = () => handleNext();

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    };
  }, [volume, playlist.length]);

  // Controls
  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex(i => (i + 1 < playlist.length ? i + 1 : 0));
  };
  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentIndex(i => (i - 1 < 0 ? playlist.length - 1 : i - 1));
  };
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.pause() : audio.play().catch(() => {});
  };
  const handleVolumeChange = e => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  // Rendering
  const item = playlist[currentIndex] || {};
  if (!item.ipfs_hash) return null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="mini-player">
        {item.img && (
          <img
            className="mini-cover"
            src={resolveMediaUrl(item.img)}
            alt={item.title}
            onClick={() => setShowDetails(true)}
          />
        )}

        <div className="mini-info">
          <div className="mini-title">{item.title}</div>
          <div className="mini-author">{item.author}</div>
        </div>

        <div className="mini-meta">
          <div><strong>Collection:</strong> {item.collection}</div>
          <div><strong>Template ID:</strong> {item.template_id}</div>
        </div>

        <audio ref={audioRef} src={resolveMediaUrl(item.ipfs_hash)} hidden />

        <div className="mini-controls">
          <button onClick={handlePrev}>Prev</button>
          <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={handleNext}>Next</button>
          <button onClick={() => setShowDetails(true)}>Details</button>
        </div>

        <div className="mini-volume">
          <label htmlFor="volume-slider">Vol</label>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
          />
        </div>

        <div className="mini-progress-container">
          <div className="mini-progress" style={{ width: `${progress}%` }} />
          <div className="mini-time-overlay">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {showDetails && (
        <TrackDetailsModal item={item} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}
