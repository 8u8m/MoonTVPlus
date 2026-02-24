/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

// 存储进度信息的 Map
const progressStore = new Map<string, {
  phase: string;
  current: number;
  total: number;
  message: string;
  timestamp: number;
}>();

// 清理过期的进度信息（超过5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of progressStore.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      progressStore.delete(key);
    }
  }
}, 60 * 1000);

export async function GET(req: NextRequest) {
  // 验证身份和权限
  const authInfo = getAuthInfoFromCookie(req);
  if (!authInfo || !authInfo.username) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (authInfo.username !== process.env.USERNAME) {
    return new Response('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const operation = searchParams.get('operation'); // 'export' or 'import'

  if (!operation) {
    return new Response('Missing operation parameter', { status: 400 });
  }

  const progressKey = `${authInfo.username}:${operation}`;

  // 创建 SSE 响应
  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | null = null;
  let timeout: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendProgress = () => {
        try {
          const progress = progressStore.get(progressKey);
          if (progress) {
            const data = JSON.stringify(progress);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          // 如果控制器已关闭，清理定时器
          if (interval) clearInterval(interval);
          if (timeout) clearTimeout(timeout);
        }
      };

      // 立即发送一次
      sendProgress();

      // 每秒发送一次进度更新
      interval = setInterval(sendProgress, 1000);

      // 30秒后自动关闭连接
      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch (error) {
          // 控制器可能已经关闭
        }
      }, 30000);
    },
    cancel() {
      // 当客户端断开连接时清理
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// 辅助函数：更新进度
export function updateProgress(
  username: string,
  operation: 'export' | 'import',
  phase: string,
  current: number,
  total: number,
  message: string
) {
  const progressKey = `${username}:${operation}`;
  progressStore.set(progressKey, {
    phase,
    current,
    total,
    message,
    timestamp: Date.now(),
  });
}

// 辅助函数：清除进度
export function clearProgress(username: string, operation: 'export' | 'import') {
  const progressKey = `${username}:${operation}`;
  progressStore.delete(progressKey);
}
