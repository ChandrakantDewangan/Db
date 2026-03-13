export type DataType = 'string' | 'number' | 'boolean' | 'date';

export interface Column {
  key: string;
  name: string;
  type: DataType;
  visible: boolean;
}

export interface Dataset {
  id: string;
  name: string;
  sourceAgent: string;
  timestamp: number;
  data: any[];
  columns: Column[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  tableData?: any[];
  tableName?: string;
}

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area';

export interface Visualization {
  id: string;
  datasetId: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
  title: string;
}
