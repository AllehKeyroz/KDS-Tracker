
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { History, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface WebhookLog {
  id: string;
  receivedAt: Date;
  leadName: string;
  payload: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "webhook_logs"),
      where("userId", "==", user.uid)
      // Removido orderBy("receivedAt", "desc") para evitar erro de índice
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const receivedLogs: WebhookLog[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          receivedLogs.push({
            id: doc.id,
            receivedAt: (data.receivedAt as Timestamp)?.toDate() ?? new Date(),
            leadName: data.leadName || "Lead sem nome",
            payload: data.payload || {},
          });
        });
        // Ordena os logs no lado do cliente
        const sortedLogs = receivedLogs.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
        setLogs(sortedLogs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching logs:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Logs de Webhooks</h1>
          </div>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Payloads Recebidos</CardTitle>
            <CardDescription>
              Aqui está o histórico de todos os dados recebidos pelo seu endpoint de webhook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum log de webhook encontrado ainda.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {logs.map((log) => (
                  <AccordionItem value={log.id} key={log.id}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold text-left">{log.leadName}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{log.receivedAt.toLocaleString()}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
