interface Draw {
  start: string;
  end: string;
}

interface Type {
  id?: number;
  bettypeid: number;
  name: string;
  limit?: number;
  capping?: number;
  wintar: number;
  winram: number;
  winram2: number;
  draws: Draw[];
  active?: boolean;
  maxlength?: number;
  cnt?: string;
  perc?: string;
  divisible?: boolean;
  start11?: number;
  start11m?: number;
  end11?: number;
  end11m?: number;
  start4?: number;
  start4m?: number;
  end4?: number;
  end4m?: number;
  start9?: number;
  start9m?: number;
  end9?: number;
  end9m?: number;
}

export default Type;
export type {Draw};
