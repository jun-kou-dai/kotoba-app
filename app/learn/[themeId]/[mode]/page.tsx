import { themes } from '../../../../data/themes';
import { LearningMode } from '../../../../types/vocabulary';
import LearnClient from './LearnClient';

// 静的エクスポート用: 全テーマ×全モードのパスを事前生成
const ALL_MODES: LearningMode[] = ['miru', 'kiku', 'erabu', 'nakamawake'];
export function generateStaticParams() {
  return themes.flatMap(theme =>
    ALL_MODES.map(mode => ({ themeId: theme.id, mode }))
  );
}

export default async function LearnPage({ params }: { params: Promise<{ themeId: string; mode: string }> }) {
  const { themeId, mode } = await params;
  return <LearnClient themeId={themeId} mode={mode} />;
}
