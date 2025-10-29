import { Bot, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/stores/themeStore';
import { getAvatarUrl } from '@/lib/utils';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-helix" />
            <span className="text-2xl font-bold text-foreground">Helix</span>
            <span className="text-sm text-muted-foreground ml-2">Dashboard</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(user)}
                  alt={user.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium hidden sm:block">
                  {user.username}
                </span>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
