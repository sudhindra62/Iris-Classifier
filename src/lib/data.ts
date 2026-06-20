import { IrisData, Species } from '../types';

export const IRIS_URL = 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv';

export async function loadIrisData(): Promise<IrisData[]> {
  const res = await fetch(IRIS_URL);
  if (!res.ok) throw new Error('Failed to fetch dataset');
  const text = await res.text();
  const rows = text.trim().split('\n').slice(1);
  
  const parsedData = rows.map(row => {
    const [sl, sw, pl, pw, sp] = row.split(',');
    return {
      sepal_length: parseFloat(sl),
      sepal_width: parseFloat(sw),
      petal_length: parseFloat(pl),
      petal_width: parseFloat(pw),
      species: sp.trim() as Species
    };
  }).filter(d => !isNaN(d.sepal_length) && d.species);
  
  if (parsedData.length === 0) throw new Error('Empty data');
  
  // Deterministic pseudo-random shuffle based on index so the dataset is mixed up
  // but remains stable across reloads for consistent demo behavior
  for (let i = parsedData.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(i * 9999)) * (i + 1));
    [parsedData[i], parsedData[j]] = [parsedData[j], parsedData[i]];
  }
  
  return parsedData;
}
