
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { Copy, Target } from "lucide-react";
import { useEffect, useState } from "react";

// Interface para a estrutura do Lead que será exibida na tabela
interface Lead {
  id: string;
  receivedAt: Date;
  leadName: string;
  leadPhone: string;
  origin: string;
  medium: string;
  campaign: string;
  adId: string;
  adLink: string;
}

export default function DashboardPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Gera a URL do webhook dinamicamente no lado do cliente
    const url = `${window.location.origin}/api/webhook`;
    setWebhookUrl(url);

    // Ouve em tempo real a coleção 'leads' no Firestore
    const q = query(collection(db, "leads"), orderBy("receivedAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const receivedLeads: Lead[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        receivedLeads.push({
          id: doc.id,
          receivedAt: (data.receivedAt as Timestamp)?.toDate() ?? new Date(),
          leadName: data.leadName || 'N/A',
          leadPhone: data.leadPhone || 'N/A',
          origin: data.origin || 'N/A',
          medium: data.medium || 'N/A',
          campaign: data.campaign || 'N/A',
          adId: data.adId || 'N/A',
          adLink: data.adLink || '#',
        });
      });
      setLeads(receivedLeads);
    });

    // Limpa a inscrição ao desmontar o componente
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
      <div className="w-full max-w-7xl">
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
              Use esta URL para enviar dados de webhook do Meta para sua aplicação.
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
            <CardTitle>Leads Recebidos</CardTitle>
            <CardDescription>
              Os leads rastreados aparecerão aqui em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto pr-2 border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Nome do Lead</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Campanha/Anúncio</TableHead>
                    <TableHead>ID do Anúncio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Aguardando o primeiro lead...
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.receivedAt.toLocaleString()}
                        </TableCell>
                        <TableCell>{lead.leadName}</TableCell>
                        <TableCell>{lead.leadPhone}</TableCell>
                        <TableCell>{lead.origin}</TableCell>
                        <TableCell>{lead.medium}</TableCell>
                        <TableCell>{lead.campaign}</TableCell>
                        <TableCell>
                          <a 
                            href={lead.adLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {lead.adId}
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
