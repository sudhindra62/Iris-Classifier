import { IrisData, Species, EvaluationResult, ModelType, Centroid, TrainedModel, DTNode, AdvancedPredictionResult } from '../types';

const SPECIES: Species[] = ['setosa', 'versicolor', 'virginica'];

export function euclideanDistance(a: Omit<IrisData, 'species'>, b: Omit<IrisData, 'species'>): number {
  return Math.sqrt(
    Math.pow(a.sepal_length - b.sepal_length, 2) +
    Math.pow(a.sepal_width - b.sepal_width, 2) +
    Math.pow(a.petal_length - b.petal_length, 2) +
    Math.pow(a.petal_width - b.petal_width, 2)
  );
}

export function classifyKNN(point: Omit<IrisData, 'species'>, trainingSet: IrisData[], k: number): AdvancedPredictionResult {
  const distances = trainingSet.map(trainPoint => ({
    distance: euclideanDistance(point, trainPoint),
    species: trainPoint.species
  }));
  
  distances.sort((a, b) => a.distance - b.distance);
  const topK = distances.slice(0, k);
  
  const counts: Record<string, number> = {};
  for (const neighbor of topK) {
    counts[neighbor.species] = (counts[neighbor.species] || 0) + 1;
  }
  
  let maxCount = 0;
  let predictedSpecies: Species = 'setosa';
  
  for (const [species, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      predictedSpecies = species as Species;
    }
  }
  
  return {
    prediction: predictedSpecies,
    neighbors: topK
  };
}

export function trainNearestCentroid(trainingSet: IrisData[]): Centroid[] {
  return SPECIES.map(sp => {
    const spData = trainingSet.filter(d => d.species === sp);
    if (spData.length === 0) return { species: sp, sepal_length: 0, sepal_width: 0, petal_length: 0, petal_width: 0 };
    return {
      species: sp,
      sepal_length: spData.reduce((sum, d) => sum + d.sepal_length, 0) / spData.length,
      sepal_width: spData.reduce((sum, d) => sum + d.sepal_width, 0) / spData.length,
      petal_length: spData.reduce((sum, d) => sum + d.petal_length, 0) / spData.length,
      petal_width: spData.reduce((sum, d) => sum + d.petal_width, 0) / spData.length,
    };
  });
}

export function classifyNearestCentroid(point: Omit<IrisData, 'species'>, centroids: Centroid[]): AdvancedPredictionResult {
  const distances = centroids.map(c => ({
    distance: euclideanDistance(point, c as unknown as Omit<IrisData, 'species'>),
    species: c.species
  }));
  
  distances.sort((a, b) => a.distance - b.distance);
  
  return {
    prediction: distances[0].species,
    neighbors: distances // Treating centroid distances similarly to neighbors for UI sharing
  };
}

function calculateGini(data: IrisData[]): number {
  if (data.length === 0) return 0;
  const counts: Record<string, number> = { setosa: 0, versicolor: 0, virginica: 0 };
  for (const d of data) counts[d.species]++;
  let impurity = 1;
  for (const sp in counts) {
    const prob = counts[sp] / data.length;
    impurity -= prob * prob;
  }
  return impurity;
}

function splitData(data: IrisData[], feature: keyof Omit<IrisData, 'species'>, threshold: number) {
  const left: IrisData[] = [];
  const right: IrisData[] = [];
  for (const d of data) {
    if (d[feature] <= threshold) left.push(d);
    else right.push(d);
  }
  return { left, right };
}

export function trainDecisionTree(data: IrisData[], maxDepth: number = 3, currentDepth: number = 0): DTNode {
  const uniqueClasses = new Set(data.map(d => d.species));
  if (uniqueClasses.size === 1 || currentDepth === maxDepth || data.length < 2) {
      const counts: Record<string, number> = {};
      let majorClass: Species = 'setosa';
      let maxCount = 0;
      for (const d of data) {
          counts[d.species] = (counts[d.species] || 0) + 1;
          if (counts[d.species] > maxCount) {
             maxCount = counts[d.species];
             majorClass = d.species;
          }
      }
      return { isLeaf: true, prediction: majorClass };
  }
  
  let bestGini = Infinity;
  let bestFeature: keyof Omit<IrisData, 'species'> = 'sepal_length';
  let bestThreshold = 0;
  let bestSplits = { left: [] as IrisData[], right: [] as IrisData[] };
  
  const features: (keyof Omit<IrisData, 'species'>)[] = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'];
  
  for (const feature of features) {
     const values = data.map(d => d[feature]).sort((a,b)=>a-b);
     for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i+1]) / 2;
        const { left, right } = splitData(data, feature, threshold);
        
        if (left.length === 0 || right.length === 0) continue;
        
        const giniLeft = calculateGini(left);
        const giniRight = calculateGini(right);
        const weightedGini = (left.length / data.length) * giniLeft + (right.length / data.length) * giniRight;
        
        if (weightedGini < bestGini) {
           bestGini = weightedGini;
           bestFeature = feature;
           bestThreshold = threshold;
           bestSplits = { left, right };
        }
     }
  }
  
  if (bestGini === Infinity) {
      return { isLeaf: true, prediction: data[0].species };
  }
  
  return {
     isLeaf: false,
     feature: bestFeature,
     threshold: bestThreshold,
     left: trainDecisionTree(bestSplits.left, maxDepth, currentDepth + 1),
     right: trainDecisionTree(bestSplits.right, maxDepth, currentDepth + 1)
  }
}

