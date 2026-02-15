import { useState } from 'react';
import CategorySuggestionModal from './CategorySuggestionModal';

const API_BASE = 'http://localhost:8000';

// 親コンポーネントと共有する型定義
interface Prompt {
  id: number;
  title: string;
  category: string;
  content: string;
  summary: string;
  tags: string;
  created_at: string | null;
}

interface Props {
  onPromptCreated: (newPrompt: Prompt) => void;
}

interface AiSuggestion {
  summary: string;
  suggested_categories: string[];
}

export default function CreatePrompt({ onPromptCreated }: Props) {
  const [content, setContent] = useState('');
  
  // 状態管理を細分化
  const [isSuggesting, setIsSuggesting] = useState(false); // カテゴリ提案APIのローディング
  const [isSaving, setIsSaving] = useState(false);         // 保存APIのローディング
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ステップ1: AIにカテゴリと要約を提案させる
  const handleSuggestCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('プロンプトを入力してください。');
      return;
    }
    
    setError(null);
    setIsSuggesting(true);

    try {
      const response = await fetch(`${API_BASE}/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'カテゴリの提案に失敗しました。');
      }

      const suggestion: AiSuggestion = await response.json();
      setAiSuggestion(suggestion);
      setModalIsOpen(true);

    } catch (err: any) {
      setError(err.message);
      console.error('Error suggesting category:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  // ステップ2: ユーザーが選択したカテゴリで最終的に保存する
  const handleFinalSubmit = async (selectedCategory: string) => {
    if (!aiSuggestion) return;

    setError(null);
    setIsSaving(true);

    const newPromptPayload = {
      category: selectedCategory,
      content,
      summary: aiSuggestion.summary,
    };

    try {
      const response = await fetch(`${API_BASE}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromptPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '保存に失敗しました。');
      }

      const newPrompt: Prompt = await response.json();
      
      // 成功したらフォームと状態をリセット
      setContent('');
      setModalIsOpen(false);
      setAiSuggestion(null);
      alert('プロンプトを保存しました！');
      
      // 親コンポーネントに通知
      onPromptCreated(newPrompt);

    } catch (err: any) {
      setError(err.message);
      console.error('Error saving prompt:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCloseModal = () => {
    setModalIsOpen(false);
    setAiSuggestion(null);
  };

  return (
    <>
      <form onSubmit={handleSuggestCategory} className="mb-8 bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-md hover:shadow-lg border border-white/80 transition-all duration-300">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">Create New Prompt</h2>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl relative mb-4" role="alert">
                <strong className="font-bold">エラー: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        <div className="mb-5">
          <label htmlFor="content" className="block text-slate-600 font-semibold mb-2 text-sm">
            Prompt
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ここにプロンプトを入力してください..."
            rows={5}
            required
            className="shadow-sm appearance-none border border-slate-200 rounded-lg w-full py-2.5 px-3 text-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition duration-200"
          />
        </div>

        <button
          type="submit"
          disabled={isSuggesting}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md"
        >
          {isSuggesting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AIが分析中...
            </span>
          ) : 'AIでカテゴリを提案'}
        </button>
      </form>

      {aiSuggestion && (
        <CategorySuggestionModal
          isOpen={modalIsOpen}
          summary={aiSuggestion.summary}
          suggestedCategories={aiSuggestion.suggested_categories}
          onSubmit={handleFinalSubmit}
          onClose={handleCloseModal}
          isSaving={isSaving}
        />
      )}
    </>
  );
}