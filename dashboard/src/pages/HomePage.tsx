import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      console.log('Attempting to fetch login URL from:', api.defaults.baseURL);
      const response = await api.get<{ success: boolean; url: string }>('/auth/login');
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        console.log('Redirecting to:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('Login failed: success is false');
        alert('Failed to initiate login. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to get login URL:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Login error: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-helix" />
            <span className="text-2xl font-bold">Helix</span>
          </div>
          <button
            onClick={handleLogin}
            className="px-6 py-2 bg-helix hover:bg-helix-dark rounded-lg font-semibold transition-colors"
          >
            Login with Discord
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Manage Your Discord Server with{' '}
            <span className="text-helix">Helix</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            A powerful, easy-to-use Discord bot with economy, moderation, fun commands, and more.
            Configure everything from our beautiful web dashboard.
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 px-8 py-4 bg-helix hover:bg-helix-dark rounded-lg text-lg font-semibold transition-colors"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Shield className="w-12 h-12 text-helix" />}
            title="Moderation"
            description="Advanced auto-mod, keyword filtering, and moderation tools to keep your server safe."
          />
          <FeatureCard
            icon={<Zap className="w-12 h-12 text-helix" />}
            title="Economy System"
            description="Virtual economy with currency, daily rewards, shop, inventory, and more."
          />
          <FeatureCard
            icon={<Users className="w-12 h-12 text-helix" />}
            title="Verification"
            description="Customizable verification system to protect your server from bots and raiders."
          />
          <FeatureCard
            icon={<Bot className="w-12 h-12 text-helix" />}
            title="Fun Commands"
            description="Games, memes, and entertainment commands to keep your community engaged."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gray-800 rounded-2xl p-12 text-center border border-gray-700">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Login with Discord to access the dashboard and start configuring Helix for your server.
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 px-8 py-4 bg-helix hover:bg-helix-dark rounded-lg text-lg font-semibold transition-colors"
          >
            Login with Discord
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>&copy; 2025 Helix Bot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-helix transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
