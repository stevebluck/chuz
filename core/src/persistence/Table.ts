import { Either, HashMap, Option } from "@chuz/prelude";

export class Table<K, V> {
  static empty<K, V>(): Table<K, V> {
    return new Table<K, V>(HashMap.empty<K, V>());
  }

  static of<K, V>(m: HashMap.HashMap<K, V>): Table<K, V> {
    return new Table<K, V>(m);
  }

  static fromArray<K, V>(entries: [K, V][]): Table<K, V> {
    return new Table<K, V>(HashMap.fromIterable(entries));
  }

  private constructor(private readonly saved: HashMap.HashMap<K, V>) {}

  find = (k: K): Option.Option<V> => {
    return HashMap.get(this.saved, k);
  };

  findMany = (ks: Array<K>): Array<V> => {
    return ks.reduce(
      (acc, k) =>
        this.find(k).pipe(
          Option.map((v) => [...acc, v]),
          Option.getOrElse(() => acc),
        ),
      [] as Array<V>,
    );
  };

  filter = (f: (k: K) => boolean): K[] => {
    return Array.from(HashMap.keys(this.saved)).filter((k) => f(k));
  };

  filterValues = (f: (v: V) => boolean): V[] => {
    return Array.from(HashMap.values(this.saved)).filter((v) => f(v));
  };

  filterEntries = (f: (k: K, v: V) => boolean): [K, V][] => {
    return Array.from(HashMap.entries(this.saved)).filter(([k, v]) => f(k, v));
  };

  modifyAt = <E>(k: K, f: (v: V) => V, e: E): [Either.Either<V, E>, Table<K, V>] => {
    return this.find(k).pipe(
      Option.match({
        onNone: () => [Either.left(e), this],
        onSome: (v) => {
          const updated = f(v);
          return [Either.right(updated), this.upsertAt(k, updated)];
        },
      }),
    );
  };

  upsertAt = (k: K, value: V): Table<K, V> => {
    return this.next(
      Option.match(this.find(k), {
        onSome: () => HashMap.modify(this.saved, k, () => value),
        onNone: () => HashMap.set(this.saved, k, value),
      }),
    );
  };

  upsertAtWith = (k: K, f: (v: V) => V, fallback: V): Table<K, V> => {
    return this.next(
      Option.match(this.find(k), {
        onSome: () => HashMap.modify(this.saved, k, f),
        onNone: () => HashMap.set(this.saved, k, fallback),
      }),
    );
  };

  upsertMany = (kvs: [K, V][]): Table<K, V> => {
    return this.next(kvs.reduce((acc, [key, value]) => HashMap.modify(acc, key, () => value), this.saved));
  };

  deleteAt = (k: K): Table<K, V> => {
    return new Table<K, V>(HashMap.remove(this.saved, k));
  };

  deleteMany = (ks: K[]): Table<K, V> => {
    return this.next(HashMap.removeMany(this.saved, ks));
  };

  contains = (k: K): boolean => {
    return HashMap.has(this.saved, k);
  };

  size = (): number => HashMap.size(this.saved);

  values = (): V[] => [...HashMap.values(this.saved)];

  entries = (): [K, V][] => [...HashMap.entries(this.saved)];

  private next = (m: HashMap.HashMap<K, V>): Table<K, V> => new Table(m);
}
