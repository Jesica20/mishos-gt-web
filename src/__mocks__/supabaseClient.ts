type QueryResult = { data: any; error: any };

let nextResult: Promise<QueryResult> | QueryResult = { data: [], error: null };
let lastFrom: string | null = null;
let lastSelect: string | null = null;
let lastOrder: { column: string; opts: any } | null = null;

export const __supabaseMock = {
  setNextResult: (result: Promise<QueryResult> | QueryResult) => {
    nextResult = result;
  },
  getLastCall: () => ({ from: lastFrom, select: lastSelect, order: lastOrder }),
  reset: () => {
    nextResult = { data: [], error: null };
    lastFrom = null;
    lastSelect = null;
    lastOrder = null;
  },
};

export const supabase = {
  from: (table: string) => {
    lastFrom = table;
    return {
      select: (sel: string) => {
        lastSelect = sel;
        return {
          order: (column: string, opts: any) => {
            lastOrder = { column, opts };
            const result = nextResult;
            // reset a valor por defecto para no filtrar siguientes tests
            nextResult = { data: [], error: null };
            if (result instanceof Promise) return result;
            return Promise.resolve(result);
          },
        };
      },
    };
  },
};