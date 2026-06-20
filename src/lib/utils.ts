import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IrisData } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const featureLabels: Record<string, string> = {
  sepal_length: 'Sepal Length (cm)',
  sepal_width: 'Sepal Width (cm)',
  petal_length: 'Petal Length (cm)',
  petal_width: 'Petal Width (cm)',
};

export const speciesColors: Record<string, string> = {
  setosa: '#8b5cf6', // Violet
  versicolor: '#10b981', // Emerald
  virginica: '#f59e0b', // Amber
};

export function downloadCSV(data: IrisData[], filename = 'iris_dataset.csv') {
  const headers = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'];
  const rows = data.map(d => headers.map(h => d[h as keyof IrisData]).join(','));
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
