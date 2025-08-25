
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp, where, doc, deleteDoc, getDoc } from "firebase/firestore";
import { ExternalLink, Video, Image as ImageIcon, Trash2, Target } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge";

type LeadStatus = 'Aberto' | 'Ganho' | 'Perdido' | 'Abandonado';

interface Lead {
  id: string;
  receivedAt: Date;
  leadName: string;
  leadPhone: string;
  origin: string;
  medium: string;
  campaign: string;
  adId: string;
  mediaType: string;
  adLink: string;
  adThumbnail: string;
  adVideo: string;
  adTitle: string;
  adDescription: string;
  ctwaClickId: string;
  contactId: string;
  status: LeadStatus;
}

interface UserSettings {
  whitelabelDomain?: string;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const loadUserSettings = useCallback(async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserSettings({
          whitelabelDomain: data.whitelabelDomain || "",
        });
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadUserSettings();

    const q = query(
      collection(db, "leads"),
      where("userId", "==", user.uid),
      orderBy("receivedAt", "desc")
    );

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
          mediaType: data.mediaType || 'N/A',
          adLink: data.adLink || '#',
          adThumbnail: data.adThumbnail || '',
          adVideo: data.adVideo || '',
          adTitle: data.adTitle || 'N/A',
          adDescription: data.adDescription || 'N/A',
          ctwaClickId: data.ctwaClickId || 'N/A',
          contactId: data.contactId || '',
          status: data.status || 'Aberto',
        });
      });
      setLeads(receivedLeads);
      setIsLoadingLeads(false);
    }, (error) => {
      console.error("Error fetching leads:", error);
      toast({
        title: "Erro ao buscar leads",
        description: "Não foi possível carregar os leads. Verifique o console para mais detalhes.",
        variant: "destructive"
      })
      setIsLoadingLeads(false);
    });

    return () => unsubscribe();
  }, [user, toast, loadUserSettings]);

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, "leads", leadId));
      toast({
        title: "Lead excluído!",
        description: "O lead foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover o lead. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: LeadStatus): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Aberto':
            return 'default'; // primary color
        case 'Ganho':
            return 'secondary'; // using secondary for success, you can customize this
        case 'Perdido':
            return 'destructive';
        case 'Abandonado':
            return 'secondary'; // muted color
        default:
            return 'default';
    }
  };

  const renderMediaIcon = (lead: Lead) => {
    if (lead.adVideo) {
      return <a href={lead.adVideo} target="_blank" rel="noopener noreferrer" title="Ver Vídeo"><Video className="h-5 w-5 text-primary" /></a>;
    }
    if (lead.adThumbnail) {
      return (
        <a href={lead.adThumbnail} target="_blank" rel="noopener noreferrer" title="Ver Thumbnail"><ImageIcon className="h-5 w-5 text-primary" /></a>
      );
    }
    return lead.mediaType;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "N/A";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  }

  const TruncatedCell = ({ text, maxLength }: { text: string; maxLength: number }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{truncateText(text, maxLength)}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );

  const formatCrmUrl = (domain: string, contactId: string) => {
    if (!domain || !contactId) return null;
    // Assume a location ID hardcoded for now or it should come from settings too.
    const locationId = "Wp2QqGqwDcJWMJgesNmB"; 
    // Ensure domain has protocol
    const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    return `${fullDomain}/v2/location/${locationId}/contacts/detail/${contactId}`;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Painel Lead Tracker</h1>
          </div>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Leads Recebidos</CardTitle>
            <CardDescription>
              Os leads rastreados para sua conta aparecerão aqui em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pr-2 border rounded-lg">
            <TooltipProvider>
              <Table>
                <TableHeader className="bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Anúncio (ID)</TableHead>
                    <TableHead>Criativo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLeads ? (
                     Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={12}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center">
                        Aguardando o primeiro lead...
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => {
                      const crmUrl = formatCrmUrl(userSettings.whitelabelDomain!, lead.contactId);
                      return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {lead.receivedAt.toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {crmUrl ? (
                            <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              {lead.leadName}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            lead.leadName
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{lead.leadPhone}</TableCell>
                        <TableCell>
                           <Badge 
                            variant={getStatusVariant(lead.status)} 
                            className={`
                                ${lead.status === 'Ganho' && 'bg-green-600 text-white'}
                                ${lead.status === 'Abandonado' && 'bg-yellow-500 text-black'}
                            `}
                            >
                                {lead.status}
                           </Badge>
                        </TableCell>
                        <TableCell>{lead.origin}</TableCell>
                        <TableCell>{lead.medium}</TableCell>
                        <TableCell><TruncatedCell text={lead.campaign} maxLength={20} /></TableCell>
                        <TableCell>
                          <a 
                            href={lead.adLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <TruncatedCell text={lead.adId} maxLength={10} />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-center">{renderMediaIcon(lead)}</TableCell>
                        <TableCell><TruncatedCell text={lead.adTitle} maxLength={20} /></TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <span className="cursor-pointer hover:underline">{truncateText(lead.adDescription, 20)}</span>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <p className="text-sm">{lead.adDescription}</p>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Excluir Lead</p>
                                </TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o lead de nome <span className="font-semibold">{lead.leadName}</span>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteLead(lead.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
