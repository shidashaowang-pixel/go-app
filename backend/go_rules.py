"""
围棋规则引擎 v2
修复：领地计算、9/13/19路支持、完整的中国规则数子法
"""

BOARD_SIZE = 19  # 默认19路，可修改为9或13

DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


def get_neighbors(x, y, size=BOARD_SIZE):
    """获取相邻位置"""
    for dx, dy in DIRS:
        nx, ny = x + dx, y + dy
        if 0 <= nx < size and 0 <= ny < size:
            yield nx, ny


def find_group(board, x, y, size=BOARD_SIZE):
    """找到(x,y)所在的棋子组和气"""
    color = board[y][x]
    if color == 0:
        return set(), set()

    group = set()
    liberties = set()
    stack = [(x, y)]
    visited = set()

    while stack:
        cx, cy = stack.pop()
        if (cx, cy) in visited:
            continue
        visited.add((cx, cy))

        if board[cy][cx] == 0:
            liberties.add((cx, cy))
            continue

        if board[cy][cx] == color:
            group.add((cx, cy))
            for nx, ny in get_neighbors(cx, cy, size):
                if (nx, ny) not in visited:
                    stack.append((nx, ny))

    return group, liberties


def place_and_capture(board, x, y, color, size=BOARD_SIZE):
    """落子并提子，返回(新棋盘, 提子数)"""
    if board[y][x] != 0:
        return None, 0

    nb = [r.copy() for r in board]
    nb[y][x] = color
    opp = 3 - color
    captured = 0

    # 先检查是否提掉对方的子
    for nx, ny in get_neighbors(x, y, size):
        if nb[ny][nx] == opp:
            group, liberties = find_group(nb, nx, ny, size)
            if len(liberties) == 0:
                for gx, gy in group:
                    nb[gy][gx] = 0
                    captured += 1

    # 检查自杀（落子后自己无气且没提掉对方的子）
    if captured == 0:
        _, self_liberties = find_group(nb, x, y, size)
        if len(self_liberties) == 0:
            return None, 0  # 自杀手，禁止

    return nb, captured


def board_hash(board):
    """棋盘哈希（用于劫的判断）"""
    return hash(tuple(tuple(r) for r in board))


def legal(board, x, y, color, history, size=BOARD_SIZE):
    """判断落子是否合法"""
    if not (0 <= x < size and 0 <= y < size):
        return False
    if board[y][x] != 0:
        return False
    nb, _ = place_and_capture(board, x, y, color, size)
    if nb is None:
        return False
    # 劫的判断：落子后棋盘不能和历史上任一状态相同
    if board_hash(nb) in history:
        return False
    return True


def place(board, x, y, color, history, size=BOARD_SIZE):
    """落子，返回新棋盘或None"""
    if not legal(board, x, y, color, history, size):
        return None
    nb, _ = place_and_capture(board, x, y, color, size)
    return nb


def is_game_over(board, history, size=BOARD_SIZE):
    """判断游戏是否结束：双方都无合法落子"""
    for c in [1, 2]:
        for x in range(size):
            for y in range(size):
                if legal(board, x, y, c, history, size):
                    return False
    return True


def count_territory(board, size=BOARD_SIZE):
    """
    中国规则领地计算
    空点如果只被一方棋子包围，则为该方领地
    返回 (黑地, 白地, 中立地)
    """
    visited = set()
    black_territory = 0
    white_territory = 0

    for y in range(size):
        for x in range(size):
            if board[y][x] != 0 or (x, y) in visited:
                continue

            # BFS找到连通的空区域
            empty_group = set()
            adjacent_colors = set()
            stack = [(x, y)]

            while stack:
                cx, cy = stack.pop()
                if (cx, cy) in visited or (cx, cy) in empty_group:
                    continue

                if board[cy][cx] != 0:
                    adjacent_colors.add(board[cy][cx])
                    continue

                empty_group.add((cx, cy))
                visited.add((cx, cy))

                for nx, ny in get_neighbors(cx, cy, size):
                    if (nx, ny) not in visited and (nx, ny) not in empty_group:
                        stack.append((nx, ny))

            # 判断空区域归属
            if adjacent_colors == {1}:
                black_territory += len(empty_group)
            elif adjacent_colors == {2}:
                white_territory += len(empty_group)
            # 否则是中立地，不计分

    return black_territory, white_territory


def final_score(board, komi=7.5, size=BOARD_SIZE):
    """
    中国规则数子法
    黑方得分 = 黑子数 + 黑地数
    白方得分 = 白子数 + 白地数 + 贴目
    返回 (黑方得分, 白方得分)
    """
    black_stones = sum(r.count(1) for r in board)
    white_stones = sum(r.count(2) for r in board)
    black_territory, white_territory = count_territory(board, size)

    black_score = black_stones + black_territory
    white_score = white_stones + white_territory + komi

    return black_score, white_score


def count_score(board, komi=7.5, size=BOARD_SIZE):
    """兼容旧接口"""
    return final_score(board, komi, size)


def print_board(board, size=BOARD_SIZE):
    """打印棋盘"""
    print("   " + " ".join(f"{i:2d}" for i in range(size)))
    for y in range(size):
        row = []
        for x in range(size):
            if board[y][x] == 1:
                row.append("X")
            elif board[y][x] == 2:
                row.append("O")
            else:
                row.append("+")
        print(f"{y:2d} " + " ".join(row))


if __name__ == "__main__":
    # 测试领地计算
    test_board = [[0] * 9 for _ in range(9)]
    # 黑棋围住左上角
    test_board[0][0] = 1
    test_board[0][1] = 1
    test_board[1][0] = 1
    # 白棋围住右下角
    test_board[8][8] = 2
    test_board[8][7] = 2
    test_board[7][8] = 2

    print_board(test_board, 9)
    b, w = final_score(test_board, 5.5, 9)
    print(f"黑: {b}, 白: {w}")
