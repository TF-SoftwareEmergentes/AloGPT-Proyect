import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Radar, Users, User } from 'lucide-react';
import { Bar, Radar as RadarChart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface SentimentVisualizationProps {
  callerData?: any;
  clientData?: any;
}

const orderEmotionsBySentiment = (emotions: Record<string, number>) => {
  const emotionWeights: Record<string, number> = {
    'Contentment': 95, 'Relief': 90, 'Thankfulness/Gratitude': 88,
    'Affection': 85, 'Hope/Enthusiasm/Optimism': 82, 'Pride': 80,
    
    'Amusement': 75, 'Interest': 72, 'Elation': 70,
    'Pleasure/Ecstasy': 68, 'Triumph': 65, 'Authenticity': 62,
    
    'Astonishment/Surprise': 55, 'Confident_vs._Hesitant': 50, 'Teasing': 45,
    
    'Concentration': 35, 'Contemplation': 30, 'Awe': 20,
    'Serious_vs._Humorous': 15, 'Monotone_vs._Expressive': 10,
    'Warm_vs._Cold': 5, 'Soft_vs._Harsh': 0,
    
    'Doubt': -25, 'Confusion': -30, 'Longing': -25,
    'Infatuation': -20, 'Sourness': -35,
    
    'Disappointment': -45, 'Embarrassment': -50, 'Sadness': -55,
    'Fatigue/Exhaustion': -50, 'Emotional Numbness': -45,
    'Vulnerable_vs._Emotionally_Detached': -40,
    
    'Fear': -65, 'Distress': -70, 'Shame': -72,
    'Helplessness': -75, 'Bitterness': -68, 'Jealousy / Envy': -62,
    
    'Anger': -85, 'Disgust': -80, 'Contempt': -82,
    'Pain': -88, 'Malevolence/Malice': -95,
    'Impatience and Irritability': -90,
    
    'Arousal': 0, 'Valence': 0,
    'Intoxication/Altered States of Consciousness': -30
  };

  const emotionTuples = Object.entries(emotions).map(([emotion, value]) => ({
    emotion,
    value,
    weight: emotionWeights[emotion] || 0
  }));

  emotionTuples.sort((a, b) => b.weight - a.weight);

  return emotionTuples;
};

const getEmotionColor = (weight: number) => {
  if (weight >= 80) return '#22c55e';
  if (weight >= 40) return '#84cc16';
  if (weight >= -40) return '#eab308';
  if (weight >= -80) return '#f97316';
  return '#ef4444';
};

const SentimentVisualization: React.FC<SentimentVisualizationProps> = ({ callerData, clientData }) => {
  const [activeView, setActiveView] = useState<'caller' | 'client'>('caller');
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  const currentData = activeView === 'caller' ? callerData : clientData;
  
  if (!currentData?.all_scores) {
    return null;
  }

  let emotions = currentData.all_scores;
  if (typeof emotions === 'string') {
    try {
      emotions = JSON.parse(emotions);
    } catch (e) {
      console.error('Error parsing emotions:', e);
      return null;
    }
  }

  const orderedEmotions = orderEmotionsBySentiment(emotions);
  
  const labels = orderedEmotions.map(item => item.emotion);
  const values = orderedEmotions.map(item => item.value);
  const colors = orderedEmotions.map(item => getEmotionColor(item.weight));

  const barChartData = {
    labels,
    datasets: [
      {
        label: `Puntuación de ${activeView === 'caller' ? 'Agente' : 'Cliente'}`,
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(color => color + '80'),
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Análisis de Emociones - ${activeView === 'caller' ? 'Agente' : 'Cliente'}`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const emotion = orderedEmotions[context.dataIndex];
            const sentiment = emotion.weight >= 40 ? 'Positiva' : 
                            emotion.weight >= -40 ? 'Neutral' : 'Negativa';
            return `${context.label}: ${context.parsed.y.toFixed(3)} (${sentiment})`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
        },
      },
      y: {
        min: -1,
        max: 3,
        title: {
          display: true,
          text: 'Puntuación',
        },
        ticks: {
          stepSize: 0.5,
        },
      },
    },
  };

  const radarChartData = {
    labels: labels.slice(0, 12),
    datasets: [
      {
        label: `${activeView === 'caller' ? 'Agente' : 'Cliente'}`,
        data: values.slice(0, 12),
        backgroundColor: activeView === 'caller' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
        borderColor: activeView === 'caller' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
        borderWidth: 2,
        pointBackgroundColor: activeView === 'caller' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: activeView === 'caller' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
      },
    ],
  };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Radar de Emociones - ${activeView === 'caller' ? 'Agente' : 'Cliente'}`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      r: {
        min: -1,
        max: 3,
        ticks: {
          stepSize: 0.5,
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              {chartType === 'bar' ? <BarChart3 className="w-5 h-5" /> : <Radar className="w-5 h-5" />}
              <span>Visualización de Emociones</span>
            </span>
            <div className="flex space-x-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Columnas
              </Button>
              <Button
                variant={chartType === 'radar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('radar')}
              >
                <Radar className="w-4 h-4 mr-1" />
                Radar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeView === 'caller' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('caller')}
              disabled={!callerData?.all_scores}
              className={activeView === 'caller' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <User className="w-4 h-4 mr-1" />
              Agente
            </Button>
            <Button
              variant={activeView === 'client' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('client')}
              disabled={!clientData?.all_scores}
              className={activeView === 'client' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Users className="w-4 h-4 mr-1" />
              Cliente
            </Button>
          </div>

          <div className="h-96 w-full">
            {chartType === 'bar' ? (
              <Bar data={barChartData} options={barChartOptions} />
            ) : (
              <RadarChart data={radarChartData} options={radarChartOptions} />
            )}
          </div>

          {/* Emotion Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-800">Emociones Positivas</div>
              <div className="text-lg font-bold text-green-600">
                {orderedEmotions.filter(e => e.weight >= 40).length}
              </div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">Emociones Neutrales</div>
              <div className="text-lg font-bold text-yellow-600">
                {orderedEmotions.filter(e => e.weight >= -40 && e.weight < 40).length}
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-sm font-medium text-red-800">Emociones Negativas</div>
              <div className="text-lg font-bold text-red-600">
                {orderedEmotions.filter(e => e.weight < -40).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SentimentVisualization;
