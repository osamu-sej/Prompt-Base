import { useState, useEffect, useMemo } from 'react';
import CreatePrompt from './components/CreatePrompt';
import { ChevronDownIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'; // アイコンをインポート
import './index.css';

// Promptの型定義を更新
interface Prompt {
  id: number;
  title: string;
  category: string;
  content: string;
  summary: string;
  tags: string;
  created_at: string;
}

// カテゴリごとにグループ化されたプロンプトの型
type GroupedPrompts = Record<string, Prompt[]>;

// 単一のプロンプトを表示するカードコンポーネント
const PromptCard = ({ prompt }: { prompt: Prompt }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt.content);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000); // 2秒後にアイコンを元に戻す
    };

    return (
        <div className="bg-white shadow rounded-md p-5 transition-all duration-300">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <h4 className="text-md font-bold text-gray-800">{prompt.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{prompt.summary}</p>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                         <h5 className="text-sm font-semibold text-gray-600">プロンプト全文</h5>
                        <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                            {hasCopied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardDocumentIcon className="w-5 h-5 text-gray-500" />}
                        </button>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap bg-violet-50/50 border border-violet-100 p-3 rounded-lg mb-4">{prompt.content}</p>
                    <div className="flex flex-wrap gap-2">
                        {prompt.tags && prompt.tags.split(',').map(tag => tag.trim()).filter(t => t).map((tag, index) => (
                            <span key={index} className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-violet-50 text-violet-700">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({});

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/prompts');
      if (!response.ok) {
        throw new Error('プロンプトの取得に失敗しました。');
      }
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handlePromptCreated = (newPrompt: Prompt) => {
    setPrompts((prevPrompts) => [newPrompt, ...prevPrompts]);
    // 新しいプロンプトが属するカテゴリをデフォルトで開く
    setActiveCategories(prev => ({ ...prev, [newPrompt.category]: true }));
  };

  const groupedPrompts = useMemo<GroupedPrompts>(() => {
    return prompts.reduce((acc, prompt) => {
      const category = prompt.category || '未分類';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(prompt);
      return acc;
    }, {} as GroupedPrompts);
  }, [prompts]);

  const toggleCategory = (category: string) => {
    setActiveCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Prompt Base</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <CreatePrompt onPromptCreated={handlePromptCreated} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Saved Prompts</h2>
          <div className="space-y-6">
            {Object.entries(groupedPrompts).map(([category, promptsInCategory]) => (
              <div key={category} className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl overflow-hidden">
                <div
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-800">
                        {category}
                    </span>
                    <span className="text-gray-500 text-sm">{promptsInCategory.length} prompts</span>
                  </div>
                  <ChevronDownIcon className={`w-6 h-6 text-gray-500 transform transition-transform ${activeCategories[category] ? 'rotate-180' : ''}`} />
                </div>
                
                {activeCategories[category] && (
                  <div className="px-5 pb-5 space-y-4">
                    {promptsInCategory.map((prompt) => (
                      <PromptCard key={prompt.id} prompt={prompt} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;