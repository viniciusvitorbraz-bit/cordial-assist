import { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Mail, Lock, AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@climo.com.br' && password === 'admin123') {
      onLogin();
    } else {
      setError('Credenciais inválidas. Use admin@climo.com.br / admin123');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; vx: number; vy: number }[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const brandColor = '92, 166, 230';

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandColor}, 0.2)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const particle2 = particles[j];
          const dx = particle.x - particle2.x;
          const dy = particle.y - particle2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 130) {
            ctx.beginPath();
            const alpha = 0.1 * (1 - distance / 130);
            ctx.strokeStyle = `rgba(${brandColor}, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle2.x, particle2.y);
            ctx.stroke();
          }
        }

        const mouseX = mouseRef.current.x;
        const mouseY = mouseRef.current.y;
        if (mouseX !== -1000 && mouseY !== -1000) {
          const dxMouse = particle.x - mouseX;
          const dyMouse = particle.y - mouseY;
          const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distanceMouse < 250) {
            ctx.beginPath();
            const alpha = 0.15 * (1 - distanceMouse / 250);
            ctx.strokeStyle = `rgba(${brandColor}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
            const force = (250 - distanceMouse) / 250;
            particle.x += (dxMouse / distanceMouse) * force * 0.05;
            particle.y += (dyMouse / distanceMouse) * force * 0.05;
          }
        }
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0b0d11' }}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(92, 166, 230, 0.1)' }}>
            <div className="relative">
              <BrainCircuit className="w-8 h-8" style={{ color: '#5ca6e6' }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#e1e4eb' }}>ClimoManager</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Acesso restrito à equipe operacional</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl p-8 border shadow-xl" style={{ backgroundColor: 'rgba(17, 19, 25, 0.85)', borderColor: '#1e2230', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#9ca3af' }}>E-mail Profissional</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-4 h-4" style={{ color: '#4b5563' }} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@climo.com.br"
                  required
                  className="w-full text-sm rounded-lg block pl-10 p-3 transition-all outline-none"
                  style={{
                    backgroundColor: '#14161b',
                    border: '1px solid #2a2e39',
                    color: '#e1e4eb',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#5ca6e6';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #5ca6e6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#2a2e39';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#9ca3af' }}>Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-4 h-4" style={{ color: '#4b5563' }} />
                </div>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-sm rounded-lg block pl-10 p-3 transition-all outline-none"
                  style={{
                    backgroundColor: '#14161b',
                    border: '1px solid #2a2e39',
                    color: '#e1e4eb',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#5ca6e6';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #5ca6e6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#2a2e39';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #5ca6e6, #3b82f6)',
                color: '#ffffff',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Acessar Sistema
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: '#4b5563' }}>
            Precisa de ajuda com seu acesso?
          </p>
        </div>
      </div>
    </div>
  );
}
