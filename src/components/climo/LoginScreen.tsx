import { useState } from 'react';
import { BrainCircuit, Mail, Lock, AlertTriangle } from 'lucide-react';
import { ShaderGradientCanvas, ShaderGradient } from 'shadergradient';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@climo.com.br' && password === 'admin123') {
      onLogin();
    } else {
      setError('Credenciais inválidas. Use admin@climo.com.br / admin123');
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0b0d11' }}
    >
      <div className="absolute inset-0 z-0">
        <ShaderGradientCanvas>
          <ShaderGradient
            animate="on"
            brightness={0.2}
            cAzimuthAngle={180}
            cDistance={3.6}
            cPolarAngle={90}
            cameraZoom={1}
            color1="#124a86"
            color2="#042864"
            color3="#004f9e"
            envPreset="city"
            lightType="env"
            positionX={-1.4}
            positionY={0}
            positionZ={0}
            reflection={0.6}
            rotationX={0}
            rotationY={10}
            rotationZ={50}
            type="waterPlane"
            uAmplitude={1}
            uDensity={1.3}
            uFrequency={5.5}
            uSpeed={0.3}
            uStrength={4}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </div>

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
