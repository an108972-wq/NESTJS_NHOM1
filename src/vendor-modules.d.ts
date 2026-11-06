declare module 'bwip-js' {
  export function toBuffer(options: {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
  }): Promise<Buffer>;
}

declare module 'read-excel-file/node' {
  interface Sheet {
    rows: unknown[][];
  }

  function readXlsxFile(input: Buffer): Promise<Sheet[]>;
  export = readXlsxFile;
}
