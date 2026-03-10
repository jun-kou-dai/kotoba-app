import { themes } from '../../../data/themes';
import ThemeDetailClient from './ThemeDetailClient';

// 静的エクスポート用: 全テーマのパスを事前生成
export function generateStaticParams() {
  return themes.map(theme => ({ themeId: theme.id }));
}

export default async function ThemeDetailPage({ params }: { params: Promise<{ themeId: string }> }) {
  const { themeId } = await params;
  return <ThemeDetailClient themeId={themeId} />;
}
