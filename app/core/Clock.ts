import { Data } from "effect";

export interface Timestamp {
  value: Date;
}
export const Timestamp = (value: Date) => Data.case<Timestamp>()({ value });
