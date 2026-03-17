export type DataType = 'string' | 'number' | 'boolean' | 'date';

export interface Column {
  key: string;
  name: string;
  type: DataType;
  visible: boolean;
  formula?: string;
}

export interface Dataset {
  id: string;
  name: string;
  sourceAgent: string;
  timestamp: number;
  data: any[];
  columns: Column[];
}

export interface Join {
  id: string;
  name: string;
  leftDatasetId: string;
  rightDatasetId: string;
  leftColumn: string;
  rightColumn: string;
  type: 'inner' | 'left';
}

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area';

export interface Visualization {
  id: string;
  datasetId: string;
  type: ChartType;
  title: string;
  shelves: {
    columns: string[]; // Dimensions/Measures on X
    rows: string[];    // Dimensions/Measures on Y
    color?: string;
    size?: string;
    label?: string;
    tooltip?: string[];
  };
}
