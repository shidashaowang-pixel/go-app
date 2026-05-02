import { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';

// 简化版本的邀请学生页面
export default function InviteStudentsSimple() {
  const [invitations, setInvitations] = useState<string[]>([]);

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createInvitation = () => {
    const code = generateInviteCode();
    setInvitations(prev => [code, ...prev]);
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">邀请学生（简化版）</h1>
          <p className="text-muted-foreground">测试页面</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={createInvitation}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            生成邀请码
          </button>

          {invitations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">已生成的邀请码：</h3>
              <ul className="space-y-2">
                {invitations.map((code, index) => (
                  <li key={index} className="bg-gray-100 p-2 rounded">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}