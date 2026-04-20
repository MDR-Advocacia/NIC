import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const { token: tokenFromPath } = useParams();
    const navigate = useNavigate();

    const token = tokenFromPath || searchParams.get('token');
    const emailParam = searchParams.get('email');

    const [email, setEmail] = useState(emailParam || '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('');
        setError('');

        if (!token) {
            setError('Token de redefinicao invalido ou ausente.');
            return;
        }

        if (password !== passwordConfirmation) {
            setError('As senhas nao conferem.');
            return;
        }

        try {
            await apiClient.post('/reset-password', {
                token,
                email: email.trim(),
                password,
                password_confirmation: passwordConfirmation,
            });

            setStatus('Senha alterada com sucesso! Redirecionando...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.email || 'Erro ao resetar senha. O link pode ter expirado.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Nova Senha</h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input type="hidden" value={token || ''} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 p-2 w-full border rounded bg-gray-50"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1 p-2 w-full border rounded"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            value={passwordConfirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            className="mt-1 p-2 w-full border rounded"
                            required
                        />
                    </div>

                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded transition">
                        Redefinir Senha
                    </button>
                </form>

                {status && <div className="mt-4 p-2 bg-green-100 text-green-700 rounded text-sm text-center">{status}</div>}
                {error && <div className="mt-4 p-2 bg-red-100 text-red-700 rounded text-sm text-center">{error}</div>}
            </div>
        </div>
    );
}
