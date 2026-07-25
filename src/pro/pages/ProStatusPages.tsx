import { Music, Clock, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function ProPendingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-white/60" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Awaiting Approval</h1>
        <p className="text-white/40 mb-6">Your account is pending review by the artist team. You'll receive an email once approved.</p>
        <Link to="/pro/login"><Button variant="secondary">Back to Login</Button></Link>
      </div>
    </div>
  );
}

export function ProSuspendedPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Ban size={32} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
        <p className="text-white/40 mb-6">Your portal access has been suspended. Please contact the artist team for assistance.</p>
        <Link to="/pro/login"><Button variant="secondary">Back to Login</Button></Link>
      </div>
    </div>
  );
}
