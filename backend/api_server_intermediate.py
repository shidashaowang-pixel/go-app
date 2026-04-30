"""
围棋AI 中级API服务
================
使用训练好的PyTorch模型，配合较少MCTS搜索次数
比高级AI更快，适合中级难度

启动方式:
  python api_server_intermediate.py

API接口:
  POST /ai
  Body: {"board": [[0,1,2,...],...], "current_player": 1, "size": 19}
  Response: {"x": 3, "y": 15, "pass": false, "winrate": 0.72}
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import numpy as np
import os
import time

from go_rules import legal, place, board_hash, BOARD_SIZE
from model import GoNet, board_to_tensor
from search import mcts_search

# ======================== 配置 ========================
BOARD_SIZE = 19
MODEL_PATH = os.environ.get('GO_MODEL_PATH', r'C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth')  # 默认使用v3训练模型
MCTS_ITERATIONS = int(os.environ.get('GO_MCTS_ITERS', '80'))  # 比高级AI更少搜索，更快但稍弱
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
PORT = int(os.environ.get('GO_API_PORT', '5001'))  # 中级AI使用5001端口

# ======================== Flask ========================
app = Flask(__name__)
CORS(app)

# ======================== 加载模型 ========================
print(f"Loading model from {MODEL_PATH} on {DEVICE}...")

def load_checkpoint_or_model(path, net, device):
    """加载模型，支持 checkpoint 和纯模型权重"""
    checkpoint = torch.load(path, map_location=device)
    
    # 如果是 checkpoint（包含 net/opt 等），提取模型权重
    if isinstance(checkpoint, dict):
        if 'net' in checkpoint:
            state_dict = checkpoint['net']
        elif 'model' in checkpoint:
            state_dict = checkpoint['model']
        elif 'state_dict' in checkpoint:
            state_dict = checkpoint['state_dict']
        else:
            # 可能是纯模型权重
            state_dict = checkpoint
    else:
        state_dict = checkpoint
    
    # 移除可能的 'module.' 前缀（多卡训练时）
    new_state_dict = {}
    for k, v in state_dict.items():
        name = k.replace('module.', '')
        new_state_dict[name] = v
    
    net.load_state_dict(new_state_dict, strict=False)
    return net

try:
    net = GoNet(board_size=BOARD_SIZE, num_res_blocks=5, channels=128).to(DEVICE)
    
    if os.path.exists(MODEL_PATH):
        load_checkpoint_or_model(MODEL_PATH, net, DEVICE)
        print(f"Model loaded: {MODEL_PATH}")
    else:
        # 尝试其他模型文件
        candidates = [
            'go19_v3_checkpoint.pth',
            'go_checkpoint.pth',
            'go_model.pth',
            'go19_net_epoch_20.pth',
        ]
        loaded = False
        for c in candidates:
            if os.path.exists(c):
                load_checkpoint_or_model(c, net, DEVICE)
                print(f"Model loaded: {c}")
                loaded = True
                break
        if not loaded:
            print("[WARN] No model file found! Using random initialization.")
except Exception as e:
    print(f"[ERROR] Failed to load model: {e}")
    import traceback
    traceback.print_exc()
    net = None

if net is not None:
    net.eval()
    nparams = sum(p.numel() for p in net.parameters())
    print(f"Model params: {nparams:,} | Device: {DEVICE} | MCTS iters: {MCTS_ITERATIONS}")
else:
    print("Warning: Model not loaded, AI will use random moves!")


@app.route('/ai', methods=['POST'])
def ai_move():
    """
    AI落子API（中级）
    """
    try:
        data = request.get_json()
        board = data.get('board')
        current = data.get('current_player', 1)
        size = data.get('size', BOARD_SIZE)

        if board is None:
            return jsonify({'error': 'Missing board data'}), 400

        if net is None:
            return jsonify({'error': 'Model not loaded'}), 500

        history = set()
        history.add(board_hash(board))

        t0 = time.time()

        # MCTS搜索（使用较少的迭代次数，更快）
        move, probs = mcts_search(
            board, current, history, net,
            iterations=MCTS_ITERATIONS,
            temperature=0.5,  # 中级AI加一点随机性
            add_dirichlet=True,  # 加噪声增加变化
            size=size
        )

        dt = time.time() - t0

        # 评估胜率
        tensor = board_to_tensor(board, current, size=size).to(DEVICE)
        with torch.no_grad():
            _, value = net(tensor)
            winrate = value.item()
            if current == 2:
                winrate = -winrate
            winrate = (winrate + 1) / 2

        if move is None:
            print(f"[Intermediate] AI pass | player={current} | winrate={winrate:.2f} | {dt:.2f}s")
            return jsonify({
                'x': -1,
                'y': -1,
                'pass': True,
                'winrate': round(winrate, 4),
            })

        x, y = move
        print(f"[Intermediate] AI move: ({x},{y}) | player={current} | winrate={winrate:.2f} | {dt:.2f}s")

        return jsonify({
            'x': x,
            'y': y,
            'pass': False,
            'winrate': round(winrate, 4),
        })

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'level': 'intermediate',
        'model': MODEL_PATH if os.path.exists(MODEL_PATH) else 'random',
        'device': str(DEVICE),
        'mcts_iters': MCTS_ITERATIONS,
    })


if __name__ == '__main__':
    print(f"\n{'='*50}")
    print(f"  Go AI Intermediate API Server")
    print(f"  Model: {MODEL_PATH}")
    print(f"  Device: {DEVICE}")
    print(f"  MCTS: {MCTS_ITERATIONS} iterations (faster)")
    print(f"  Port: {PORT}")
    print(f"{'='*50}\n")

    app.run(host='0.0.0.0', port=PORT, debug=False)
