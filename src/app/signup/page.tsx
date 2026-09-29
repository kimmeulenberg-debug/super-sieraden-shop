'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/store';

const signupSchema = z.object({
  name: z.string().min(2, 'Naam moet minimaal 2 karakters zijn'),
  email: z.string().email('Voer een geldig e-mailadres in'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 karakters zijn'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Wachtwoorden komen niet overeen',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const showToast = useToastStore((state) => state.showToast);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true);
    try {
      await signup(data.email, data.name, data.password);
      showToast('Account aangemaakt! Welkom!', 'success');
      router.push('/account');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Registratie mislukt',
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
            Account aanmaken
          </h1>
          <p className="text-gray-600">
            Registreer je om sneller af te rekenen en je bestellingen te volgen
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Volledige naam
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              placeholder="Jan Jansen"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
              Wachtwoord
            </label>
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

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
              Wachtwoord bevestigen
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#C9A961] text-white font-semibold rounded-lg hover:bg-[#B39450] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? 'Account aanmaken...' : 'Account aanmaken'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm">of</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            Heb je al een account?
          </p>
          <Link
            href="/login"
            className="text-[#C9A961] hover:text-[#B39450] font-semibold transition-colors"
          >
            Inloggen
          </Link>
        </div>

        {/* Demo Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700">
            💡 <strong>Demo:</strong> Voer een naam, e-mailadres en wachtwoord in om een account aan te maken.
          </p>
        </div>
      </div>
    </main>
  );
}
