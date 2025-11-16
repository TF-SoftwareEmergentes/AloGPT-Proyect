"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SentimentAnalysisResult, SentimentRecord, SentimentStatistics } from "@/types/sentiment"

export function Summary({ statistics }: { statistics: SentimentStatistics | null }) {
    return (
        <TabsContent value="dashboard" className="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle className="text-purple-800">Resumen Multichannel</CardTitle>
            <CardDescription>
                Estadsticas de Análisis separado por canales
            </CardDescription>
        </CardHeader>
        <CardContent>
            {statistics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-purple-100 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-purple-700">
                            {statistics.total_audios}
                        </div>
                        <div className="text-purple-800">Audios Analizados</div>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-blue-700">
                            {typeof statistics?.avg_caller_score === "number"
                                ? statistics.avg_caller_score.toFixed(2)
                                : "0.00"}
                        </div>
                        <div className="text-blue-800">Score Agente</div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-700">
                            {typeof statistics?.avg_client_score === "number"
                                ? statistics.avg_client_score.toFixed(2)
                                : "0.00"}
                        </div>
                        <div className="text-green-800">Score Cliente</div>
                    </div>
                    <div className="bg-orange-100 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-orange-700">
                            {statistics.stereo_percentage.toFixed(1)}%
                        </div>
                        <div className="text-orange-800">Audios Estéreo</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-gray-700">
                            {typeof statistics?.avg_final_score === "number"
                                ? statistics.avg_final_score.toFixed(2)
                                : "0.00"}
                        </div>
                        <div className="text-gray-800">Score General</div>
                    </div>
                </div>
            ) : (
                <div className="text-gray-500">Cargando estadsticas...</div>
            )}
        </CardContent>
    </Card>
</TabsContent>
    );
}