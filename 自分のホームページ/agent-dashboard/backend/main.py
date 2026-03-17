import asyncio
import json
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
import os

app = FastAPI()

# --- 状態管理・保存用 ---
class SaveRequest(BaseModel):
    content: str

@app.post("/save-portfolio")
async def save_portfolio(request: SaveRequest):
    # ポートフォリオファイルのパスを指定
    portfolio_path = "/Users/sadokaito/Downloads/自分のホームページ/portfolio-2.html"
    try:
        with open(portfolio_path, "w", encoding="utf-8") as f:
            f.write(request.content)
        return {"status": "success", "message": "Portfolio saved successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 状態管理 ---
state = {
    "overview": {
        "totalTasks": 15,
        "runningTasks": 1,
        "completedTasks": 12,
        "failedTasks": 2,
        "queuedTasks": 0
    },
    "queue": [],
    "logs": [],
    "execution": {
        "runtime": "0.0s",
        "exitCode": "-",
        "stdout": "",
        "stderr": "",
        "cpu": 0,
        "memory": 0
    },
    "resources": {
        "cpu": 10.0,
        "ram": 45.0,
        "gpu": 5.0,
        "tokens": 125000
    },
    "quality": {
        "testsPassed": 0,
        "testsTotal": 0,
        "lintErrors": 0,
        "compileErrors": 0
    },
    "output": {
        "fileName": "",
        "code": ""
    },
    "trace": {
        "prompt": "",
        "model": "",
        "response": "",
        "tool": ""
    },
    "workflow": {
        "currentAgent": "planner", # planner, coder, tester, reviewer
        "agents": ["planner", "coder", "tester", "reviewer"]
    }
}

clients = []

def generate_id():
    return f"TASK-{random.randint(1000, 9999)}"

def format_time():
    return datetime.now().strftime("%H:%M:%S")

def add_log(msg):
    state["logs"].append({"time": format_time(), "msg": msg})
    if len(state["logs"]) > 50:
        state["logs"].pop(0)

# --- マルチエージェントシミュレーション ---
async def agent_workflow_loop():
    while True:
        task_id = generate_id()
        task_name = f"Implement Feature {random.choice(['Auth', 'Dashboard', 'API', 'DB'])}"
        
        # 1. Planner
        state["workflow"]["currentAgent"] = "planner"
        state["queue"] = [{"id": task_id, "name": task_name, "agent": "planner", "status": "running", "duration": "0s"}]
        add_log(f"[{task_id}] Planner: Analyzing requirements for {task_name}")
        state["trace"] = {
            "prompt": f"Design architecture for {task_name}",
            "model": "gpt-4-turbo",
            "response": "Architecture designed. Tasks split into 3 steps.",
            "tool": "None"
        }
        await broadcast()
        await asyncio.sleep(2)
        
        # 2. Coder
        state["workflow"]["currentAgent"] = "coder"
        state["queue"][0]["agent"] = "coder"
        add_log(f"[{task_id}] Coder: Generating code...")
        state["resources"]["cpu"] = random.uniform(40, 80)
        state["resources"]["ram"] = random.uniform(50, 70)
        state["resources"]["tokens"] += random.randint(1000, 3000)
        
        state["output"] = {
            "fileName": "auth_service.py",
            "code": f"def init_{task_name.lower().replace(' ', '_')}():\n    print('Initializing...')\n    return True\n"
        }
        state["trace"] = {
            "prompt": "Implement the core logic.",
            "model": "claude-3-opus",
            "response": "```python\ndef init()...```",
            "tool": "write_file"
        }
        await broadcast()
        await asyncio.sleep(3)

        # 3. Tester
        state["workflow"]["currentAgent"] = "tester"
        state["queue"][0]["agent"] = "tester"
        add_log(f"[{task_id}] Tester: Running unit tests...")
        state["execution"]["cpu"] = random.uniform(10, 30)
        state["execution"]["runtime"] = f"{random.uniform(0.5, 2.0):.1f}s"
        
        tests_passed = random.choice([True, False])
        if tests_passed:
            state["execution"]["exitCode"] = "0"
            state["execution"]["stdout"] = "test_auth_service.py ... ok\n1 passed in 0.12s"
            state["execution"]["stderr"] = ""
            state["quality"] = {"testsPassed": 1, "testsTotal": 1, "lintErrors": 0, "compileErrors": 0}
            add_log(f"[{task_id}] Tester: Tests passed successfully.")
        else:
            state["execution"]["exitCode"] = "1"
            state["execution"]["stdout"] = ""
            state["execution"]["stderr"] = "AssertionError: Expected True, got False"
            state["quality"] = {"testsPassed": 0, "testsTotal": 1, "lintErrors": 2, "compileErrors": 0}
            add_log(f"[{task_id}] Tester: Tests failed. Sending back to Coder.")
            # エラー時はここでループをスキップしてやり直し表現も可能だが今回は次へ
            
        await broadcast()
        await asyncio.sleep(2)
        
        # 4. Reviewer
        state["workflow"]["currentAgent"] = "reviewer"
        state["queue"][0]["agent"] = "reviewer"
        add_log(f"[{task_id}] Reviewer: Checking code quality and logic...")
        await asyncio.sleep(2)
        
        if tests_passed:
            add_log(f"[{task_id}] Reviewer: LGTM. Task Completed.")
            state["overview"]["completedTasks"] += 1
            state["queue"][0]["status"] = "completed"
        else:
            add_log(f"[{task_id}] Reviewer: Code requires changes due to test failure.")
            state["overview"]["failedTasks"] += 1
            state["queue"][0]["status"] = "failed"
            
        state["overview"]["totalTasks"] += 1
        await broadcast()
        await asyncio.sleep(3)


async def broadcast():
    if clients:
        message = json.dumps(state)
        # 接続中の全クライアントに送信
        dead_clients = []
        for client in clients:
            try:
                await client.send_text(message)
            except Exception:
                dead_clients.append(client)
        for client in dead_clients:
            clients.remove(client)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    # 接続直後に初回データを送信
    await websocket.send_text(json.dumps(state))
    try:
        while True:
            # クライアントからのメッセージを受信（今回は特に使わないが接続維持に必要）
            data = await websocket.receive_text()
    except Exception:
        if websocket in clients:
            clients.remove(websocket)

@app.on_event("startup")
async def startup_event():
    # バックグラウンドタスクとしてシミュレーションを開始
    asyncio.create_task(agent_workflow_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
