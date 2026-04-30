""" KataGo 高级AI 围棋后端服务
使用 Flask 提供 API 接口，调用 KataGo 引擎进行落子

使用方法:
1. 确保已安装 KataGo (https://github.com/lightvector/KataGo)
2. 下载 KataGo 模型权重文件 (e.g. g170-b10c128-s1140687812-d204742456.bin.gz)
3. 运行: python katago_api.py
4. 后端会在 http://localhost:5003/ai 监听请求
"""

import subprocess
import json
import socket
import threading
import time
import os
import urllib.request
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ========== 配置 ==========
KATAGO_PATH = os.environ.get('KATAGO_PATH', r'C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64\katago.exe')  # KataGo 可执行文件路径
MODEL_PATH = os.environ.get('MODEL_PATH', r'C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64\kata1-zhizi-b28c512nbt-muonfd2.bin.gz')  # 模型文件路径
CONFIG_PATH = os.environ.get('CONFIG_PATH', r'C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64\fast_gtp.cfg')  # 使用快速配置
MODEL_URL = os.environ.get('MODEL_URL', '')  # 可选：模型下载地址（模型不存在时自动下载）

# 思考时间配置（秒）
DEFAULT_THREADS = int(os.environ.get('KATAGO_THREADS', '2'))
DEFAULT_SIMULATIONS = int(os.environ.get('KATAGO_SIMULATIONS', '50'))  # 默认50次模拟，减少算力
DEFAULT_MAX_TIME = float(os.environ.get('KATAGO_MAX_TIME', '3.0'))

# 全局 GTP 引擎实例（线程不安全，需要加锁）
gtp_lock = threading.Lock()
engine_process = None
engine_ready = False


def init_katago():
    """初始化 KataGo GTP 引擎"""
    global engine_process, engine_ready
    
    print("正在初始化 KataGo 引擎...")
    print(f"  KataGo 路径: {KATAGO_PATH}")
    print(f"  模型路径: {MODEL_PATH}")
    
    if (not os.path.exists(MODEL_PATH)) and MODEL_URL:
        try:
            os.makedirs(os.path.dirname(MODEL_PATH) or '.', exist_ok=True)
            print(f"模型文件不存在，尝试下载: {MODEL_URL}")
            with urllib.request.urlopen(MODEL_URL) as resp, open(MODEL_PATH, 'wb') as f:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)
            print(f"模型下载完成: {MODEL_PATH}")
        except Exception as e:
            print(f"模型下载失败: {e}")

    # 检查模型文件是否存在
    if not os.path.exists(MODEL_PATH):
        print(f"警告: 模型文件不存在: {MODEL_PATH}")
        print("请下载 KataGo 模型文件:")
        print("  wget https://media.katago.org/katago/models/g170/1x256/model.bin.gz")
        print("  或从 https://katago.org/#other-models 下载")
        return False
    
    try:
        # 启动 KataGo 作为 GTP 引擎
        # 使用 gtp mode，这是标准的 GTP 协议接口
        cmd = [
            KATAGO_PATH,
            'gtp',
            '-model', MODEL_PATH,
            '-config', CONFIG_PATH,
        ]
        
        print(f"启动命令: {' '.join(cmd)}")
        engine_process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # 等待引擎启动并发送初始命令
        time.sleep(1)
        
        # 测试引擎是否响应
        response = send_gtp_command("name")
        if response:
            print(f"KataGo 引擎名称: {response}")
            engine_ready = True
            return True
        else:
            print("KataGo 引擎无响应")
            return False
            
    except Exception as e:
        print(f"初始化 KataGo 失败: {e}")
        return False


def send_gtp_command(cmd: str, timeout: float = 10.0) -> str:
    """发送 GTP 命令到 KataGo 引擎"""
    global engine_process
    
    if not engine_process or engine_process.poll() is not None:
        return None
    
    try:
        # GTP 协议格式: 命令 + 换行
        engine_process.stdin.write(cmd + '\n')
        engine_process.stdin.flush()
        
        # 读取响应（格式: = 内容 或 ? 错误）
        response_lines = []
        start_time = time.time()
        empty_count = 0
        
        while time.time() - start_time < timeout:
            line = engine_process.stdout.readline()
            if not line:
                if engine_process.poll() is not None:
                    break
                time.sleep(0.01)
                continue
            
            line = line.strip()
            if not line:
                empty_count += 1
                if empty_count >= 2:  # 连续两个空行表示结束
                    break
                continue
            
            empty_count = 0
            
            if line.startswith('='):
                # 成功响应
                content = line[1:].strip()
                if content:
                    response_lines.append(content)
                continue
            elif line.startswith('?'):
                # 错误响应
                return None
            elif response_lines:  # 已经收到 = 开头，后续行都是内容
                response_lines.append(line)
        
        return '\n'.join(response_lines) if response_lines else None
        
    except Exception as e:
        print(f"GTP 命令执行错误: {e}")
        return None


def board_to_gtp_coords(board, size):
    """将棋盘坐标转换为 GTP 坐标 (如 'dd' 表示第4行第4列)"""
    # GTP 使用 A-T 跳过 I
    def col_to_gtp(c):
        return chr(ord('A') + c if c < 8 else c + 1)
    def row_to_gtp(r):
        return str(size - r)
    
    moves = []
    for r in range(size):
        for c in range(size):
            if board[r][c] != 0:  # 0 = 空, 1 = 黑, 2 = 白
                color = 'B' if board[r][c] == 1 else 'W'
                coord = col_to_gtp(c) + row_to_gtp(r)
                moves.append((color, coord))
    return moves


