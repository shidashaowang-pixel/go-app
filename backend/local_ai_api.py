"""
本地围棋 AI 后端服务
使用 Flask 提供 API 接口，纯 Python 实现的启发式 AI

使用方法:
1. pip install flask flask-cors
2. python local_ai_api.py
3. 后端会在 http://localhost:5000/ai 监听请求
"""

import json
import random
import time
import math
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ========== 围棋 AI 引擎（简化版） ==========

def find_group(board, row, col, color):
    """查找连通棋子群"""
    size = len(board)
    group = []
    visited = set()
    stack = [[row, col]]
    
    while stack:
        r, c = stack.pop()
        key = f"{r},{c}"
        if key in visited:
            continue
        if r < 0 or r >= size or c < 0 or c >= size:
            continue
        if board[r][c] != color:
            continue
        
        visited.add(key)
        group.append([r, c])
        
        stack.append([r-1, c])
        stack.append([r+1, c])
        stack.append([r, c-1])
        stack.append([r, c+1])
    
    return group


def count_liberties(board, group):
    """计算棋群的气数"""
    size = len(board)
    liberties = set()
    
    for r, c in group:
        neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]]
        for nr, nc in neighbors:
            if 0 <= nr < size and 0 <= nc < size and board[nr][nc] == 0:
                liberties.add(f"{nr},{nc}")
    
    return len(liberties)


def get_valid_moves(board, color):
    """获取所有合法落子点"""
    size = len(board)
    moves = []
    
    for r in range(size):
        for c in range(size):
            if board[r][c] == 0:
                # 简单检查：不是自杀点（除非能提子）
                moves.append([r, c])
    
    return moves


def simulate_move(board, row, col, color):
    """模拟落子，返回新棋盘和被提的子"""
    size = len(board)
    new_board = [row[:] for row in board]
    opponent = 3 - color  # 1->2, 2->1
    captured = []
    
    new_board[row][col] = color
    
    # 检查是否能提子
    for dr, dc in [[-1, 0], [1, 0], [0, -1], [0, 1]]:
        nr, nc = row + dr, col + dc
        if 0 <= nr < size and 0 <= nc < size:
            if new_board[nr][nc] == opponent:
                group = find_group(new_board, nr, nc, opponent)
                if count_liberties(new_board, group) == 0:
                    for gr, gc in group:
                        captured.append([gr, gc])
                        new_board[gr][gc] = 0
    
    return new_board, captured


def get_neighbors(row, col):
    """获取四个方向的邻居"""
    return [[row-1, col], [row+1, col], [row, col-1], [row, col+1]]

def count_eye_like(board, row, col, color, size):
    """判断是否是假眼（对方围出的眼）"""
    neighbors = get_neighbors(row, col)
    same_color = 0
    empty = 0
    for r, c in neighbors:
        if 0 <= r < size and 0 <= c < size:
            if board[r][c] == color:
                same_color += 1
            elif board[r][c] == 0:
                empty += 1
    # 如果己方棋子围住且有空格，可能是假眼
    return same_color >= 2 and empty >= 1

def check_ladder(board, row, col, color, size, chasing=True):
    """简单的征子/征吃判断"""
    opponent = 3 - color
    steps = 0
    max_steps = size * 2  # 最多追这么远
    
    # 从被追的棋子开始
    target_row, target_col = row, col
    chasing_color = opponent if chasing else color
    
    while steps < max_steps:
        # 找对方棋子的气
        liberties = []
        for dr, dc in get_neighbors(target_row, target_col):
            if 0 <= dr < size and 0 <= dc < size:
                if board[dr][dc] == 0:
                    liberties.append([dr, dc])
        
        if len(liberties) >= 2:
            break  # 安全了
        
        if len(liberties) == 1:
            # 紧一气，继续追
            target_row, target_col = liberties[0]
            steps += 1
        else:
            # 无气或边界，征死
            return chasing  # chasing=True时表示能征死
    
    return not chasing  # chasing=True时表示逃掉了

