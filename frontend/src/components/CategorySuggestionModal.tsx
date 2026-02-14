import { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  summary: string;
  suggestedCategories: string[];
  onSubmit: (selectedCategory: string) => void;
  onClose: () => void;
  isSaving: boolean;
}

export default function CategorySuggestionModal({
  isOpen,
  summary,
  suggestedCategories,
  onSubmit,
  onClose,
  isSaving,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // モーダルが開かれたとき、または提案が変更されたときに選択肢の初期値を設定
  useEffect(() => {
    if (suggestedCategories.length > 0) {
      setSelectedCategory(suggestedCategories[0]);
      setIsCustomCategory(false);
    } else {
      // 提案がない場合はカスタム入力を強制
      setIsCustomCategory(true);
      setSelectedCategory('');
    }
  }, [suggestedCategories, isOpen]); // isOpenも依存配列に含め、モーダルが開くたびにリセット

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory.trim()) {
      alert('カテゴリを選択または入力してください。');
      return;
    }
    onSubmit(selectedCategory);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center px-4 animate-fadeIn">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/80 w-full max-w-lg animate-scaleIn">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">AIによる分析結果</h2>

        <div className="mb-6">
          <label className="block text-slate-600 font-semibold mb-2 text-sm">
            1行要約
          </label>
          <p className="bg-violet-50 border border-violet-100 p-3 rounded-lg text-slate-700">{summary || '要約を生成できませんでした。'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-slate-600 font-semibold mb-2 text-sm">
              カテゴリの提案
            </label>
            <div className="space-y-2">
              {suggestedCategories.map((cat) => (
                <label key={cat} className="flex items-center p-2.5 rounded-xl cursor-pointer hover:bg-violet-50/50 transition-colors duration-200">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={!isCustomCategory && selectedCategory === cat}
                    onChange={() => {
                      setSelectedCategory(cat);
                      setIsCustomCategory(false);
                    }}
                    className="mr-3 w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-slate-700">{cat}</span>
                </label>
              ))}
              <label className="flex items-center p-2.5 rounded-xl cursor-pointer hover:bg-violet-50/50 transition-colors duration-200">
                <input
                  type="radio"
                  name="category"
                  value="custom"
                  checked={isCustomCategory}
                  onChange={() => {
                    setIsCustomCategory(true);
                    setSelectedCategory('');
                  }}
                  className="mr-3 w-4 h-4 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-slate-700">その他（自由入力）</span>
              </label>
            </div>
            {isCustomCategory && (
              <input
                type="text"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="新しいカテゴリ名"
                className="mt-3 shadow-sm appearance-none border border-slate-200 rounded-lg w-full py-2.5 px-3 text-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition duration-200"
                autoFocus
              />
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 font-semibold py-2.5 px-5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] text-white font-semibold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : 'この内容で保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
