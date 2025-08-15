import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Utensils } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Utensils className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Bem-vindo ao KDS Tracker!</CardTitle>
          <CardDescription className="text-lg">
            Sua sessão foi iniciada com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">
            Agora você pode começar a acompanhar seus pedidos.
          </p>
          <Link href="/">
            <Button>Voltar para o login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
