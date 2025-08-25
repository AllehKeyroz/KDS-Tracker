
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Settings, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const settingsFormSchema = z.object({
  metaAccessToken: z.string().min(1, { message: "O token de acesso é obrigatório." }),
  whitelabelDomain: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      metaAccessToken: "",
      whitelabelDomain: "",
    },
  });

  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const url = `${window.location.origin}/api/webhook/${user.uid}`;
      setWebhookUrl(url);
    }
  }, [user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
  };

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setIsFormLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        form.reset({
          metaAccessToken: data.metaAccessToken || "",
          whitelabelDomain: data.whitelabelDomain || "",
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível buscar suas configurações salvas.",
        variant: "destructive",
      });
    } finally {
      setIsFormLoading(false);
    }
  }, [user, form, toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  async function onSubmit(values: SettingsFormValues) {
    if (!user) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, values, { merge: true });
      toast({
        title: "Configurações Salvas!",
        description: "Suas configurações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Configurações da Conta</h1>
        </header>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Seu Endpoint de Webhook Único</CardTitle>
            <CardDescription>
              Use esta URL na configuração do seu webhook no painel da Meta. Ela é exclusiva para sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {webhookUrl ? (
                <Input value={webhookUrl} readOnly className="flex-1" />
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
              <Button onClick={() => copyToClipboard(webhookUrl)} size="icon" aria-label="Copiar URL" disabled={!webhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Para a verificação inicial no painel da Meta, use o seguinte token: <code className="bg-muted px-1.5 py-0.5 rounded-sm font-semibold">um_token_secreto_para_verificacao</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
            <CardDescription>
              Configure os tokens e domínios para conectar com serviços externos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFormLoading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24" />
                 </div>
            ) : (
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="metaAccessToken"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Token de Acesso da Meta</FormLabel>
                        <FormControl>
                            <Input placeholder="Cole seu token de acesso da API do Graph aqui" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="whitelabelDomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domínio Whitelabel (GoHighLevel)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://app.seucrm.com" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configurações
                    </Button>
                </form>
                </Form>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Ajuda</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Onde encontrar meu Token de Acesso da Meta?</AccordionTrigger>
                        <AccordionContent>
                            <div className="prose prose-invert text-foreground space-y-4">
                                <p>Para obter seu token de acesso, siga estes passos no painel da Meta para Desenvolvedores:</p>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Acesse o <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Graph API Explorer</a> da Meta.</li>
                                    <li>No canto superior direito, selecione o seu <strong>Aplicativo da Meta</strong> no menu suspenso.</li>
                                    <li>Abaixo disso, no menu "Token", certifique-se de que "Token do Aplicativo" ou um "Token de Acesso do Usuário" apropriado esteja selecionado.</li>
                                    <li>Clique em "Adicionar uma permissão" e adicione a permissão <strong>ads_read</strong>. Sem ela, a consulta falhará.</li>
                                    <li>Clique no botão <strong>"Gerar Token de Acesso"</strong>.</li>
                                    <li>Copie o token gerado e cole-o no campo acima. Lembre-se que tokens de curta duração expiram rapidamente. Para uma solução de longo prazo, considere gerar um token de longa duração.</li>
                                </ol>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
