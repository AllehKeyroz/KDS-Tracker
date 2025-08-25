
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp, where, doc, getDoc } from "firebase/firestore";
import { ExternalLink, Video, Image as ImageIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useCallback, useMemo, use } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const LEADS_PER_PAGE = 50;

export default function EmbedLeadsPage({ params }: { params: { userId: string } }) {
  const { userId } = use(params);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings>({});
  const { toast } = useToast();

  const [campaignFilter, setCampaignFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const loadUserSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const userDocRef = doc(db, "users", userId);
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
  }, [userId]);

  useEffect(() => {
    if (!userId) {
        setIsLoadingLeads(false);
        return;
    };
    loadUserSettings();

    const q = query(
      collection(db, "leads"),
      where("userId", "==", userId),
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
      setAllLeads(receivedLeads);
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
  }, [userId, toast, loadUserSettings]);

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      const campaignMatch = campaignFilter === 'all' || lead.campaign === campaignFilter;
      const channelMatch = channelFilter === 'all' || lead.medium === channelFilter;
      const statusMatch = statusFilter === 'all' || lead.status === statusFilter;
      return campaignMatch && channelMatch && statusMatch;
    });
  }, [allLeads, campaignFilter, channelFilter, statusFilter]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * LEADS_PER_PAGE;
    return filteredLeads.slice(startIndex, startIndex + LEADS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / LEADS_PER_PAGE);

  const campaigns = useMemo(() => [...new Set(allLeads.map(lead => lead.campaign))], [allLeads]);
  const channels = useMemo(() => [...new Set(allLeads.map(lead => lead.medium))], [allLeads]);
  const statuses: LeadStatus[] = ['Aberto', 'Ganho', 'Perdido', 'Abandonado'];

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast({
        title: "Nenhum lead para exportar",
        description: "A lista de leads filtrada está vazia.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      "Data/Hora", "Nome", "Telefone", "Status", "Origem", "Canal",
      "Campanha", "Anuncio (ID)", "Criativo (Tipo)", "Titulo", "Descricao"
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${lead.receivedAt.toLocaleString()}"`,
        `"${lead.leadName.replace(/"/g, '""')}"`,
        `"${lead.leadPhone}"`,
        `"${lead.status}"`,
        `"${lead.origin}"`,
        `"${lead.medium}"`,
        `"${lead.campaign.replace(/"/g, '""')}"`,
        `"${lead.adId}"`,
        `"${lead.mediaType}"`,
        `"${lead.adTitle.replace(/"/g, '""')}"`,
        `"${lead.adDescription.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "leads_exportados.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
     toast({
        title: "Exportação Concluída",
        description: `${filteredLeads.length} leads foram exportados com sucesso.`,
      });
  };

  const getStatusVariant = (status: LeadStatus): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Aberto':
            return 'default';
        case 'Ganho':
            return 'secondary';
        case 'Perdido':
            return 'destructive';
        case 'Abandonado':
            return 'secondary';
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
    const locationId = "Wp2QqGqwDcJWMJgesNmB"; 
    const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    return `${fullDomain}/v2/location/${locationId}/contacts/detail/${contactId}`;
  }

  return (
    <div className="p-4 bg-background">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Leads Recebidos</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="flex flex-wrap items-center gap-4 mb-4">
              <Select value={campaignFilter} onValueChange={(value) => { setCampaignFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por Campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Campanhas</SelectItem>
                  {campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={(value) => { setChannelFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Canais</SelectItem>
                  {channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as LeadStatus | 'all'); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar para CSV
              </Button>
            </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLeads ? (
                   Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                ) : paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                       {allLeads.length > 0 ? 'Nenhum lead corresponde aos filtros selecionados.' : 'Nenhum lead encontrado...'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead) => {
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
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </TooltipProvider>
          </div>
           <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
