import React, { useEffect, useState, useCallback } from 'react';
import { IrisData, EvaluationResult, ModelType, TrainedModel } from '../types';
import { Play, Settings2, Sigma, Network, GitBranch, Download, Upload, Activity, Loader2 } from 'lucide-react';

interface ModelTrainerProps {
  data: IrisData[];
  onModelTrained: (trainSet: IrisData[], modelState: TrainedModel) => void;
}

export function ModelTrainer({ data, onModelTrained }: ModelTrainerProps) {
  const [modelType, setModelType] = useState<ModelType>('knn');
  const [kValue, setKValue] = useState<number>(3);
  const [trainRatio, setTrainRatio] = useState<number>(0.8);
  
  const [results, setResults] = useState<EvaluationResult | null>(null);
  const [currentModel, setCurrentModel] = useState<TrainedModel | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [latency, setLatency] = useState<string | null>(null);

  const performTraining = useCallback(async () => {
    if (!data || data.length === 0) return;
    setIsTraining(true);
    try {
      const resp = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, trainRatio, modelType, kValue })
      });
      if (!resp.ok) throw new Error("Failed to train model on backend.");
      const resData = await resp.json();
      setResults(resData.evaluation);
      setCurrentModel(resData.modelState);
      setLatency(resData.latencyMs);
      onModelTrained(resData.trainSet, resData.modelState);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTraining(false);
    }
  }, [data, trainRatio, modelType, kValue, onModelTrained]);

  useEffect(() => {
    performTraining();
  }, [performTraining]);

  const handleExportModel = () => {
    if (!currentModel) return;
    const blob = new Blob([JSON.stringify(currentModel, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iris_model_${currentModel.type}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImportModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const importedModel = JSON.parse(text) as TrainedModel;
        if (importedModel.type) {
           setCurrentModel(importedModel);
           onModelTrained(data, importedModel);
           setModelType(importedModel.type);
           if (importedModel.kValue) setKValue(importedModel.kValue);
        }
      } catch (err) {
        console.error("Failed to import model", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col gap-6">
           <h3 className="font-semibold text-lg flex items-center gap-2 pb-2 border-b">
             <Settings2 className="w-5 h-5 text-gray-400" />
             Model Selection
           </h3>

           <div className="flex flex-col gap-3">
             <label className="text-sm font-semibold text-gray-700">Algorithm Type</label>
             <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setModelType('knn')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-all ${
                    modelType === 'knn' ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Network className="w-4 h-4 mb-1 opacity-80" />
                  <span className="font-semibold text-xs text-center">K-NN</span>
                </button>
                <button
                  onClick={() => setModelType('centroid')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-all ${
                    modelType === 'centroid' ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Sigma className="w-4 h-4 mb-1 opacity-80" />
                  <span className="font-semibold text-xs text-center leading-tight">Nearest<br/>Centroid</span>
                </button>
                <button
                  onClick={() => setModelType('dtree')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-all ${
                    modelType === 'dtree' ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <GitBranch className="w-4 h-4 mb-1 opacity-80" />
                  <span className="font-semibold text-xs text-center leading-tight">Decision<br/>Tree</span>
                </button>
             </div>
             <p className="text-xs text-gray-500 mt-1 h-12">
               {modelType === 'knn' 
                 ? 'Evaluates nearest neighbors to determine classification via majority voting.' 
                 : modelType === 'centroid' 
                 ? 'Calculates the center mass of each species and classifies by closest proximity.'
                 : 'Uses a tree-like model of decisions and their possible consequences based on thresholds.'}
             </p>
           </div>
           
           {modelType === 'knn' && (
             <div className="flex flex-col gap-2 pt-2 animate-in fade-in zoom-in-95">
               <label className="flex justify-between text-sm font-semibold text-gray-700">
                 <span>K-Neighbors ({kValue})</span>
               </label>
               <input 
                 type="range" 
                 min="1" max="15" step="2"
                 value={kValue} 
                 onChange={e => setKValue(parseInt(e.target.value))}
                 className="accent-violet-600 cursor-pointer"
               />
               <span className="text-xs text-gray-400">Number of nearest data points to consider for classification voting.</span>
             </div>
           )}
           
           <div className="flex flex-col gap-2 pt-2">
             <label className="flex justify-between text-sm font-semibold text-gray-700">
               <span>Train/Test Split</span>
               <span className="text-violet-600">{Math.round(trainRatio * 100)}% / {Math.round((1-trainRatio) * 100)}%</span>
             </label>
             <input 
               type="range" 
               min="0.5" max="0.95" step="0.05"
               value={trainRatio} 
               onChange={e => setTrainRatio(parseFloat(e.target.value))}
               className="accent-violet-600 cursor-pointer"
             />
             <span className="text-xs text-gray-400">Proportion of data allocated for training the model vs evaluating its accuracy.</span>
           </div>
           
           <button 
             onClick={performTraining}
             disabled={isTraining}
             className="mt-4 flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
           >
             {isTraining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
             {isTraining ? 'Training Backend Engine...' : 'Force Re-Train'}
           </button>
        </div>
      </div>
      
      <div className="w-full lg:w-2/3">
        {results ? (
          <div className="bg-white p-6 lg:p-8 rounded-xl border shadow-sm flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-end gap-2 -mb-4">
              {latency && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border mr-auto">
                   <Activity className="w-3.5 h-3.5 text-emerald-500" /> Server Latency: {latency}ms
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors border border-violet-100 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Import
                <input type="file" accept=".json" className="hidden" onChange={handleImportModel} />
              </label>
              <button 
                onClick={handleExportModel}
                className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
              >
                <Download className="w-3.5 h-3.5" /> Export Model State
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Evaluation Metrics</h3>
                <div className="bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 mr-2">Overall Accuracy:</span>
                  <span className="text-lg font-bold text-violet-900">{(results.accuracy * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 font-semibold text-gray-500 border-r text-left pl-6">Class (Species)</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Precision</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Recall</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">F1-Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['setosa', 'versicolor', 'virginica'].map((sp, idx) => (
                      <tr key={sp} className={idx !== 2 ? "border-b border-gray-100" : ""}>
                        <td className="px-4 py-3 font-semibold capitalize text-gray-700 bg-gray-50/50 border-r text-left pl-6">{sp}</td>
                        <td className="px-4 py-3 font-medium text-emerald-700">{(results.precision[sp as keyof typeof results.precision] * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 font-medium text-amber-700">{(results.recall[sp as keyof typeof results.recall] * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 font-medium text-blue-700">{(results.f1Score[sp as keyof typeof results.f1Score] * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-gray-800">Confusion Matrix</h3>
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 font-semibold text-gray-500 border-r">Actual \ Predicted</th>
                      <th className="px-4 py-3 font-semibold text-violet-600">Setosa</th>
                      <th className="px-4 py-3 font-semibold text-emerald-600">Versicolor</th>
                      <th className="px-4 py-3 font-semibold text-amber-600">Virginica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['setosa', 'versicolor', 'virginica'].map((actual, idx) => (
                      <tr key={actual} className={idx !== 2 ? "border-b border-gray-100" : ""}>
                        <td className="px-4 py-4 font-semibold capitalize text-gray-700 bg-gray-50/50 border-r text-left pl-6">{actual}</td>
                        {['setosa', 'versicolor', 'virginica'].map(predicted => {
                          const count = results.confusionMatrix[actual as any][predicted as any];
                          const isCorrect = actual === predicted;
                          return (
                            <td 
                              key={predicted} 
                              className={`px-4 py-4 font-bold text-lg ${
                                isCorrect && count > 0 ? 'bg-green-50 text-green-700' : 
                                count > 0 ? 'bg-red-50 text-red-700' : 'text-gray-300'
                              }`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-in fade-in">
             <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
               {isTraining ? <Loader2 className="w-6 h-6 animate-spin text-violet-600" /> : <Play className="w-6 h-6 text-gray-300 ml-1" />}
             </div>
             <h3 className="text-lg font-medium text-gray-600 mb-2">Ready to Train</h3>
             <p className="max-w-xs text-sm">Configure your hyperparameters on the left and start training the model by connecting to the Express backend.</p>
          </div>
        )}
      </div>
    </div>
  );
}
