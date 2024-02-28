import { Data } from "effect";

export class Timestamp extends Data.Class<{
  value: Date;
}> {}
