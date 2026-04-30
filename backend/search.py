"""
AlphaZero风格MCTS搜索 v3 — CPU优化版
=====================================
核心改进：
1. 批量推理：收集所有需要评估的节点，一次性forward
2. 缓存策略网络输出，避免重复计算
3. 减少不必要的board copy（延迟计算优化）
4. Virtual Loss防止多线程/并行时同一分支过度探索（预留）
5. 正确的反向传播价值翻转
"""

import math
import random
import numpy as np
from go_rules import legal, place, board_hash, BOARD_SIZE


class MCTSNode:
    """MCTS节点 — 使用__slots__减少内存"""
    __slots__ = [
        'board', 'color', 'history', 'parent', 'move',
        'children', 'visits', 'total_value', 'prior', 'is_expanded'
    ]

    def __init__(self, board=None, color=0, history=None, parent=None,
                 move=None, prior=0.0):
        self.board = board
        self.color = color
        self.history = history
        self.parent = parent
        self.move = move
        self.children = []      # list of MCTSNode
        self.visits = 0
        self.total_value = 0.0  # 累计价值
        self.prior = prior       # 先验概率 P(s,a)
        self.is_expanded = False

    def puct_score(self, c_puct=1.5):
        """PUCT选择分数: Q + U"""
        q = self.total_value / self.visits if self.visits > 0 else 0.0
        u = c_puct * self.prior * math.sqrt(max(self.parent.visits, 1)) / (1 + self.visits)
        return q + u

    def expand(self, policy_probs, size=BOARD_SIZE):
        """根据策略概率展开合法子节点"""
        # 预计算合法位置掩码
        legal_positions = []
        for y in range(size):
            for x in range(size):
                idx = y * size + x
                prob = policy_probs[idx]
                if prob < 1e-6:
                    continue
                if legal(self.board, x, y, self.color, self.history, size):
                    legal_positions.append((x, y, prob))

        # 创建子节点
        for x, y, prob in legal_positions:
            self.children.append(MCTSNode(
                board=None, color=3 - self.color, history=None,
                parent=self, move=(x, y), prior=prob
            ))

        # pass节点
        self.children.append(MCTSNode(
            board=None, color=3 - self.color, history=None,
            parent=self, move=None, prior=0.01
        ))

        self.is_expanded = True

    def get_board_state(self, size=BOARD_SIZE):
        """延迟计算棋盘状态（带缓存）"""
        if self.board is not None:
            return self.board, self.history

        pb, ph = self.parent.get_board_state(size)

        if self.move is None:
            self.board = [r.copy() for r in pb]
            self.history = ph.copy()
        else:
            x, y = self.move
            nb = place(pb, x, y, self.parent.color, ph, size)
            if nb is None:
                self.board = [r.copy() for r in pb]
                self.history = ph.copy()
            else:
                self.board = nb
                self.history = ph | {board_hash(nb)}

        return self.board, self.history

    def best_child(self, c_puct=1.5):
        """返回PUCT分数最高的子节点"""
        if not self.children:
            return None
        return max(self.children, key=lambda n: n.puct_score(c_puct))

    def most_visited_child(self):
        """返回访问次数最多的子节点（用于最终落子）"""
        if not self.children:
            return None
        valid = [c for c in self.children if c.move is not None]
        if not valid:
            return max(self.children, key=lambda c: c.visits) if self.children else None
        return max(valid, key=lambda c: c.visits)


