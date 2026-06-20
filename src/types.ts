export type Species = 'setosa' | 'versicolor' | 'virginica';

export interface IrisData {
  sepal_length: number;
  sepal_width: number;
  petal_length: number;
  petal_width: number;
  species: Species;
}

export type FeatureKey = 'sepal_length' | 'sepal_width' | 'petal_length' | 'petal_width';

export interface EvaluationResult {
  accuracy: number;
  precision: Record<Species, number>;
  recall: Record<Species, number>;
  f1Score: Record<Species, number>;
  confusionMatrix: Record<Species, Record<Species, number>>;
}

export type ModelType = 'knn' | 'centroid' | 'dtree';

export interface Centroid {
  species: Species;
  sepal_length: number;
  sepal_width: number;
  petal_length: number;
  petal_width: number;
}

export interface DTNode {
  isLeaf: boolean;
  prediction?: Species;
  feature?: keyof Omit<IrisData, 'species'>;
  threshold?: number;
  left?: DTNode;
  right?: DTNode;
}

export interface TrainedModel {
  type: ModelType;
  kValue?: number;
  centroids?: Centroid[];
  dtree?: DTNode;
}

export interface AdvancedPredictionResult {
  prediction: Species;
  neighbors: { species: Species; distance: number }[];
}
