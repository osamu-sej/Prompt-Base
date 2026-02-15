from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
import json

# .envファイルから環境変数を読み込む
load_dotenv()

app = FastAPI()

# フロントエンド(React)からのアクセスを許可する設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "prompts.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            category TEXT,
            content TEXT,
            tags TEXT,
            summary TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 既存テーブルへのカラム追加（初回以降はエラーになるが無視してOK）
    try:
        cursor.execute('ALTER TABLE prompts ADD COLUMN title TEXT')
    except sqlite3.OperationalError:
        pass # 既にカラムが存在する場合
    try:
        cursor.execute('ALTER TABLE prompts ADD COLUMN tags TEXT')
    except sqlite3.OperationalError:
        pass # 既にカラムが存在する場合
    try:
        cursor.execute('ALTER TABLE prompts ADD COLUMN summary TEXT')
    except sqlite3.OperationalError:
        pass # 既にカラムが存在する場合

    conn.commit()
    conn.close()

init_db()

# --- Pydanticモデル定義 ---
class PromptCreate(BaseModel):
    category: str
    content: str
    summary: str # 要約をクライアントから受け取る

class CategorizeRequest(BaseModel):
    content: str

# --- Gemini関連の関数 ---

def _parse_llm_json_response(response_content: str) -> dict:
    """LLMからのJSON文字列（マークダウンを含む可能性）をパースする"""
    json_str = response_content.strip()
    if json_str.startswith("```json"):
        json_str = json_str[7:]
    if json_str.endswith("```"):
        json_str = json_str[:-3]
    return json.loads(json_str.strip())

def _fallback_summary_and_category(content: str):
    """Gemini APIが使えない場合のフォールバック（簡易キーワードベース）"""
    summary = content[:50] + ("..." if len(content) > 50 else "")
    categories = ["一般", "テキスト生成", "その他"]
    keyword_map = {
        "コード": ["プログラミング", "コード生成", "開発"],
        "python": ["プログラミング", "Python", "開発"],
        "翻訳": ["翻訳", "言語", "ローカライゼーション"],
        "要約": ["要約", "テキスト処理", "分析"],
        "メール": ["ビジネス", "メール作成", "コミュニケーション"],
        "ブログ": ["ライティング", "ブログ", "コンテンツ作成"],
        "マーケティング": ["マーケティング", "広告", "ビジネス"],
        "教育": ["教育", "学習", "チュートリアル"],
    }
    content_lower = content.lower()
    for keyword, cats in keyword_map.items():
        if keyword.lower() in content_lower:
            categories = cats
            break
    return {"summary": summary, "suggested_categories": categories}

def generate_summary_and_category(content: str, existing_categories: list[str]):
    """Geminiを使ってプロンプトの要約とカテゴリを生成する。失敗時はフォールバック。"""
    if not os.getenv("GEMINI_API_KEY"):
        print("GEMINI_API_KEYが設定されていません。フォールバックモードで動作します。")
        return _fallback_summary_and_category(content)

    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)

        category_hint = f"既存のカテゴリの例です: {', '.join(existing_categories)}" if existing_categories else "まだカテゴリはありません。"

        prompt_template = f"""
        以下のプロンプトの内容を分析し、「1行での短い要約(summary)」と、このプロンプトに最も関連性の高い「カテゴリ(suggested_categories)」を3つ提案してください。
        {category_hint} 提案するカテゴリは既存の例に囚われる必要はありませんが、参考にしてください。

        回答は必ず以下のJSON形式で返してください。
        {{
          "summary": "（ここに1行の短い要約）",
          "suggested_categories": ["（カテゴリ1）", "（カテゴリ2）", "（カテゴリ3）"]
        }}

        プロンプト:
        ---
        {content}
        ---
        """

        response = llm.invoke(prompt_template)
        data = _parse_llm_json_response(response.content)
        return data

    except Exception as e:
        print(f"Gemini API呼び出しでエラーが発生しました。フォールバックモードに切り替えます: {e}")
        return _fallback_summary_and_category(content)

def generate_title_and_tags(content: str):
    """Geminiを使ってプロンプトのタイトルとタグを生成する。失敗時はフォールバック。"""
    fallback_title = content[:30] + "..." if len(content) > 30 else content
    fallback_tags = ""

    if not os.getenv("GEMINI_API_KEY"):
        print("GEMINI_API_KEYが設定されていません。タイトルとタグの自動生成をスキップします。")
        return fallback_title, fallback_tags

    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)

        prompt_template = f"""
        以下のプロンプトの内容を分析し、最適な「タイトル(title)」と「タグ(tags)」を生成してください。
        回答は必ず以下のJSON形式で返してください。
        {{
          "title": "（ここにタイトル）",
          "tags": "（ここにカンマ区切りのタグ）"
        }}

        プロンプト:
        ---
        {content}
        ---
        """

        response = llm.invoke(prompt_template)
        data = _parse_llm_json_response(response.content)
        return data["title"], data["tags"]

    except Exception as e:
        print(f"Gemini API呼び出しでエラーが発生しました。フォールバックを使用します: {e}")
        return fallback_title, fallback_tags

# --- APIエンドポイント定義 ---

@app.post("/categorize")
def categorize_prompt(request: CategorizeRequest):
    """プロンプトの内容を受け取り、AIがカテゴリと要約を提案する"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # 既存のカテゴリ一覧を取得してAIへのヒントにする
        cursor.execute("SELECT DISTINCT category FROM prompts WHERE category IS NOT NULL AND category != ''")
        rows = cursor.fetchall()
        existing_categories = [row[0] for row in rows]
        conn.close()
        
        ai_response = generate_summary_and_category(request.content, existing_categories)
        return ai_response
    except ValueError as e:
         raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise e # 内部で発生したHTTPExceptionをそのまま再送出
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"サーバー内部エラー: {e}")


@app.post("/prompts")
def create_prompt(prompt: PromptCreate):
    """カテゴリ、要約を含むプロンプトをDBに保存する"""
    title, tags = generate_title_and_tags(prompt.content)

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO prompts (title, category, content, summary, tags) VALUES (?, ?, ?, ?, ?)",
            (title, prompt.category, prompt.content, prompt.summary, tags)
        )
        conn.commit()
        last_id = cursor.lastrowid
        
        # 保存したデータを取得して返す
        cursor.execute("SELECT * FROM prompts WHERE id = ?", (last_id,))
        new_prompt_row = cursor.fetchone()
        conn.close()

        if new_prompt_row is None:
            raise HTTPException(status_code=404, detail="作成したプロンプトが見つかりません。")

        # Rowオブジェクトを辞書に変換
        new_prompt_dict = dict(zip([c[0] for c in cursor.description], new_prompt_row))
        
        return new_prompt_dict

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/prompts")
def get_prompts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row # Rowオブジェクトとして結果を取得
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, category, content, summary, tags, created_at FROM prompts ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    # Rowオブジェクトを直接辞書に変換してリストを生成
    return [dict(row) for row in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)