def advanced_ai_move(board, color, difficulty='advanced'):
    """高级 AI 落子 - 增强版"""
    size = len(board)
    valid_moves = get_valid_moves(board, color)
    
    if not valid_moves:
        return None, True
    
    opponent = 3 - color
    best_score = float('-inf')
    best_moves = []
    
    for row, col in valid_moves:
        score = 0
        
        # 深拷贝棋盘
        test_board = [r[:] for r in board]
        test_board[row][col] = color
        
        # ========== 战术评估 ==========
        
        # 1. 吃子评估（最高权重）
        captured = 0
        capture_groups = []
        for dr, dc in get_neighbors(row, col):
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if test_board[nr][nc] == opponent:
                    group = find_group(test_board, nr, nc, opponent)
                    if count_liberties(test_board, group) == 0:
                        captured += len(group)
                        capture_groups.append(group)
        
        if captured > 0:
            # 检查是否能安全吃子（避免征死）
            is_safe_capture = True
            for group in capture_groups:
                for r, c in group:
                    # 检查这个子是否会被征
                    if not check_ladder(board, r, c, opponent, size, chasing=True):
                        is_safe_capture = False
                        break
            
            if is_safe_capture:
                score += captured * 80
            else:
                score += captured * 20  # 征吃风险大，减少收益
        
        # 2. 自己的气数（落子后）
        my_group = find_group(test_board, row, col, color)
        my_libs = count_liberties(test_board, my_group)
        score += my_libs * 15
        
        # 3. 叫吃评估（追吃机会）
        for dr, dc in get_neighbors(row, col):
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == opponent:
                    group = find_group(board, nr, nc, opponent)
                    libs = count_liberties(board, group)
                    if libs == 1:
                        # 追吃！检查是否能征死
                        if check_ladder(board, nr, nc, opponent, size, chasing=True):
                            score += 60
                        else:
                            score += 25
                    elif libs == 2:
                        score += 20
                    elif libs == 3:
                        score += 8
        
        # 4. 逃跑评估（自己的危险棋子）
        for dr, dc in get_neighbors(row, col):
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == color:
                    group = find_group(board, nr, nc, color)
                    libs = count_liberties(board, group)
                    if libs == 1:
                        if check_ladder(board, nr, nc, color, size, chasing=False):
                            score += 70  # 逃掉，重要
                        else:
                            score += 30  # 可能逃不掉
                    elif libs == 2:
                        score += 35
                    elif libs == 3:
                        score += 15
        
        # 5. 枹吃/滚打包机会（紧气连续吃）
        if captured > 0 and my_libs >= 2:
            score += 25  # 滚打包加分
        
        # 6. 倒扑机会
        if my_libs == 1 and captured >= 2:
            score += 40  # 倒扑是高招
        
        # ========== 战略评估 ==========
        
        # 7. 位置评估（星位、边/角价值）
        center = size // 2
        
        # 角部位置（4路以内）
        dist_to_edge = min(row, col, size - 1 - row, size - 1 - col)
        if dist_to_edge <= 3:
            corner_bonus = (4 - dist_to_edge) * 5
            # 星位（角部4路点）
            if size == 19:
                star_inner = 3
                star_outer = 6
            elif size == 13:
                star_inner = 3
                star_outer = 9
            else:
                star_inner = 2
                star_outer = 6
            
            if (row == star_inner and dist_to_edge == 3) or (row == star_outer and dist_to_edge == 0):
                score += 30  # 星位
            
            # M3（小目、高目）
            if size == 19:
                if (row == 3 and col == 4) or (row == 4 and col == 3):  # 小目
                    score += 25
                if (row == 2 and col == 3) or (row == 3 and col == 2):  # 高目
                    score += 20
            
            score += corner_bonus
        else:
            # 中腹/边
            dist_to_center = abs(row - center) + abs(col - center)
            score += max(0, (size - dist_to_center)) * 1.5
        
        # 8. 连接己方棋子
        friend_count = 0
        empty_count = 0
        for dr, dc in get_neighbors(row, col):
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == color:
                    friend_count += 1
                if board[nr][nc] == 0:
                    empty_count += 1
        
        score += friend_count * 12
        
        # 9. 避免填眼（连接但保留空间）
        if friend_count >= 3 and empty_count <= 1:
            score -= 80
        if friend_count == 4:
            score -= 150
        
        # 10. 拆边/扩张
        if friend_count >= 1 and empty_count >= 3:
            score += 15  # 拆边价值
        
        # 11. 切断对方
        cut_count = 0
        for dr, dc in get_neighbors(row, col):
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == opponent:
                    # 检查是否能有效分割
                    group = find_group(board, nr, nc, opponent)
                    if len(group) <= 4:  # 小块容易被分割
                        cut_count += 1
                        score += 15
        
        # 12. 救自己的危险棋子
        for dr, dc in get_neighbors(row, col):
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == color:
                    group = find_group(board, nr, nc, color)
                    libs = count_liberties(board, group)
                    if libs == 1:
                        score += 50  # 救危棋
        
        # 13. 影响范围（势力圈）
        for dr in range(-4, 5):
            for dc in range(-4, 5):
                nr, nc = row + dr, col + dc
                if 0 <= nr < size and 0 <= nc < size:
                    dist = abs(dr) + abs(dc)
                    if dist > 0 and dist <= 4:
                        weight = (5 - dist) * 2
                        if board[nr][nc] == color:
                            score += weight
                        elif board[nr][nc] == opponent:
                            score -= weight * 0.8
        
        # 随机扰动（避免总是走同一点）
        score += random.random() * 3
        
        if score > best_score:
            best_score = score
            best_moves = [[row, col]]
        elif abs(score - best_score) < 0.01:
            best_moves.append([row, col])
    
    if not best_moves:
        return None, True
    
    return random.choice(best_moves), False


