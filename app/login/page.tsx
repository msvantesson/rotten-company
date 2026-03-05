import Link from 'next/link';

function LoginPage() {
    return (
        <div>
            <h1>Login</h1>
            <Link href="/forgot-password">Forgot password?</Link>
        </div>
    );
}

export default LoginPage;