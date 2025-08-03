'use client';

import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';

const Navbar = () => {
  const { user, isAuthenticated, loading, login, logout } = useUser();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Helix Bot
        </Link>
        <div className="space-x-4">
          <Link href="/" className="hover:text-gray-300">
            Home
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="hover:text-gray-300">
              Dashboard
            </Link>
          )}
        </div>
        <div>
          {loading ? (
            <p>Loading...</p>
          ) : isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span>Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