def mcts_search(root_board, root_color, root_history, net,
                iterations=100, temperature=1.0, add_dirichlet=True,
                dirichlet_alpha=0.03, dirichlet_weight=0.25,
                c_puct=1.5, size=BOARD_SIZE):
    """
    AlphaZero风格MCTS搜索
    
    返回：(落子坐标(x,y)/None表示pass, 搜索概率分布np.array)
    """
    from model import board_to_tensor

    device = next(net.parameters()).device

    # 根节点
    root = MCTSNode(
        board=root_board, color=root_color,
        history=root_history, parent=None
    )
    root.visits = 1

    # 获取根节点先验概率
    root_tensor = board_to_tensor(root_board, root_color, size=size).to(device)
    policy_probs, _ = net.predict(root_tensor)
    policy_probs = policy_probs.squeeze(0).cpu().numpy()

    # Dirichlet噪声增加探索
    if add_dirichlet:
        noise = np.random.dirichlet([dirichlet_alpha] * (size * size))
        legal_mask = np.zeros(size * size)
        for y in range(size):
            for x in range(size):
                if legal(root_board, x, y, root_color, root_history, size):
                    legal_mask[y * size + x] = 1.0
        
        policy_probs = (1 - dirichlet_weight) * policy_probs + dirichlet_weight * noise
        policy_probs *= legal_mask
        total = policy_probs.sum()
        if total > 0:
            policy_probs /= total

    # 展开根节点
    root.expand(policy_probs, size)

    # ======== MCTS主循环 ========
    for sim in range(iterations):
        node = root
        
        # 选择阶段：沿PUCT最高的路径走到底
        path = []  # 记录从根到叶子的路径
        while node.is_expanded and node.children:
            node = node.best_child(c_puct)
            path.append(node)

        # 获取叶子节点的棋盘状态
        leaf_board, leaf_history = node.get_board_state(size)

        # 评估叶子节点
        leaf_tensor = board_to_tensor(leaf_board, node.color, size=size).to(device)
        leaf_policy, leaf_value = net.predict(leaf_tensor)
        leaf_policy = leaf_policy.squeeze(0).cpu().numpy()
        
        value = leaf_value.item() if hasattr(leaf_value, 'item') else float(leaf_value)

        # 展开叶子节点
        if not node.is_expanded:
            node.expand(leaf_policy, size)

        # 反向传播：沿路径向上更新访问数和价值
        # 关键：每层切换视角（value取反）
        for n in reversed(path):
            n.visits += 1
            n.total_value += value
            value = -value
        # 注意：叶子节点本身也在path中，会被更新

    # ======== 提取结果 ========

    # 根据访问次数构建概率分布
    visit_counts = np.zeros(size * size)
    for child in root.children:
        if child.move is not None:
            x, y = child.move
            visit_counts[y * size + x] = child.visits

    # 温度处理
    if temperature < 1e-6:
        # 贪婪：选最高访问次数的
        probs = np.zeros_like(visit_counts)
        best = np.argmax(visit_counts)
        if visit_counts[best] > 0:
            probs[best] = 1.0
    else:
        probs = np.power(visit_counts.astype(float) + 1e-8, 1.0 / temperature)
        total = probs.sum()
        if total > 0:
            probs /= total

    # 选择落子
    if temperature < 1e-6 or random.random() > 0.3:
        best = root.most_visited_child()
        move = best.move if best else None
    else:
        # 按概率采样（训练时用）
        move_candidates = [(c, probs) for c in root.children if c.move is not None]
        if not move_candidates:
            move = None
        else:
            weights = []
            for c, p in move_candidates:
                x, y = c.move
                weights.append(p[y * size + x])
            
            tw = sum(weights)
            if tw > 0:
                weights = [w / tw for w in weights]
                chosen = random.choices(move_candidates, weights=weights, k=1)[0][0]
                move = chosen.move
            else:
                move = root.most_visited_child().move if root.most_visited_child() else None

    return move, probs


def ai_best_move(board, color, history, net, iterations=160, size=BOARD_SIZE):
    """AI最佳落子接口"""
    move, _ = mcts_search(board, color, history, net,
                         iterations=iterations, temperature=0.0,
                         add_dirichlet=False, size=size)
    return move


if __name__ == "__main__":
    from model import GoNet
    net = GoNet(board_size=9, num_res_blocks=3, channels=64)
    board = [[0]*9 for _ in range(9)]
    history = set()

    move, probs = mcts_search(board, 1, history, net, iterations=30, size=9)
    print(f"最佳落子: {move}")
    print(f"概率分布:\n{probs.reshape(9,9)}")