def gtp_to_board_coords(gtp_coord, size):
    """将 GTP 坐标转换为棋盘 [row, col]"""
    if gtp_coord == 'pass':
        return None
    if gtp_coord == 'resign':
        return None
    
    col_char = gtp_coord[0]
    row_str = gtp_coord[1:]
    
    # GTP 列: A-T 跳过 I
    if col_char <= 'H':
        col = ord(col_char) - ord('A')
    else:
        col = ord(col_char) - ord('A') - 1
    
    row = size - int(row_str)
    return [row, col]


@app.route('/ai', methods=['POST'])
def get_ai_move():
    """主 API: 获取 AI 落子"""
    global engine_ready
    
    data = request.get_json()
    
    board = data.get('board', [])
    current_player = data.get('current_player', 1)  # 1 = 黑, 2 = 白
    size = data.get('size', 19)
    difficulty = data.get('difficulty', 'advanced')
    move_history = data.get('move_history', [])
    
    # 根据难度调整思考时间（降低以改善用户体验）
    if difficulty == 'advanced':
        max_time = 3.0
        simulations = 100
    elif difficulty == 'intermediate':
        max_time = 2.0
        simulations = 50
    else:
        max_time = 1.0
        simulations = 30
    
    # 如果引擎未初始化，尝试初始化
    if not engine_ready:
        with gtp_lock:
            if not init_katago():
                return jsonify({'error': 'KataGo 引擎未初始化'}), 500
    
    try:
        with gtp_lock:
            # 设置棋盘大小
            send_gtp_command(f"boardsize {size}", timeout=5)
            
            # 清空棋盘
            send_gtp_command("clear_board", timeout=5)
            
            # 设置颜色
            color = 'B' if current_player == 1 else 'W'
            
            # 如果有历史记录，先复盘
            if move_history and len(move_history) > 0:
                recent = move_history[-60:]
                for i, move in enumerate(recent):
                    col = None
                    row = None
                    move_color = None

                    if isinstance(move, dict):
                        if move.get('x') is not None and move.get('y') is not None:
                            col = int(move['x'])
                            row = int(move['y'])
                            move_color = 'B' if int(move.get('color', 1)) == 1 else 'W'
                    elif isinstance(move, (list, tuple)) and len(move) >= 2:
                        row = int(move[0])
                        col = int(move[1])
                        move_color = 'B' if (i % 2 == 0) else 'W'

                    if col is None or row is None or move_color is None:
                        continue

                    col_char = chr(ord('A') + col if col < 8 else col + 1)
                    gtp_coord = f"{col_char}{size - row}"
                    send_gtp_command(f"play {move_color} {gtp_coord}", timeout=5)
            
            # 设置 KataGo 分析命令
            # 发送 GTP komi 命令（贴目）
            komi = 6.5
            send_gtp_command(f"komi {komi}", timeout=5)
            
            # 直接使用 genmove 命令（更可靠）
            # 不使用 kata1_analyze，因为它返回格式复杂且容易出问题
            gtp_color = 'B' if current_player == 1 else 'W'
            move = send_gtp_command(f"genmove {gtp_color}", timeout=max_time + 5)
            
            if move:
                if move.lower() == 'pass':
                    return jsonify({'pass': True})
                elif move.lower() == 'resign':
                    return jsonify({'resign': True})
                else:
                    coords = gtp_to_board_coords(move, size)
                    if coords:
                        return jsonify({
                            'x': coords[1],
                            'y': coords[0],
                            'winrate': 0.5,
                        })
            
            # 降级：随机合法走法
            import random
            valid_moves = []
            for r in range(size):
                for c in range(size):
                    if board[r][c] == 0:
                        valid_moves.append([r, c])
            
            if valid_moves:
                move = random.choice(valid_moves)
                return jsonify({
                    'x': move[1],
                    'y': move[0],
                    'winrate': 0.5,
                })
            
            return jsonify({'pass': True})
            
    except Exception as e:
        print(f"处理请求时出错: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    global engine_ready
    return jsonify({
        'status': 'running',
        'engine_ready': engine_ready,
    })


@app.route('/init', methods=['POST'])
def init():
    """手动初始化引擎"""
    global engine_ready
    
    with gtp_lock:
        if init_katago():
            return jsonify({'status': 'success', 'message': 'KataGo 引擎初始化成功'})
        else:
            return jsonify({'status': 'error', 'message': 'KataGo 引擎初始化失败'}), 500


def cleanup():
    """清理资源"""
    global engine_process
    if engine_process:
        try:
            engine_process.stdin.write("quit\n")
            engine_process.stdin.flush()
            engine_process.terminate()
            engine_process.wait(timeout=5)
        except:
            pass


if __name__ == '__main__':
    import atexit
    
    # 注册清理函数
    atexit.register(cleanup)
    
    # 尝试初始化
    if not init_katago():
        print("警告: KataGo 引擎初始化失败，API 将返回错误")
    
    # 获取端口配置
    PORT = int(os.environ.get('KATAGO_PORT', '5000'))
    
    print("\n" + "="*50)
    print(f"KataGo AI 高级服务已启动 (端口: {PORT}, 模拟次数: {DEFAULT_SIMULATIONS})")
    print("="*50)
    print(f"API 端点: http://localhost:{PORT}/ai")
    print(f"健康检查: http://localhost:{PORT}/health")
    print(f"手动初始化: POST http://localhost:{PORT}/init")
    print("\n按 Ctrl+C 停止服务")
    print("="*50 + "\n")
    
    # 启动 Flask 服务
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
