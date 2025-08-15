
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthError } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GoogleIcon } from "@/components/icons/google-icon";
import { signInWithEmail, signInWithGoogle, getFirebaseErrorMessage } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmail(values.email, values.password);
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel.",
      });
      router.push("/dashboard");
    } catch (error) {
      const firebaseError = error as AuthError;
      toast({
        title: "Erro no login",
        description: getFirebaseErrorMessage(firebaseError),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function onGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Login com Google bem-sucedido!",
        description: "Redirecionando para o painel.",
      });
      router.push("/dashboard");
    } catch (error) {
      const firebaseError = error as AuthError;
      toast({
        title: "Erro no login com Google",
        description: getFirebaseErrorMessage(firebaseError),
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="seu@email.com" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Sua senha" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
                Ou continue com
            </span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onGoogleLogin} disabled={isGoogleLoading}>
        {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
            <GoogleIcon className="mr-2 h-5 w-5" />
        )}
        Entrar com Google
      </Button>
    </div>
  );
}
