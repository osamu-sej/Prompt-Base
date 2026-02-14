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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">AIによる分析結果</h2>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">
            1行要約
          </label>
          <p className="bg-violet-50 border border-violet-100 p-3 rounded-lg text-slate-700">{summary || '要約を生成できませんでした。'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">
              カテゴリの提案
            </label>
            <div className="space-y-2">
              {suggestedCategories.map((cat) => (
                <label key={cat} className="flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={!isCustomCategory && selectedCategory === cat}
                    onChange={() => {
                      setSelectedCategory(cat);
                      setIsCustomCategory(false);
                    }}
                    className="mr-2"
                  />
                  {cat}
                </label>
              ))}
              <label className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  value="custom"
                  checked={isCustomCategory}
                  onChange={() => {
                    setIsCustomCategory(true);
                    setSelectedCategory(''); // カスタム選択時にテキスト入力をクリア
                  }}
                  className="mr-2"
                />
                その他（自由入力）
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

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition duration-200 disabled:opacity-60"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition duration-200 disabled:opacity-60"
            >
              {isSaving ? '保存中...' : 'この内容で保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