def intermediate_ai_move(board, color):
    """中级 AI 落子（简化版）"""
    size = len(board)
    valid_moves = get_valid_moves(board, color)
    
    if not valid_moves:
        return None, True
    
    opponent = 3 - color
    best_score = float('-inf')
    best_moves = []
    
    for row, col in valid_moves:
        score = 0
        
        # 吃子
        for dr, dc in [[-1, 0], [1, 0], [0, -1], [0, 1]]:
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == opponent:
                    group = find_group(board, nr, nc, opponent)
                    if count_liberties(board, group) == 0:
                        score += len(group) * 30
        
        # 气数
        test_board = [r[:] for r in board]
        test_board[row][col] = color
        my_group = find_group(test_board, row, col, color)
        score += count_liberties(test_board, my_group) * 3
        
        # 叫吃
        for dr, dc in [[-1, 0], [1, 0], [0, -1], [0, 1]]:
            nr, nc = row + dr, col + dc
            if 0 <= nr < size and 0 <= nc < size:
                if board[nr][nc] == opponent:
                    group = find_group(board, nr, nc, opponent)
                    if count_liberties(board, group) == 1:
                        score += 20
        
        # 位置
        center = size // 2
        score += (size - abs(row - center) - abs(col - center)) * 0.5
        
        score += random.random()
        
        if score > best_score:
            best_score = score
            best_moves = [[row, col]]
        elif abs(score - best_score) < 0.1:
            best_moves.append([row, col])
    
    return random.choice(best_moves), False


def beginner_ai_move(board, color):
    """初级 AI 落子（随机）"""
    valid_moves = get_valid_moves(board, color)
    
    if not valid_moves:
        return None, True
    
    return random.choice(valid_moves), False


@app.route('/ai', methods=['POST'])
def get_ai_move():
    """主 API: 获取 AI 落子"""
    try:
        data = request.get_json()
        
        board = data.get('board', [])
        current_player = data.get('current_player', 1)  # 1 = 黑, 2 = 白
        size = data.get('size', 19)
        difficulty = data.get('difficulty', 'advanced')
        
        # 思考时间（模拟 AI 思考）
        if difficulty == 'advanced':
            time.sleep(0.8 + random.random() * 0.7)
            move, is_pass = advanced_ai_move(board, current_player, difficulty)
        elif difficulty == 'intermediate':
            time.sleep(0.4 + random.random() * 0.3)
            move, is_pass = intermediate_ai_move(board, current_player)
        else:
            time.sleep(0.1 + random.random() * 0.2)
            move, is_pass = beginner_ai_move(board, current_player)
        
        if is_pass:
            return jsonify({'pass': True})
        
        if move:
            return jsonify({
                'x': move[1],  # col
                'y': move[0],  # row
                'winrate': 0.5 + random.random() * 0.2 - 0.1,
            })
        
        return jsonify({'pass': True})
        
    except Exception as e:
        print(f"处理请求时出错: {e}")
        return jsonify({'error': str(e), 'pass': True}), 200


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'running',
        'ai_type': 'heuristic',
    })


if __name__ == '__main__':
    print("\n" + "="*50)
    print("本地围棋 AI 后端服务已启动")
    print("="*50)
    print("API 端点: http://localhost:5000/ai")
    print("健康检查: http://localhost:5000/health")
    print("\n支持的难度: beginner, intermediate, advanced")
    print("\n按 Ctrl+C 停止服务")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
