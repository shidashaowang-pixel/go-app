import Home from './pages/Home';
import Login from './pages/Login';
import LearnCenter from './pages/learn/LearnCenter';
import Culture from './pages/learn/Culture';
import Basics from './pages/learn/Basics';
import Checkpoint from './pages/learn/Checkpoint';
import CheckpointLevel from './pages/learn/CheckpointLevel';
import Practice from './pages/learn/Practice';
import Courses from './pages/learn/Courses';
import GameCenter from './pages/game/GameCenter';
import AIGame from './pages/game/AIGame';
import HumanGame from './pages/game/HumanGame';
import Social from './pages/social/Social';
import Friends from './pages/social/Friends';
import Leaderboard from './pages/social/Leaderboard';
import Achievements from './pages/social/Achievements';
import Profile from './pages/profile/Profile';
import LearningProgress from './pages/profile/LearningProgress';
import GameHistory from './pages/profile/GameHistory';
import Settings from './pages/profile/Settings';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherStudents from './pages/teacher/TeacherStudents';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: '登录',
    path: '/login',
    element: <Login />,
    public: true,
  },
  {
    name: '首页',
    path: '/',
    element: <Home />,
  },
  {
    name: '学习中心',
    path: '/learn',
    element: <LearnCenter />,
  },
  {
    name: '围棋文化',
    path: '/learn/culture',
    element: <Culture />,
  },
  {
    name: '基础入门',
    path: '/learn/basics',
    element: <Basics />,
  },
  {
    name: '闯关列表',
    path: '/learn/checkpoint',
    element: <Checkpoint />,
  },
  {
    name: '闯关关卡',
    path: '/learn/checkpoint/:level',
    element: <CheckpointLevel />,
  },
  {
    name: '题目练习',
    path: '/learn/practice',
    element: <Practice />,
  },
  {
    name: '课程列表',
    path: '/learn/courses',
    element: <Courses />,
  },
  {
    name: '对弈中心',
    path: '/game',
    element: <GameCenter />,
  },
  {
    name: '人机对弈',
    path: '/game/ai',
    element: <AIGame />,
  },
  {
    name: '真人对弈',
    path: '/game/human',
    element: <HumanGame />,
  },
  {
    name: '社交排行',
    path: '/social',
    element: <Social />,
  },
  {
    name: '好友列表',
    path: '/social/friends',
    element: <Friends />,
  },
  {
    name: '排行榜',
    path: '/social/leaderboard',
    element: <Leaderboard />,
  },
  {
    name: '成就徽章',
    path: '/social/achievements',
    element: <Achievements />,
  },
  {
    name: '个人中心',
    path: '/profile',
    element: <Profile />,
  },
  {
    name: '学习进度',
    path: '/profile/progress',
    element: <LearningProgress />,
  },
  {
    name: '对弈战绩',
    path: '/profile/history',
    element: <GameHistory />,
  },
  {
    name: '账号设置',
    path: '/profile/settings',
    element: <Settings />,
  },
  {
    name: '教学管理',
    path: '/teacher',
    element: <TeacherDashboard />,
  },
  {
    name: '课程管理',
    path: '/teacher/courses',
    element: <TeacherCourses />,
  },
  {
    name: '学员管理',
    path: '/teacher/students',
    element: <TeacherStudents />,
  },
];
