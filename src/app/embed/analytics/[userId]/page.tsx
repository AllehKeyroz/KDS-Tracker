
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { LineChart, Users, TrendingUp, TrendingDown, Target } from "lucide-react";
import { useEffect, useState, useMemo, use } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, XAxis, YAxis, Line as RechartsLine, LineChart as RechartsLineChart, Tooltip as RechartsTooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

type LeadStatus = 'Aberto' | 'Ganho' | 'Perdido' | 'Abandonado';

interface Lead {
  id: string;
  receivedAt: Date;
  campaign: string;
  status: LeadStatus;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function EmbedAnalyticsPage({ params }: { params: { userId: string } }) {
  const { userId } = use(params);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return
    };

    const q = query(
      collection(db, "leads"),
      where("userId", "==", userId),
      orderBy("receivedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const receivedLeads: Lead[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          receivedLeads.push({
            id: doc.id,
            receivedAt: (data.receivedAt as Timestamp)?.toDate() ?? new Date(),
            campaign: data.campaign || "Sem Campanha",
            status: data.status || "Aberto",
          });
        });
        setLeads(receivedLeads);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching leads:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const leadsByDay = useMemo(() => {
    const counts: { [key: string]: number } = {};
    leads.forEach((lead) => {
      const day = lead.receivedAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      counts[day] = (counts[day] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .reverse(); 
  }, [leads]);

  const leadsByCampaign = useMemo(() => {
    const counts: { [key: string]: number } = {};
    leads.forEach((lead) => {
      counts[lead.campaign] = (counts[lead.campaign] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, fill: COLORS[Math.floor(Math.random() * COLORS.length)] }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

   const leadsByStatus = useMemo(() => {
    const counts: { [key in LeadStatus]: number } = {
      'Aberto': 0,
      'Ganho': 0,
      'Perdido': 0,
      'Abandonado': 0,
    };
    leads.forEach((lead) => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return [
      { name: 'Aberto', value: counts.Aberto, fill: "hsl(var(--chart-1))" },
      { name: 'Ganho', value: counts.Ganho, fill: "hsl(var(--chart-2))" },
      { name: 'Perdido', value: counts.Perdido, fill: "hsl(var(--chart-3))" },
      { name: 'Abandonado', value: counts.Abandonado, fill: "hsl(var(--chart-4))" },
    ];
  }, [leads]);

  const conversionMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const wonLeads = leads.filter(lead => lead.status === 'Ganho').length;
    const lostLeads = leads.filter(lead => lead.status === 'Perdido').length;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
    return {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
    }
  }, [leads]);

  const chartConfig = useMemo(() => {
    const config: any = {};
    leadsByCampaign.forEach((campaign, index) => {
        config[campaign.name] = {
            label: campaign.name,
            color: COLORS[index % COLORS.length]
        }
    });
    return config;
  }, [leadsByCampaign]);

  const statusChartConfig = {
    value: { label: "Leads" },
    Aberto: { label: "Aberto", color: "hsl(var(--chart-1))" },
    Ganho: { label: "Ganho", color: "hsl(var(--chart-2))" },
    Perdido: { label: "Perdido", color: "hsl(var(--chart-3))" },
    Abandonado: { label: "Abandonado", color: "hsl(var(--chart-4))" },
  };

  return (
    <div className="p-4 bg-background">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{conversionMetrics.totalLeads}</div>}
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Ganhos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{conversionMetrics.wonLeads}</div>}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Perdidos</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{conversionMetrics.lostLeads}</div>}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{conversionMetrics.conversionRate.toFixed(1)}%</div>}
              </CardContent>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Leads por Dia</CardTitle>
            <CardDescription>
              Volume de leads recebidos nos últimos dias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ChartContainer config={{}} className="h-[250px] w-full">
                 <RechartsLineChart data={leadsByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <RechartsLine type="monotone" dataKey="count" stroke="hsl(var(--primary))" name="Leads" />
                  </RechartsLineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Leads por Status</CardTitle>
            <CardDescription>
              Distribuição dos leads por cada status.
            </CardDescription>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
              ) : (
                  <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                      <BarChart data={leadsByStatus} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <YAxis
                              dataKey="name"
                              type="category"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              width={80}
                          />
                          <XAxis dataKey="value" type="number" hide />
                          <RechartsTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Bar dataKey="value" layout="vertical" radius={5}>
                              <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} />
                          </Bar>
                      </BarChart>
                  </ChartContainer>
              )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg col-span-full">
          <CardHeader>
            <CardTitle>Distribuição por Campanha</CardTitle>
            <CardDescription>
              Performance das campanhas em volume de leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             {isLoading ? (
              <Skeleton className="h-[250px] w-[250px] rounded-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[400px]">
                  <PieChart>
                      <RechartsTooltip content={<ChartTooltipContent nameKey="name" hideIndicator />} />
                      <Pie
                          data={leadsByCampaign}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                      >
                           <LabelList
                              dataKey="value"
                              className="fill-background"
                              stroke="none"
                              fontSize={12}
                              />
                      </Pie>
                       <ChartLegend
                          content={<ChartLegendContent nameKey="name" />}
                          className="-translate-y-2 flex-wrap"
                      />
                  </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
