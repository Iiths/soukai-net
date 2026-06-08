import { useRef, useEffect, useCallback } from 'react';
import type { Ninja } from '../domain/entities/Ninja';
import type { FilterCriteria, FilterRequest, FilterResponse } from '../workers/filterWorker';

type FilterCallback = (results: Ninja[]) => void;

export function useFilterWorker() {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef<Map<number, FilterCallback>>(new Map());

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/filterWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<FilterResponse>) => {
      const { id, results } = e.data;
      const cb = pendingRef.current.get(id);
      if (cb) {
        pendingRef.current.delete(id);
        cb(results);
      }
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const filter = useCallback(
    (criteria: FilterCriteria): Promise<Ninja[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve([]);
          return;
        }
        const id = ++requestIdRef.current;
        pendingRef.current.set(id, resolve);
        workerRef.current.postMessage({ id, criteria } satisfies FilterRequest);
      });
    },
    []
  );

  return filter;
}
