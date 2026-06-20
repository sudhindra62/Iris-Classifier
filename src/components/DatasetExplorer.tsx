import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { IrisData, FeatureKey } from '../types';
import { featureLabels, speciesColors, downloadCSV } from '../lib/utils';
import { Table, LayoutGrid, Download, BarChart2, Upload, Wand2, Grid3x3, LayoutTemplate } from 'lucide-react';

interface DatasetExplorerProps {
  data: IrisData[];
  onDataUpload?: (data: IrisData[]) => void;
}

export function DatasetExplorer({ data, onDataUpload }: DatasetExplorerProps) {
  const [xAxis, setXAxis] = useState<FeatureKey>('sepal_length');
  const [yAxis, setXAxis2] = useState<FeatureKey>('sepal_width'); // Keeping name yAxis for clarity internally
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'bar' | 'correlation' | 'pairplot'>('chart');
  
  const yAxisValue = yAxis as FeatureKey;

  const speciesList = ['setosa', 'versicolor', 'virginica'];
  
  const speciesCounts = speciesList.reduce((acc, curr) => {
    acc[curr] = data.filter(d => d.species === curr).length;
    return acc;
  }, {} as Record<string, number>);

  const avgFeatureData = speciesList.map(species => {
    const spData = data.filter(d => d.species === species);
    return {
      name: species.charAt(0).toUpperCase() + species.slice(1),
      sepal_length: Number((spData.reduce((sum, d) => sum + d.sepal_length, 0) / (spData.length || 1)).toFixed(2)),
      sepal_width: Number((spData.reduce((sum, d) => sum + d.sepal_width, 0) / (spData.length || 1)).toFixed(2)),
      petal_length: Number((spData.reduce((sum, d) => sum + d.petal_length, 0) / (spData.length || 1)).toFixed(2)),
      petal_width: Number((spData.reduce((sum, d) => sum + d.petal_width, 0) / (spData.length || 1)).toFixed(2))
    };
  });

  const handleGenerateSynthetic = () => {
     const syntheticData: IrisData[] = [];
     for(let i = 0; i < 15; i++) {
        const sp = speciesList[Math.floor(Math.random() * speciesList.length)] as any;
        const spData = data.filter(d => d.species === sp);
        if (spData.length === 0) continue;
        const randomItem = spData[Math.floor(Math.random() * spData.length)];
        syntheticData.push({
           sepal_length: Math.max(0.1, Number((randomItem.sepal_length + (Math.random() * 0.4 - 0.2)).toFixed(1))),
           sepal_width: Math.max(0.1, Number((randomItem.sepal_width + (Math.random() * 0.4 - 0.2)).toFixed(1))),
           petal_length: Math.max(0.1, Number((randomItem.petal_length + (Math.random() * 0.4 - 0.2)).toFixed(1))),
           petal_width: Math.max(0.1, Number((randomItem.petal_width + (Math.random() * 0.4 - 0.2)).toFixed(1))),
           species: sp
        });
     }
     if (onDataUpload) onDataUpload(syntheticData);
  };
  
  const calculateCorrelationMatrix = () => {
    const features: FeatureKey[] = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'];
    const matrix: Record<string, Record<string, number>> = {};
    
    features.forEach(f1 => {
      matrix[f1] = {};
      features.forEach(f2 => {
        const x = data.map(d => d[f1]);
        const y = data.map(d => d[f2]);
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const sumY2 = y.reduce((a, b) => a + b * b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        matrix[f1][f2] = denominator === 0 ? 0 : numerator / denominator;
      });
    });
    return { features, matrix };
  };

  const correlation = calculateCorrelationMatrix();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Toolbox & Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm items-center">
        <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start md:self-auto">
          <button 
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${viewMode === 'chart' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <LayoutGrid className="w-4 h-4" /> Scatter Plot
          </button>
          <button 
            onClick={() => setViewMode('bar')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${viewMode === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <BarChart2 className="w-4 h-4" /> Averages
          </button>
          <button 
            onClick={() => setViewMode('correlation')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${viewMode === 'correlation' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Grid3x3 className="w-4 h-4" /> Correlations
          </button>
          <button 
            onClick={() => setViewMode('pairplot')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${viewMode === 'pairplot' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <LayoutTemplate className="w-4 h-4" /> Scatter Matrix
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Table className="w-4 h-4" /> Data Table
          </button>
        </div>

        {viewMode === 'chart' && (
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">X-Axis</span>
              <select 
                value={xAxis} 
                onChange={(e) => setXAxis(e.target.value as FeatureKey)}
                className="rounded-md border border-gray-300 py-1 px-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-gray-50"
              >
                {Object.entries(featureLabels).map(([key, label]) => (
                   <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Y-Axis</span>
              <select 
                value={yAxisValue} 
                onChange={(e) => setXAxis2(e.target.value as FeatureKey)}
                className="rounded-md border border-gray-300 py-1 px-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-gray-50"
              >
                {Object.entries(featureLabels).map(([key, label]) => (
                   <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <label className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors border border-emerald-100 cursor-pointer">
            <Upload className="w-4 h-4" /> Import CSV
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !onDataUpload) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const text = event.target?.result as string;
                    const rows = text.trim().split('\n').slice(1);
                    const parsed = rows.map(row => {
                      const [sl, sw, pl, pw, sp] = row.split(',');
                      return {
                        sepal_length: parseFloat(sl),
                        sepal_width: parseFloat(sw),
                        petal_length: parseFloat(pl),
                        petal_width: parseFloat(pw),
                        species: sp?.trim().toLowerCase() as any
                      };
                    }).filter(d => !isNaN(d.sepal_length) && ['setosa', 'versicolor', 'virginica'].includes(d.species));
                    if (parsed.length > 0) onDataUpload(parsed);
                  } catch (err) {
                    console.error("Failed to parse CSV", err);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>
          <button 
            onClick={() => downloadCSV(data)}
            className="flex items-center gap-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-lg transition-colors border border-violet-100"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={handleGenerateSynthetic}
            className="flex items-center gap-2 text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg transition-colors border border-amber-100"
          >
            <Wand2 className="w-4 h-4" /> Generate Synthetic
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="lg:w-3/4 flex flex-col gap-6">
          {viewMode === 'chart' ? (
            <div className="h-[500px] w-full border rounded-xl bg-white p-4 shadow-sm animate-in fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" dataKey={xAxis} name={featureLabels[xAxis]} tick={{fontSize: 12}} domain={['minData - 0.5', 'maxData + 0.5']} />
                  <YAxis type="number" dataKey={yAxisValue} name={featureLabels[yAxisValue]} tick={{fontSize: 12}} domain={['minData - 0.5', 'maxData + 0.5']} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  {speciesList.map((species) => (
                    <Scatter 
                      key={species}
                      name={species.charAt(0).toUpperCase() + species.slice(1)}
                      data={data.filter(d => d.species === species)}
                      fill={speciesColors[species]}
                      opacity={0.8}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : viewMode === 'bar' ? (
            <div className="h-[500px] w-full border rounded-xl bg-white p-4 shadow-sm animate-in fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgFeatureData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="sepal_length" name="Sepal Length" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sepal_width" name="Sepal Width" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="petal_length" name="Petal Length" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="petal_width" name="Petal Width" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : viewMode === 'correlation' ? (
            <div className="h-[500px] w-full border rounded-xl bg-white p-6 shadow-sm animate-in fade-in overflow-hidden flex flex-col">
              <h3 className="font-semibold text-lg text-gray-800 mb-4">Pearson Correlation Matrix</h3>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-center">
                  <thead>
                     <tr>
                        <th className="p-3 border-b border-r bg-gray-50 text-gray-500 font-medium">Features</th>
                        {correlation.features.map(f => (
                           <th key={f} className="p-3 border-b bg-gray-50 text-gray-700 font-semibold">{featureLabels[f]}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody>
                     {correlation.features.map(f1 => (
                        <tr key={f1}>
                           <td className="p-3 border-r bg-gray-50 text-gray-700 font-semibold">{featureLabels[f1]}</td>
                           {correlation.features.map(f2 => {
                              const value = correlation.matrix[f1][f2];
                              const absValue = Math.abs(value);
                              // Calculate color based on correlation strength (blue = positive, red = negative)
                              const color = value > 0 
                                 ? `rgba(139, 92, 246, ${absValue * 0.8})` // Violet for positive
                                 : `rgba(244, 63, 94, ${absValue * 0.8})`; // Rose for negative
                                 
                              const textColor = absValue > 0.5 ? 'text-white' : 'text-gray-800';
                              
                              return (
                                 <td 
                                   key={f2} 
                                   className={`p-4 font-mono transition-colors ${textColor}`}
                                   style={{ backgroundColor: f1 === f2 ? '#f9fafb' : color }}
                                 >
                                    {f1 === f2 ? '-' : value.toFixed(2)}
                                 </td>
                              )
                           })}
                        </tr>
                     ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-4">Correlation reveals linear relationships between features. Values near 1.0 or -1.0 indicate strong correlation.</p>
            </div>
          ) : viewMode === 'pairplot' ? (
            <div className="h-[650px] w-full border rounded-xl bg-white p-4 shadow-sm animate-in fade-in overflow-hidden flex flex-col">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Feature Scatter Matrix</h3>
              <div className="flex-1 overflow-auto grid grid-cols-4 gap-1 p-1 bg-gray-200 rounded-lg">
                {correlation.features.map(f1 => (
                   correlation.features.map(f2 => (
                      <div key={`${f1}-${f2}`} className="bg-white flex flex-col items-center justify-center" style={{ minHeight: '120px' }}>
                         {f1 === f2 ? (
                            <div className="text-center p-2">
                               <p className="text-xs font-bold text-gray-800 break-words">{featureLabels[f1]}</p>
                            </div>
                         ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <XAxis type="number" dataKey={f2} domain={['auto', 'auto']} hide />
                                <YAxis type="number" dataKey={f1} domain={['auto', 'auto']} hide />
                                {speciesList.map((species) => (
                                  <Scatter 
                                    key={species}
                                    data={data.filter(d => d.species === species)}
                                    fill={speciesColors[species]}
                                    opacity={0.6}
                                  />
                                ))}
                              </ScatterChart>
                            </ResponsiveContainer>
                         )}
                      </div>
                   ))
                ))}
              </div>
            </div>
          ) : (
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden animate-in fade-in flex flex-col max-h-[500px]">
              <div className="overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b sticky top-0 shadow-sm z-10 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Row</th>
                      <th className="px-6 py-4 font-semibold">{featureLabels.sepal_length}</th>
                      <th className="px-6 py-4 font-semibold">{featureLabels.sepal_width}</th>
                      <th className="px-6 py-4 font-semibold">{featureLabels.petal_length}</th>
                      <th className="px-6 py-4 font-semibold">{featureLabels.petal_width}</th>
                      <th className="px-6 py-4 font-semibold">Species Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-6 py-3 font-medium">{row.sepal_length.toFixed(1)}</td>
                        <td className="px-6 py-3 font-medium">{row.sepal_width.toFixed(1)}</td>
                        <td className="px-6 py-3 font-medium">{row.petal_length.toFixed(1)}</td>
                        <td className="px-6 py-3 font-medium">{row.petal_width.toFixed(1)}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${speciesColors[row.species]}15`, color: speciesColors[row.species] }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: speciesColors[row.species] }}></span>
                            <span className="capitalize">{row.species}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="lg:w-1/4 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Dataset Summary</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div className="text-sm text-gray-500">Total Samples</div>
                <div className="text-2xl font-bold text-gray-900">{data.length}</div>
              </div>
              
              <div className="space-y-3 pt-2">
                {speciesList.map(sp => (
                  <div key={sp} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium text-gray-700">{sp}</span>
                      <span className="font-semibold">{speciesCounts[sp]}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${(speciesCounts[sp] / data.length) * 100}%`, backgroundColor: speciesColors[sp] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-violet-50 to-white p-5 rounded-xl border border-violet-100 shadow-sm flex flex-col gap-3 justify-center items-center text-center">
             <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-1">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <h4 className="font-semibold text-violet-900">Dynamic Dataset</h4>
             <p className="text-xs text-violet-600/80">Changes from predictions or uploaded data will automatically reflect across all views.</p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
