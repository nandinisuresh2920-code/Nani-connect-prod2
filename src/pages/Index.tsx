import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      console.log('Index page: Auth loading finished. User:', user);
      if (user) {
        const userRole = user.user_metadata?.role;
        console.log('Index page: User found, role:', userRole);
        if (userRole === 'seller') {
          navigate('/seller-dashboard');
        } else {
          // Default to buyer dashboard if no role or buyer role
          navigate('/buyer-dashboard');
        }
      } else {
        console.log('Index page: No user found, redirecting to login.');
        navigate('/login');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Loading Nani Connect...</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Redirecting you to the appropriate page.
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;