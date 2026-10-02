"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AccountShell from "@/components/account/AccountShell";
import { useAuthStore } from "@/store/auth";
import { useToastStore } from "@/store/store";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht"),
  email: z.string().trim().min(1, "E-mailadres is verplicht").email("Ongeldig e-mailadres"),
});

type ProfileValues = z.infer<typeof profileSchema>;

function ProfileForm() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const showToast = useToastStore((state) => state.showToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email });
  }, [user, reset]);

  function onSubmit(values: ProfileValues) {
    updateProfile(values);
    showToast("Profiel opgeslagen", "success");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-900">Naam</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          {...register("name")}
          className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C9A961]"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900">E-mailadres</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#C9A961]"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={!isDirty}
        className="self-start rounded bg-[#C9A961] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#B39450] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Opslaan
      </button>
    </form>
  );
}

export default function AccountProfilePage() {
  return (
    <AccountShell title="Profiel" description="Pas je naam en e-mailadres aan.">
      <ProfileForm />
    </AccountShell>
  );
}
