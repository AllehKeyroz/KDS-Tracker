
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { Copy, Target } from "lucide-react";
import { useEffect, useState } from "react";

interface WebhookPayload {
  id: string;
  payload: any;
  receivedAt: Date;
}

export default function DashboardPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [payloads, setPayloads] = useState<WebhookPayload[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // This code runs only on the client, so `window` is available.
    const url = `${window.location.origin}/api/webhook`;
    setWebhookUrl(url);

    const q = query(collection(db, "webhooks"), orderBy("receivedAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const receivedPayloads: WebhookPayload[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        receivedPayloads.push({
          id: doc.id,
          payload: data.payload,
          receivedAt: (data.receivedAt as Timestamp)?.toDate() ?? new Date(),
        });
      });
      setPayloads(receivedPayloads);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copiado!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Painel Lead Tracker</h1>
          </div>
        </header>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Seu Endpoint de Webhook</CardTitle>
            <CardDescription>
              Use esta URL para enviar dados de webhook para sua aplicação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="flex-1" />
              <Button onClick={copyToClipboard} size="icon" aria-label="Copiar URL">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Payloads Recebidos</CardTitle>
            <CardDescription>
              As informações recebidas através do webhook aparecerão aqui em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {payloads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aguardando o primeiro webhook...
                </p>
              ) : (
                payloads.map((item) => (
                  <div key={item.id} className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Recebido em: {item.receivedAt.toLocaleString()}
                    </p>
                    <pre className="p-3 bg-background rounded-md text-sm overflow-x-auto">
                      <code>{JSON.stringify(item.payload, null, 2)}</code>
                    </pre>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
