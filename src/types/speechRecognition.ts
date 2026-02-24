export type Status = 'idle' | 'listening' | 'processing' | 'result' | 'error' | 'unsupported'

export interface FoundNumber {
  index: number
  value: number
}

export type Response = {
  message?: string;
  error?: string;
}