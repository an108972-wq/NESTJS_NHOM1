'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Navbar.module.css';

type NavbarUser = {
  id: number;
  username: string;
  role: 'ADMIN' | 'LIBRARIAN' | 'READER' | string;
};

type InAppNotification = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationsResponse = {
  notifications: InAppNotification[];
  unreadCount: number;
};

type NavbarProps = {
  user: NavbarUser;
  accessToken: string;
  refreshToken?: string;
  onTokensRefreshed?: (tokens: { accessToken: string; refreshToken: string }) => void;
  apiBaseUrl?: string;
  onLogout: () => void;
};

const staffRoles = ['ADMIN', 'LIBRARIAN'];

export default function Navbar({
  user,
  accessToken,
  refreshToken,
  onTokensRefreshed,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  onLogout,
}: NavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');
  const [activeAccessToken, setActiveAccessToken] = useState(accessToken);
  const [activeRefreshToken, setActiveRefreshToken] = useState(refreshToken);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);
  const isStaff = staffRoles.includes(user.role);

  useEffect(() => {
    setActiveAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    setActiveRefreshToken(refreshToken);
  }, [refreshToken]);

  const authenticatedFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const request = (token: string) => {
      const requestHeaders = new Headers(init.headers);
      requestHeaders.set('Authorization', `Bearer ${token}`);
      return fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers: requestHeaders,
      });
    };

    let response = await request(activeAccessToken);
    if (response.status !== 401 || !activeRefreshToken) return response;

    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: activeRefreshToken }),
          });
          if (!refreshResponse.ok) return null;
          const tokens = (await refreshResponse.json()) as {
            accessToken?: string;
            refreshToken?: string;
          };
          if (!tokens.accessToken || !tokens.refreshToken) return null;
          setActiveAccessToken(tokens.accessToken);
          setActiveRefreshToken(tokens.refreshToken);
          onTokensRefreshed?.({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          return tokens.accessToken;
        } catch {
          return null;
        } finally {
          refreshInFlight.current = null;
        }
      })();
    }

    const refreshedAccessToken = await refreshInFlight.current;
    if (refreshedAccessToken) return request(refreshedAccessToken);
    return response;
  }, [activeAccessToken, activeRefreshToken, apiBaseUrl, onTokensRefreshed]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNotifications() {
      try {
        setNotificationError('');
        const response = await authenticatedFetch('/notifications/mine', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Không thể tải thông báo');
        const result = (await response.json()) as NotificationsResponse;
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotificationError(error instanceof Error ? error.message : 'Không thể tải thông báo');
        }
      }
    }

    void loadNotifications();
    return () => controller.abort();
  }, [authenticatedFetch]);

  async function markAsRead(notification: InAppNotification) {
    if (notification.readAt) return;
    try {
      const response = await authenticatedFetch(`/notifications/${notification.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Không thể cập nhật trạng thái thông báo');
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : 'Không thể cập nhật trạng thái thông báo',
      );
    }
  }

  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Thư viện - trang chủ">
        <span className={styles.logo} aria-hidden="true">T</span>
        <span>Hệ Thống Quản Lý Thư Viện</span>
      </Link>

      <nav className={styles.navigation} aria-label="Điều hướng chính">
        <Link href="/books">Sách</Link>
        {isStaff ? (
          <>
            <Link href="/admin/borrow-requests">Yêu cầu mượn</Link>
            <Link href="/admin/books">Quản lý sách</Link>
            <Link href="/admin/users">Người dùng</Link>
            {user.role === 'ADMIN' && <Link href="/admin/reports">Báo cáo</Link>}
          </>
        ) : (
          <>
            <Link href="/my-loans">Sách đang mượn</Link>
            <Link href="/my-reservations">Đặt giữ</Link>
          </>
        )}
      </nav>

      <div className={styles.actions}>
        <div className={styles.dropdown}>
          <button
            className={styles.iconButton}
            type="button"
            aria-label={`Thông báo, ${unreadCount} chưa đọc`}
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          {notificationsOpen && (
            <section className={`${styles.menu} ${styles.notificationMenu}`} aria-label="Thông báo">
              <h2>Thông báo</h2>
              {notificationError && <p className={styles.error}>{notificationError}</p>}
              {notifications.length === 0 && !notificationError && (
                <p className={styles.empty}>Bạn chưa có thông báo.</p>
              )}
              {notifications.map((notification) => (
                <button
                  className={`${styles.notification} ${notification.readAt ? '' : styles.unread}`}
                  key={notification.id}
                  type="button"
                  onClick={() => void markAsRead(notification)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <time dateTime={notification.createdAt}>
                    {new Date(notification.createdAt).toLocaleString('vi-VN')}
                  </time>
                </button>
              ))}
            </section>
          )}
        </div>

        <div className={styles.dropdown}>
          <button
            className={styles.profileButton}
            type="button"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
          >
            <span className={styles.avatar} aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span className={styles.username}>{user.username}</span>
            <span className={styles.roleBadge}>{user.role}</span>
            <span className={styles.caret} aria-hidden="true">⌄</span>
          </button>
          {profileOpen && (
            <div className={styles.menu} role="menu">
              <div className={styles.identity}>
                <strong>{user.username}</strong>
                <span className={styles.roleBadge}>{user.role}</span>
              </div>
              <Link href="/profile" role="menuitem" onClick={() => setProfileOpen(false)}>
                Hồ sơ cá nhân
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
