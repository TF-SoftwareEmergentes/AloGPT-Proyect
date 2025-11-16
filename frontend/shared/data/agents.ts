export interface Agent {
  id: string
  name: string
  description: string
  status: "active" | "coming_soon"
  icon: string
  color: string
  route: string
}

export const AGENTS: Agent[] = [
  {
    id: "feeling-analytics",
    name: "Análisis de Sentimientos de Audio",
    description: "Analiza emociones y sentimientos en archivos de audio usando IA avanzada",
    status: "active",
    icon: "",
    color: "from-purple-500 to-indigo-600",
    route: "/feeling-analytics",
  },
  {
    id: "consent-analytics",
    name: "Agente de NLQ en SQL",
    description: "Generador de querys y graficos desde prompts en lenguaje natural",
    status: "coming_soon",
    icon: "",
    color: "from-blue-500 to-cyan-600",
    route: "/text-analytics",
  },
  {
    id: "data-science-agent",
    name: "Agente de Ciencia de Datos",
    description: "Agente especializado en análisis de datos y modelamiento predictivo",
    status: "coming_soon",
    icon: "",
    color: "from-orange-500 to-red-600",
    route: "/document-analytics",
  },
]
