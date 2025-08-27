import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const LoginScreen: React.FC = () => {
    const { login, error: authError } = useAuth();
    const { settings } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (authError) {
            setError(authError.message || 'An unknown authentication error occurred.');
            setLoading(false);
        }
    }, [authError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        await login(email, password);
        // Loading state will be turned off by the error useEffect if login fails
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Login</h1>
                    <CardTitle className="text-lg font-normal text-foreground/80">Welcome to {settings.name}</CardTitle>
                    <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email">Email</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password">Password</label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <LoadingSpinner size="sm" />
                                    <span>Signing In...</span>
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default LoginScreen;