interface SomeInterface {
  a: number;
  b?: string;
  c: number | undefined;
}

type SomeType = {
  d: number;
  e: SomeInterface;
  f: () => void;
};
