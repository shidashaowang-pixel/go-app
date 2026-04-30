"""
围棋神经网络 v2 - AlphaZero风格 ResNet双头网络
策略头：输出361点落子概率（9路=81点，13路=169点，19路=361点）
价值头：输出局面胜率 [-1, 1]
"""

import torch
import torch.nn as nn


class ResBlock(nn.Module):
    """残差块：Conv->BN->ReLU->Conv->BN + skip connection"""
    def __init__(self, channels):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x):
        residual = x
        out = torch.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += residual
        out = torch.relu(out)
        return out


class GoNet(nn.Module):
    """
    AlphaZero风格围棋网络
    - 输入：17通道 (当前黑子、白子、历史8步、当前玩家)
    - Backbone：5个ResBlock + 128通道
    - 策略头：Conv->FC->Softmax
    - 价值头：Conv->FC->tanh
    """
    def __init__(self, board_size=19, num_res_blocks=5, channels=128):
        super().__init__()
        self.board_size = board_size
        self.num_moves = board_size * board_size

        # 输入卷积
        self.input_conv = nn.Sequential(
            nn.Conv2d(17, channels, 3, padding=1),
            nn.BatchNorm2d(channels),
            nn.ReLU()
        )

        # 残差块
        self.res_blocks = nn.Sequential(
            *[ResBlock(channels) for _ in range(num_res_blocks)]
        )

        # 策略头
        self.policy_head = nn.Sequential(
            nn.Conv2d(channels, 32, 1),  # 1x1卷积降维
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Flatten(),
            nn.Linear(32 * board_size * board_size, self.num_moves),
        )

        # 价值头
        self.value_head = nn.Sequential(
            nn.Conv2d(channels, 16, 1),  # 1x1卷积降维
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.Flatten(),
            nn.Linear(16 * board_size * board_size, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Tanh()
        )

    def forward(self, x):
        """返回 (策略logits, 价值)"""
        feat = self.input_conv(x)
        feat = self.res_blocks(feat)

        policy = self.policy_head(feat)
        value = self.value_head(feat)

        return policy, value

    def predict(self, x):
        """推理用：返回 (落子概率, 胜率)"""
        self.eval()
        with torch.no_grad():
            policy_logits, value = self.forward(x)
            policy_probs = torch.softmax(policy_logits, dim=1)
            return policy_probs, value


def board_to_tensor(board, color, history_boards=None, size=19):
    """
    将棋盘转为17通道张量
    通道0: 当前黑子位置
    通道1: 当前白子位置
    通道2-9: 最近8步的黑子位置（历史）
    通道10-17: 最近8步的白子位置（历史）
    如果没有历史，用当前棋盘填充
    最后一维：如果当前是黑方则为1，白方为0（隐含在通道分配中）

    简化版：只用17通道
    0: 黑子
    1: 白子
    2: 黑方历史1
    3: 白方历史1
    4: 黑方历史2
    5: 白方历史2
    6: 黑方历史3
    7: 白方历史3
    8: 黑方历史4
    9: 白方历史4
    10-15: 全0（预留）
    16: 当前玩家（1=黑, 0=白）
    """
    t = torch.zeros(17, size, size)

    # 当前棋盘
    for y in range(size):
        for x in range(size):
            v = board[y][x]
            if v == 1:
                t[0, y, x] = 1
            elif v == 2:
                t[1, y, x] = 1

    # 历史棋盘
    if history_boards and len(history_boards) > 0:
        for i, hist_board in enumerate(history_boards[-4:]):
            ch_black = 2 + i * 2
            ch_white = 3 + i * 2
            for y in range(size):
                for x in range(size):
                    v = hist_board[y][x]
                    if v == 1:
                        t[ch_black, y, x] = 1
                    elif v == 2:
                        t[ch_white, y, x] = 1

    # 当前玩家
    t[16] = 1.0 if color == 1 else 0.0

    return t.unsqueeze(0)  # shape: (1, 17, size, size)


def evaluate(net, board, color, history_boards=None, size=19):
    """评估局面胜率（仅价值头）"""
    t = board_to_tensor(board, color, history_boards, size)
    device = next(net.parameters()).device
    t = t.to(device)
    _, value = net.predict(t)
    return value.item()


def get_policy(net, board, color, history_boards=None, size=19):
    """获取策略概率"""
    t = board_to_tensor(board, color, history_boards, size)
    device = next(net.parameters()).device
    t = t.to(device)
    probs, _ = net.predict(t)
    return probs.squeeze(0).cpu().numpy()


if __name__ == "__main__":
    # 测试网络
    for sz in [9, 13, 19]:
        net = GoNet(board_size=sz)
        x = torch.randn(1, 17, sz, sz)
        policy, value = net(x)
        print(f"{sz}路棋盘: 策略={policy.shape}, 价值={value.shape}, 参数量={sum(p.numel() for p in net.parameters()):,}")
