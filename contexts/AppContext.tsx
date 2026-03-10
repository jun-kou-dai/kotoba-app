'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChildProfile } from '../types/profile';
import { AppSettings, defaultSettings } from '../types/settings';
import { loadSettings, saveSettings } from '../lib/storage';
import { getChildById } from '../lib/db';

interface AppContextValue {
  currentChild: ChildProfile | null;
  settings: AppSettings;
  isLoading: boolean;
  setCurrentChild: (child: ChildProfile | null) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextValue>({
  currentChild: null,
  settings: defaultSettings,
  isLoading: true,
  setCurrentChild: () => {},
  updateSettings: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentChild, setCurrentChildState] = useState<ChildProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    if (saved.currentChildId) {
      getChildById(saved.currentChildId).then(child => {
        setCurrentChildState(child);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const setCurrentChild = useCallback((child: ChildProfile | null) => {
    setCurrentChildState(child);
    setSettings(prev => {
      const next = { ...prev, currentChildId: child?.id || '' };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ currentChild, settings, isLoading, setCurrentChild, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
