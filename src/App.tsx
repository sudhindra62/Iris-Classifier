/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { loadIrisData } from './lib/data';
import { IrisData, TrainedModel } from './types';
import { DatasetExplorer } from './components/DatasetExplorer';
import { ModelTrainer } from './components/ModelTrainer';
import { Predictor } from './components/Predictor';
import { Brain, Database, LineChart, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<IrisData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dataset' | 'train' | 'predict'>('dataset');
  
  // Model state
  const [trainSet, setTrainSet] = useState<IrisData[] | null>(null);
  const [modelState, setModelState] = useState<TrainedModel | null>(null);

  const handleModelTrained = React.useCallback((ts: IrisData[], ms: TrainedModel) => {
    setTrainSet(ts);
    setModelState(ms);
  }, []);

  useEffect(() => {
    loadIrisData()
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg shadow-sm max-w-md w-full flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h3 className="font-bold text-gray-900">Error Loading Dataset</h3>
            <p className="text-gray-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4 bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="font-medium animate-pulse">Loading dataset...</p>
      </div>
    );
  }

  const handleInjectDataPoint = (point: IrisData) => {
    if (data) {
       setData([point, ...data]); // Insert at beginning so it appears in subsets 
       setActiveTab('dataset');
    }
  };

  const handleDataUpload = (uploadedData: IrisData[]) => {
    if (data) {
       setData([...uploadedData, ...data]);
    }
  };

  const handleResetData = () => {
    loadIrisData().then(setData);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans pb-24 selection:bg-violet-100 selection:text-violet-900">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 p-2 rounded-xl shadow-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">Iris Classifier</h1>
            <span className="text-xs font-medium bg-gray-100 text-gray-500 py-1 px-2 rounded-md hidden md:block">
              {data.length} Data Points
            </span>
            {data.length > 150 && (
              <button 
                onClick={handleResetData}
                className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors border border-rose-100 hidden md:block animate-in fade-in zoom-in"
              >
                Reset Data
              </button>
            )}
          </div>
          
          <nav className="flex bg-gray-100/80 backdrop-blur p-1 rounded-xl shadow-inner">
            <button 
              onClick={() => setActiveTab('dataset')}
              className={`px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'dataset' ? 'bg-white shadow relative text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
            >
              <Database className={`w-4 h-4 ${activeTab === 'dataset' ? 'text-violet-600' : ''}`} /> 
              <span className="hidden sm:inline">Explore</span> Data
            </button>
            <button 
              onClick={() => setActiveTab('train')}
              className={`px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'train' ? 'bg-white shadow relative text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
            >
              <LineChart className={`w-4 h-4 ${activeTab === 'train' ? 'text-violet-600' : ''}`} /> 
              Train <span className="hidden sm:inline">Model</span>
            </button>
            <button 
              onClick={() => setActiveTab('predict')}
              className={`px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'predict' ? 'bg-white shadow relative text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
            >
              <Brain className={`w-4 h-4 ${activeTab === 'predict' ? 'text-violet-600' : ''}`} /> 
              Predict
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
        <div className="mb-10 animate-in fade-in slide-in-from-top-2">
          <h2 className="text-3xl font-bold tracking-tight mb-3 text-gray-900">
             {activeTab === 'dataset' && 'Dataset Exploration'}
             {activeTab === 'train' && 'Model Training (KNN)'}
             {activeTab === 'predict' && 'Make a Prediction'}
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl text-balance">
             {activeTab === 'dataset' && 'Visualize geometric feature distributions and correlations across the three species of the classical Fisher Iris dataset.'}
             {activeTab === 'train' && 'Configure hyper-parameters, partition the dataset, and dynamically build the K-Nearest Neighbors classifier to evaluate boundaries.'}
             {activeTab === 'predict' && 'Adjust sepal and petal parameters to feed new dimensional data into the trained algorithm. You can also inject custom points back into the dataset!'}
          </p>
        </div>

        <div className="w-full relative">
          {activeTab === 'dataset' && <DatasetExplorer data={data} onDataUpload={handleDataUpload} />}
          {activeTab === 'train' && (
            <ModelTrainer 
              data={data} 
              onModelTrained={handleModelTrained} 
            />
          )}
          {activeTab === 'predict' && (
            <Predictor 
               trainSet={trainSet} 
               modelState={modelState} 
               onInjectDataPoint={handleInjectDataPoint}
            />
          )}
        </div>
      </main>
    </div>
  );
}
