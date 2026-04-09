/**
 * ローカル開発環境（localhost + Vite デフォルトポート 5173）かどうかを返す。
 * 編集・保存系UIはこのフラグが true の場合のみ表示する。
 */
export function useIsLocalDev(): boolean {
  return (
    window.location.hostname === 'localhost' &&
    window.location.port === '5173'
  );
}
