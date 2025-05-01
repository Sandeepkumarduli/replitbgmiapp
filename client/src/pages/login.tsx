import { AuthForm } from "@/components/auth/auth-form";

export default function Login() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-dark py-12">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <span className="text-primary text-4xl font-bold">BGMI</span>
          <span className="text-white text-4xl font-bold ml-1">Tourneys</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 mt-2">Sign in to your account to continue</p>
      </div>
      
      <AuthForm type="login" role="user" />
    </div>
  );
}
