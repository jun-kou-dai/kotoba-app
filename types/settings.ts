/** アプリ設定 */
export interface AppSettings {
  apiKey: string;
  voiceEnabled: boolean;
  voiceSpeed: number;
  voiceName: string;
  soundEffectsEnabled: boolean;
  parentPin: string;
  currentChildId: string;
  setupCompleted: boolean;
}

export const defaultSettings: AppSettings = {
  apiKey: '',
  voiceEnabled: true,
  voiceSpeed: 0.85,
  voiceName: 'Aoede',
  soundEffectsEnabled: true,
  parentPin: '',
  currentChildId: '',
  setupCompleted: false,
};
