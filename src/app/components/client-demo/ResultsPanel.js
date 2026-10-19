'use client'
import React, { useMemo } from 'react';
import PinnedResultsPanel from '../PinnedResultsPanel';
import { useOptimizer, ResourceState } from './OptimizerContext';

export default function ResultsPanel({ incoming }) {
  const { request, mutate, ready } = useOptimizer();
  const transport = useMemo(() => ({
    load: () => request('dashboard/merchandising'),
    save: body => mutate('dashboard/merchandising', body, 'PUT'),
    search: async query => {
      const data = await request(`dashboard/catalog?query=${encodeURIComponent(query)}`);
      return { products: (data.products || []).map(product => {
        const image = product.image || product.images?.[0];
        return { ...product, image: typeof image === 'string' ? image : image?.src || image?.url || '' };
      }) };
    },
  }), [request, mutate]);
  if (!ready) return <ResourceState />;
  return <PinnedResultsPanel title="סידור תוצאות" transport={transport} initialQuery={incoming} />;
}
