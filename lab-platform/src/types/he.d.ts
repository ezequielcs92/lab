declare module 'he' {
  export interface DecodeOptions {
    isAttributeValue?: boolean
    strict?: boolean
  }

  export function decode(value: string, options?: DecodeOptions): string
}