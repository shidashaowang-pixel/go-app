import Home from './pages/Home';
import Login from './pages/Login';
import LearnCenter from './pages/learn/LearnCenter';
import Culture from './pages/learn/Culture';
import Basics from './pages/learn/Basics';
import Checkpoint from './pages/learn/Checkpoint';
import CheckpointLevel from './pages/learn/CheckpointLevel';
import Practice from './pages/learn/Practice';
import LifeDeathPractice from './pages/learn/LifeDeathPractice';
import Courses from './pages/learn/Courses';
import CourseDetail from './pages/learn/CourseDetail';
import CourseEdit from './pages/learn/CourseEdit';
import Terminology from './pages/learn/Terminology';
import EndgameChallenge from './pages/learn/EndgameChallenge';
import CultureQuiz from './pages/learn/CultureQuiz';
import CultureQuizLevel from './pages/learn/CultureQuizLevel';
import GameCenter from './pages/game/GameCenter';
import AIGame from './pages/game/AIGame';
import HumanGame from './pages/game/HumanGame';
import SGFImport from './pages/game/SGFImport';
import SpectateLobby from './pages/game/SpectateLobby';
import SpectateGame from './pages/game/SpectateGame';
import AIReview from './pages/game/AIReview';
import Social from './pages/social/Social';
import Friends from './pages/social/Friends';
import Leaderboard from './pages/social/Leaderboard';
import Achievements from './pages/social/Achievements';
import Messages from './pages/social/Messages';
import Community from './pages/social/Community';
import Lobby from './pages/social/Lobby';
import Clubs from './pages/social/Clubs';
import ClubDetail from './pages/social/ClubDetail';
import Wallet from './pages/social/Wallet';
import Profile from './pages/profile/Profile';
import LearningProgress from './pages/profile/LearningProgress';
import GameHistory from './pages/profile/GameHistory';
import GrowthAnalytics from './pages/profile/GrowthAnalytics';
import RankCertification from './pages/profile/RankCertification';
import Settings from './pages/profile/Settings';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherProblems from './pages/teacher/TeacherProblems';
import ProblemEditor from './pages/teacher/ProblemEditor';
import ProblemManagement from './pages/teacher/ProblemManagement';
import ContentManagement from './pages/teacher/ContentManagement';
import InviteStudents from './pages/teacher/InviteStudents';
import ParentDashboard from './pages/parent/ParentDashboard';
import LearningPlan from './pages/parent/LearningPlan';
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
    name: '死活题专区',
    path: '/learn/life-death',
    element: <LifeDeathPractice />,
  },
  {
    name: '围棋术语',
    path: '/learn/terminology',
    element: <Terminology />,
  },
  {
    name: '残局挑战',
    path: '/learn/endgame',
    element: <EndgameChallenge />,
  },
  {
    name: '文化闯关列表',
    path: '/learn/culture-quiz',
    element: <CultureQuiz />,
  },
  {
    name: '文化闯关答题',
    path: '/learn/culture-quiz/:level',
    element: <CultureQuizLevel />,
  },
  {
    name: '课程列表',
    path: '/learn/courses',
    element: <Courses />,
  },
  {
    name: '课程详情',
    path: '/learn/courses/:id',
    element: <CourseDetail />,
  },
  {
    name: '课程编辑',
    path: '/teacher/courses/:id',
    element: <CourseEdit />,
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
    name: '棋谱导入',
    path: '/game/import',
    element: <SGFImport />,
  },
  {
    name: '观战大厅',
    path: '/game/spectate',
    element: <SpectateLobby />,
  },
  {
    name: '观战',
    path: '/game/spectate/:id',
    element: <SpectateGame />,
  },
  {
    name: 'AI复盘',
    path: '/game/review',
    element: <AIReview />,
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
    name: '私信',
    path: '/social/messages',
    element: <Messages />,
  },
  {
    name: '社区',
    path: '/social/community',
    element: <Community />,
  },
  {
    name: '大厅',
    path: '/social/lobby',
    element: <Lobby />,
  },
  {
    name: '棋社',
    path: '/social/clubs',
    element: <Clubs />,
  },
  {
    name: '棋社详情',
    path: '/social/clubs/:id',
    element: <ClubDetail />,
  },
  {
    name: '我的钱包',
    path: '/social/wallet',
    element: <Wallet />,
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
    name: '数据分析',
    path: '/profile/analytics',
    element: <GrowthAnalytics />,
  },
  {
    name: '段位认证',
    path: '/profile/rank',
    element: <RankCertification />,
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
  {
    name: '题库管理',
    path: '/teacher/problems',
    element: <TeacherProblems />,
  },
  {
    name: '题目编辑',
    path: '/teacher/problems/:id',
    element: <ProblemEditor />,
  },
  {
    name: '题目管理',
    path: '/teacher/problems-all',
    element: <ProblemManagement />,
  },
  {
    name: '内容管理',
    path: '/teacher/content',
    element: <ContentManagement />,
  },
  {
    name: '邀请学生',
    path: '/teacher/invite',
    element: <InviteStudents />,
  },
  {
    name: '家长中心',
    path: '/parent',
    element: <ParentDashboard />,
  },
  {
    name: '学习计划',
    path: '/parent/plan',
    element: <LearningPlan />,
  },
];