export function classifyDecisionTree(point: Omit<IrisData, 'species'>, node: DTNode): AdvancedPredictionResult {
   let curr = node;
   const path = [];
   while (!curr.isLeaf) {
      const f = curr.feature!;
      const t = curr.threshold!;
      path.push({ species: 'versicolor' as Species, distance: t }); // Hack to store path info in 'neighbors' for UI display
      if (point[f] <= t) {
         if (curr.left) curr = curr.left; else break;
      } else {
         if (curr.right) curr = curr.right; else break;
      }
   }
   return {
      prediction: curr.prediction || 'setosa',
      neighbors: path.slice(0, 5) // Returning threshold path instead of neighbors
   }
}

export function makePrediction(point: Omit<IrisData, 'species'>, trainSet: IrisData[], modelState: TrainedModel): AdvancedPredictionResult {
  if (modelState.type === 'knn') {
    return classifyKNN(point, trainSet, modelState.kValue || 3);
  } else if (modelState.type === 'centroid') {
    return classifyNearestCentroid(point, modelState.centroids!);
  } else {
    return classifyDecisionTree(point, modelState.dtree!);
  }
}

export function trainAndEvaluate(data: IrisData[], trainRatio: number, modelType: ModelType, k: number): { trainSet: IrisData[], evaluation: EvaluationResult, modelState: TrainedModel } {
  const trainSize = Math.floor(data.length * trainRatio);
  const actualTrainSize = Math.max(modelType === 'knn' ? k : 1, trainSize);
  const trainSet = data.slice(0, actualTrainSize);
  const testSet = data.slice(actualTrainSize);
  
  let centroids: Centroid[] | undefined;
  let dtree: DTNode | undefined;
  
  if (modelType === 'centroid') {
    centroids = trainNearestCentroid(trainSet);
  } else if (modelType === 'dtree') {
    dtree = trainDecisionTree(trainSet, 4); // Max depth 4
  }
  
  const confusionMatrix: Record<Species, Record<Species, number>> = {
    setosa: { setosa: 0, versicolor: 0, virginica: 0 },
    versicolor: { setosa: 0, versicolor: 0, virginica: 0 },
    virginica: { setosa: 0, versicolor: 0, virginica: 0 },
  };
  
  let correct = 0;
  
  const modelState: TrainedModel = {
    type: modelType,
    kValue: modelType === 'knn' ? k : undefined,
    centroids,
    dtree
  };
  
  for (const point of testSet) {
    const { prediction } = makePrediction(point, trainSet, modelState);
    confusionMatrix[point.species][prediction]++;
    if (prediction === point.species) {
      correct++;
    }
  }
  
  const accuracy = testSet.length > 0 ? (correct / testSet.length) : 0;
  
  const precision: Record<Species, number> = { setosa: 0, versicolor: 0, virginica: 0 };
  const recall: Record<Species, number> = { setosa: 0, versicolor: 0, virginica: 0 };
  const f1Score: Record<Species, number> = { setosa: 0, versicolor: 0, virginica: 0 };
  
  for (const sp of SPECIES) {
    const truePositive = confusionMatrix[sp][sp];
    let falsePositive = 0;
    let falseNegative = 0;
    
    for (const actualSp of SPECIES) {
      if (actualSp !== sp) falsePositive += confusionMatrix[actualSp][sp];
      if (actualSp !== sp) falseNegative += confusionMatrix[sp][actualSp];
    }
    
    precision[sp] = (truePositive + falsePositive) > 0 ? truePositive / (truePositive + falsePositive) : 0;
    recall[sp] = (truePositive + falseNegative) > 0 ? truePositive / (truePositive + falseNegative) : 0;
    f1Score[sp] = (precision[sp] + recall[sp]) > 0 ? 2 * (precision[sp] * recall[sp]) / (precision[sp] + recall[sp]) : 0;
  }
  
  return {
    trainSet,
    evaluation: {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix
    },
    modelState
  };
}
