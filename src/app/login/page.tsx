'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/store';

const loginSchema = z.object({
  email: z.string().email('Voer een geldig e-mailadres in'),
  password: z.string().min(1, 'Wachtwoord is verplicht'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const showToast = useToastStore((state) => state.showToast);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      showToast('Succesvol ingelogd!', 'success');
      router.push('/account');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Inloggen mislukt',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 text-sm mb-6 inline-block transition-colors"
          >
            ← Terug naar shop
          </Link>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Inloggen
          </h1>
          <p className="text-gray-600">
            Log in met je account om je bestellingen te beheren
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
              E-mailadres
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              placeholder="jouw@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Wachtwoord
              </label>
              <Link
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-[#C9A961] hover:text-[#B39450] transition-colors"
              >
                Vergeten?
              </Link>
            </div>
            <input
              {...register('password')}
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#C9A961] text-white font-semibold rounded-lg hover:bg-[#B39450] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm">of</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Signup Link */}
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            Nog geen account?
          </p>
          <Link
            href="/signup"
            className="text-[#C9A961] hover:text-[#B39450] font-semibold transition-colors"
          >
            Registreer nu
          </Link>
        </div>

        {/* Demo Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700">
            💡 <strong>Demo:</strong> Voer een willekeurig e-mailadres en wachtwoord in om in te loggen.
          </p>
        </div>
      </div>
    </main>
  );
}
