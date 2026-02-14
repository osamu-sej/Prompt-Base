import { useState, useEffect, useMemo } from 'react';
import CreatePrompt from './components/CreatePrompt';
import { ChevronDownIcon, ClipboardDocumentIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline'; // アイコンをインポート
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
        <div className="bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md border border-white/80 rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 border-l-4 border-l-violet-400">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="min-w-0 flex-1 mr-3">
                    <h4 className="text-md font-bold text-slate-800">{prompt.title}</h4>
                    <p className="text-sm text-slate-500 mt-1 truncate">{prompt.summary}</p>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-400 flex-shrink-0 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                         <h5 className="text-sm font-semibold text-slate-500">プロンプト全文</h5>
                        <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-violet-50 transition-colors duration-200">
                            {hasCopied ? <CheckIcon className="w-5 h-5 text-emerald-500" /> : <ClipboardDocumentIcon className="w-5 h-5 text-slate-400 hover:text-violet-500" />}
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
      <header className="bg-gradient-to-r from-violet-700 via-indigo-700 to-violet-800 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm p-2 rounded-lg">
                <SparklesIcon className="w-6 h-6 text-violet-200" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">Prompt Base</h1>
                <p className="text-violet-200 text-xs -mt-0.5">AI-Powered Prompt Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/30 text-violet-200 border border-violet-400/30">
                v1.0
              </span>
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
              <div key={category} className="bg-white/60 backdrop-blur-md shadow-md hover:shadow-lg border border-white/80 rounded-2xl overflow-hidden transition-all duration-300">
                <div
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-violet-50/30 transition-colors duration-200"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 inline-flex text-sm leading-5 font-semibold rounded-lg bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-700 shadow-sm">
                        {category}
                    </span>
                    <span className="text-slate-400 text-sm font-medium">{promptsInCategory.length} prompts</span>
                  </div>
                  <ChevronDownIcon className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 ${activeCategories[category] ? 'rotate-180' : ''}`} />
                </div>

                {activeCategories[category] && (
                  <div className="px-5 pb-5 space-y-3">
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