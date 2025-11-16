"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import Link from "next/link"

interface Agent {
  id: string
  name: string
  description: string
  status: "active" | "coming_soon"
  icon: string
  color: string
  route: string
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 backdrop-blur-md !bg-white/10 !border-white/20 shadow-lg !text-white ${
        agent.status === "active" ? "hover:!bg-white/20" : "opacity-75"
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-10`} />

      <CardHeader className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="text-3xl">{agent.icon}</div>
          <Badge
            variant={agent.status === "active" ? "default" : "secondary"}
            className={agent.status === "active" ? "bg-purple-500/80 text-white backdrop-blur-sm" : "bg-white/20 text-white/70 backdrop-blur-sm"}
          >
            {agent.status === "active" ? "Activo" : "Prximamente"}
          </Badge>
        </div>

        <CardTitle className="text-xl font-semibold text-white">{agent.name}</CardTitle>
        <CardDescription className="text-white/80">{agent.description}</CardDescription>
      </CardHeader>

      <CardContent className="relative">
        {agent.status === "active" ? (
          <Link href={agent.route}>
            <Button className={`w-full bg-gradient-to-r ${agent.color} hover:opacity-90 text-white font-medium shadow-lg backdrop-blur-sm`}>
              Acceder al Agente
            </Button>
          </Link>
        ) : (
          <Button disabled className="w-full bg-white/10 text-white/50 border-white/20 backdrop-blur-sm" variant="outline">
            Prximamente
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
