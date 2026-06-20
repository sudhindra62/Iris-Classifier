import React, { useState, useEffect, useCallback } from 'react';
import { IrisData, Species, TrainedModel, AdvancedPredictionResult } from '../types';
import { featureLabels, speciesColors } from '../lib/utils';
import { Flower2, Activity, Lock, Plus, Network, Sigma, Save, Clock, GitBranch, FileUp, Loader2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface LoggedPrediction {
  timestamp: string;
  inputs: Omit<IrisData, 'species'>;
  prediction: Species;
  modelInfo: string;
  latencyMs?: string;
}

interface PredictorProps {
  trainSet: IrisData[] | null;
  modelState: TrainedModel | null;
  onInjectDataPoint: (point: IrisData) => void;
}

export function Predictor({ trainSet, modelState, onInjectDataPoint }: PredictorProps) {
  const [inputs, setInputs] = useState<Omit<IrisData, 'species'>>({
    sepal_length: 5.1,
    sepal_width: 3.5,
    petal_length: 1.4,
    petal_width: 0.2
  });
  const [injectHover, setInjectHover] = useState<boolean>(false);
  const [history, setHistory] = useState<LoggedPrediction[]>([]);
  
  const [result, setResult] = useState<AdvancedPredictionResult | null>(null);
  const [latency, setLatency] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch(e) {
      console.error(e);
    }
  }, []);

  const isModelReady = trainSet !== null && modelState !== null;

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const performPrediction = useCallback(async () => {
    if (!isModelReady) return;
    setIsPredicting(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point: inputs })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setLatency(data.latencyMs);
        fetchHistory();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsPredicting(false);
    }
  }, [inputs, isModelReady, fetchHistory]);

  // Debounce API calls for sliders
  useEffect(() => {
    const handler = setTimeout(() => {
      performPrediction();
    }, 150);
    return () => clearTimeout(handler);
  }, [inputs, performPrediction]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof Omit<IrisData, 'species'>) => {
    setInputs({...inputs, [key]: parseFloat(e.target.value)});
  };
    
  const prediction = result?.prediction;
  const neighbors = result?.neighbors || [];

  const handleInject = () => {
    if (prediction) {
       onInjectDataPoint({
         ...inputs,
         species: prediction as Species
       });
    }
  };

  // Prepare radar chart data matching inputs vs predicted average/centroid
  const radarData = Object.keys(featureLabels).map((key) => {
    const featureName = key as keyof Omit<IrisData, 'species'>;
    let avg = 0;
    
    if (isModelReady && prediction) {
      if (modelState.type === 'centroid') {
         const centroid = modelState.centroids?.find(c => c.species === prediction);
         avg = centroid ? centroid[featureName] : 0;
      } else {
         const sameClassData = trainSet.filter(d => d.species === prediction);
         avg = sameClassData.reduce((sum, d) => sum + d[featureName], 0) / (sameClassData.length || 1);
      }
    }

    return {
      subject: featureLabels[featureName].split(' ')[0],
      fullSubject: featureLabels[featureName],
      UserValue: inputs[featureName],
      SpeciesAvg: avg
    };
  });

  const handleBatchPredict = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isModelReady || !trainSet) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.trim().split('\n');
        
        let headerRow = rows[0].toLowerCase();
        const hasHeaders = headerRow.includes('sepal') || headerRow.includes('length');
        const dataRows = hasHeaders ? rows.slice(1) : rows;
        
        const validPoints: any[] = [];
        const validRows: string[] = [];

        dataRows.forEach(row => {
           const cols = row.split(',').map(s => s.trim());
           if (cols.length >= 4) {
              const sl = parseFloat(cols[0]);
              const sw = parseFloat(cols[1]);
              const pl = parseFloat(cols[2]);
              const pw = parseFloat(cols[3]);
              
              if (!isNaN(sl) && !isNaN(sw) && !isNaN(pl) && !isNaN(pw)) {
                 const pt = { sepal_length: sl, sepal_width: sw, petal_length: pl, petal_width: pw };
                 validPoints.push(pt);
                 validRows.push(`${sl},${sw},${pl},${pw}`);
              }
           }
        });

        // Backend call for batch prediction
        if (validPoints.length > 0) {
          const res = await fetch('/api/batch-predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: validPoints })
          });
          if (res.ok) {
             const data = await res.json();
             const resultsCSV = ['sepal_length,sepal_width,petal_length,petal_width,predicted_species'];
             data.results.forEach((predObj: any, idx: number) => {
                resultsCSV.push(`${validRows[idx]},${predObj.prediction}`);
             });
             
             const blob = new Blob([resultsCSV.join('\n')], { type: 'text/csv;charset=utf-8;' });
             const url = URL.createObjectURL(blob);
             const link = document.createElement('a');
             link.href = url;
             link.download = `batch_predictions_${new Date().getTime()}.csv`;
             link.click();
             URL.revokeObjectURL(url);
             
             fetchHistory();
          }
        }
      } catch (err) {
        console.error("Failed to parse CSV for batch prediction", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-xl text-gray-900">Live Predictor & Insights</h3>
              {isModelReady && (
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded transition-colors border border-amber-200 cursor-pointer">
                  <FileUp className="w-3 h-3" />
                  Batch CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleBatchPredict} />
                </label>
              )}
              {latency && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded ml-auto">
                   Backend Latency: {latency}ms
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">Adjust measurements to classify the flower dynamically via API.</p>
          </div>
        </div>
        {isModelReady && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border border-emerald-100">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             {modelState.type === 'knn' ? <Network className="w-4 h-4"/> : modelState.type === 'dtree' ? <GitBranch className="w-4 h-4"/> : <Sigma className="w-4 h-4" />}
             {modelState.type === 'knn' ? `KNN Connected` : modelState.type === 'dtree' ? 'Tree Connected' : 'Centroid Connected'}
          </div>
        )}
      </div>
      
      {!isModelReady && (
        <div className="bg-amber-50 text-amber-800 p-5 rounded-xl mb-10 text-sm border border-amber-200 flex items-start gap-3">
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold mb-1">Model Not Trained</p>
            <p className="text-amber-700/80">Please ensure the model is trained in the 'Train Model' tab before making predictions.</p>
          </div>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-12 transition-opacity duration-300 ${!isModelReady ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Left Col: Sliders */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center gap-8 bg-gray-50 p-6 rounded-xl border border-gray-100 relative">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Input Features</h4>
          {(Object.entries(featureLabels) as [keyof Omit<IrisData, 'species'>, string][]).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-gray-700">{label}</label>
                <div className="bg-white border rounded px-2 py-1 text-sm font-mono font-bold text-violet-600 shadow-sm w-16 text-center">
                  {inputs[key].toFixed(1)}
                </div>
              </div>
              <input 
                type="range" 
                min={key.includes('length') ? 0.5 : 0.1} 
                max={key.includes('length') ? 10 : 4} 
                step="0.1"
                value={inputs[key]}
                onChange={(e) => handleSliderChange(e, key)}
                className="accent-violet-600 cursor-pointer w-full"
                disabled={!isModelReady}
              />
            </div>
          ))}
        </div>
        
        {/* Right Col: Visualization */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-start py-6 gap-8">
          <div className="flex items-center justify-between w-full">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider items-start">Classification Target</h4>
            <div className="flex items-center gap-2">
              {isModelReady && prediction && (
                <button 
                   onMouseEnter={() => setInjectHover(true)}
                   onMouseLeave={() => setInjectHover(false)}
                   onClick={handleInject}
                   className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-violet-100 text-violet-700 hover:bg-violet-200 rounded-lg transition-colors border border-violet-200 active:scale-95"
                >
                   <Plus className="w-3.5 h-3.5" />
                   Inject Data
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-6 items-center justify-center w-full">
            <div 
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all duration-500 transform ${!isModelReady ? 'bg-gray-200 scale-95 shadow-none' : injectHover ? 'scale-110 shadow-2xl ring-4 ring-violet-200' : 'hover:scale-105'}`}
              style={{ backgroundColor: prediction ? speciesColors[prediction as Species] : undefined }}
            >
              {isPredicting ? (
                <Loader2 className="w-10 h-10 mb-2 animate-spin opacity-90" />
              ) : (
                <Flower2 className="w-10 h-10 mb-2 opacity-90" />
              )}
              <span className="text-2xl font-bold tracking-tight capitalize drop-shadow-md">
                {prediction ? prediction : 'Unknown'}
              </span>
            </div>

            {isModelReady && (
              <div className="w-full h-48 border rounded-xl bg-gray-50/50 shadow-inner flex items-center justify-center p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="fullSubject" tick={{fill: '#6b7280', fontSize: 10}} />
                    <PolarRadiusAxis angle={30} domain={[0, 8]} axisLine={false} tick={false} />
                    <Radar name="Input Values" dataKey="UserValue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    {prediction && (
                       <Radar name={`${prediction} Avg`} dataKey="SpeciesAvg" stroke={speciesColors[prediction as Species]} fill={speciesColors[prediction as Species]} fillOpacity={0.2} strokeDasharray="3 3"/>
                    )}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {neighbors.length > 0 && modelState?.type === 'knn' && (
              <div className="w-full flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm border max-h-48 overflow-y-auto">
                <h5 className="text-xs font-semibold text-gray-500 mb-2 uppercase flex-1">K-Nearest Neighbors</h5>
                {neighbors.map((n, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: speciesColors[n.species as Species] }}></span>
                       <span className="capitalize font-medium text-gray-700">{n.species}</span>
                     </div>
                     <span className="text-xs text-gray-400 font-mono text-right">{n.distance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {neighbors.length > 0 && modelState?.type === 'centroid' && (
              <div className="w-full flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm border max-h-48 overflow-y-auto">
                <h5 className="text-xs font-semibold text-gray-500 mb-2 uppercase flex-1">Centroid Distance Ranking</h5>
                {neighbors.map((n, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: speciesColors[n.species as Species] }}></span>
                       <span className="capitalize font-medium text-gray-700">{n.species}</span>
                     </div>
                     <span className="text-xs text-gray-400 font-mono text-right">{n.distance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {neighbors.length > 0 && modelState?.type === 'dtree' && (
              <div className="w-full flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm border max-h-48 overflow-y-auto">
                <h5 className="text-xs font-semibold text-gray-500 mb-2 uppercase flex-1">Decision Path Evaluated</h5>
                {neighbors.map((n, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2">
                       <GitBranch className="w-4 h-4 text-gray-400" />
                       <span className="font-mono text-gray-700 text-xs">Node {i + 1}</span>
                     </div>
                     <span className="text-xs text-gray-600 font-mono text-right bg-gray-50 px-2 py-1 rounded">Threshold {n.distance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {injectHover && (
            <p className="text-xs text-gray-400 max-w-sm text-center animate-in fade-in slide-in-from-top-1">
              Injecting this data point with class "{prediction}" will permanently append it to the dataset. The tables, plots, and models will dynamically update.
            </p>
          )}
        </div>
      </div>

      {/* History Log Section */}
      <div className="mt-12 pt-8 border-t animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Backend Prediction History Log</h3>
          <button 
             onClick={fetchHistory}
             className="ml-auto text-xs flex items-center gap-1 font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
          >
             Refresh
          </button>
        </div>
        
        {history.length > 0 ? (
          <div className="border rounded-xl bg-white shadow-sm overflow-hidden border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Model Engine</th>
                    <th className="px-5 py-3">Measurements</th>
                    <th className="px-5 py-3">Backend Output</th>
                    <th className="px-5 py-3 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-gray-400 font-mono text-xs">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-gray-700 capitalize">
                        {item.modelInfo}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-gray-600">
                        [{item.inputs.sepal_length}, {item.inputs.sepal_width}, {item.inputs.petal_length}, {item.inputs.petal_width}]
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${speciesColors[item.prediction]}15`, color: speciesColors[item.prediction] }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: speciesColors[item.prediction] }}></span>
                          <span className="capitalize">{item.prediction}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right font-mono text-xs text-emerald-600">
                        {item.latencyMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 text-sm">
             No predictions recorded by the backend yet.
          </div>
        )}
      </div>
    </div>
  );
}
