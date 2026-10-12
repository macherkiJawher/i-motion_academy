declare module 'bcryptjs' {
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hash(data: string, saltRounds: number): Promise<string>;
}
