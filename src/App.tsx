/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
import { HomeScreen } from './components/HomeScreen';
import { ApiLectureParams } from './types/player';
import { DEFAULT_LECTURES } from './data/lectures';

const DEFAULT_ENDPOINT = 'https://examcrushers.in/api/play';
const STORAGE_LAST_PARAMS = 'examcrushers_last_params';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'player'>('home');
  const [endpointUrl, setEndpointUrl] = useState<string>(DEFAULT_ENDPOINT);

  const [activeLecture, setActiveLecture] = useState<ApiLectureParams & { title?: string }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_LAST_PARAMS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.batchId && parsed.subjectId && parsed.lectureId && parsed.key) {
            return parsed;
          }
        }
      } catch {
        // Safe fallback
      }
    }
    return DEFAULT_LECTURES[0];
  });

  const handleStartPlay = useCallback(
    (params: ApiLectureParams & { title?: string }, endpoint: string) => {
      setActiveLecture(params);
      setEndpointUrl(endpoint);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_LAST_PARAMS, JSON.stringify(params));
        } catch {
          // Safe catch
        }
      }
      setCurrentView('player');
    },
    []
  );

  const handleBackToHome = useCallback(() => {
    setCurrentView('home');
  }, []);

  const handleLectureComplete = useCallback(() => {
    const currentIndex = DEFAULT_LECTURES.findIndex((l) => l.lectureId === activeLecture.lectureId);
    if (currentIndex >= 0 && currentIndex < DEFAULT_LECTURES.length - 1) {
      const nextLecture = DEFAULT_LECTURES[currentIndex + 1];
      setActiveLecture(nextLecture);
    }
  }, [activeLecture.lectureId]);

  if (currentView === 'player') {
    return (
      <div
        id="app-fullscreen-player-root"
        className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden select-none"
      >
        <VideoPlayer
          params={activeLecture}
          endpointBaseUrl={endpointUrl}
          lectureTitle={activeLecture.title}
          onLectureComplete={handleLectureComplete}
          onBack={handleBackToHome}
          isFullScreenMode={true}
        />
      </div>
    );
  }

  return (
    <div id="app-home-screen-root">
      <HomeScreen
        onPlay={handleStartPlay}
        initialParams={activeLecture}
        initialEndpoint={endpointUrl}
        presets={DEFAULT_LECTURES}
      />
    </div>
  );
}

