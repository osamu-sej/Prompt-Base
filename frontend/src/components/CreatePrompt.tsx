import { useState } from 'react';
import CategorySuggestionModal from './CategorySuggestionModal';

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
      // Viteの設定でプロキシしている'http://localhost:8000'にリクエスト
      const response = await fetch('/categorize', {
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
      // Viteの設定でプロキシしている'http://localhost:8000'にリクエスト
      const response = await fetch('/prompts', {
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
      <form onSubmit={handleSuggestCategory} className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Create New Prompt</h2>

        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">エラー: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="content" className="block text-gray-700 font-bold mb-2">
            Prompt
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ここにプロンプトを入力してください..."
            rows={5}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <button
          type="submit"
          disabled={isSuggesting}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:bg-blue-400"
        >
          {isSuggesting ? '分析中...' : 'AIでカテゴリを提案'}
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