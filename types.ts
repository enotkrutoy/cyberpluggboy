
export interface ProductImage {
  id: string;
  url: string;
  angle: string;
  description: string;
}

export enum GenerationState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GenerationStep {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}
