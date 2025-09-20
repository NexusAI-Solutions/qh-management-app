// app/hooks/useProductVariants.ts
import { useState, useCallback } from 'react';
import type { ProductVariant } from '@/app/types/product';

interface UseProductVariantsProps {
  productId: number;
  initialVariants?: ProductVariant[];
}

interface UseProductVariantsReturn {
  variants: ProductVariant[];
  isLoading: boolean;
  error: string | null;
  fetchVariants: () => Promise<void>;
  createVariant: (title: string, ean?: string) => Promise<void>;
  updateVariant: (variantId: number, data: { title?: string; ean?: string | null }) => Promise<void>;
  deleteVariant: (variantId: number) => Promise<void>;
  reorderVariants: (reorderedVariants: Array<{ id: number; position: number }>) => Promise<void>;
  setVariants: (variants: ProductVariant[]) => void; // For optimistic updates
}

export function useProductVariants({ 
  productId, 
  initialVariants = [] 
}: UseProductVariantsProps): UseProductVariantsReturn {
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResponse = async (response: Response): Promise<ProductVariant[]> => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const fetchVariants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      const data = await handleResponse(response);
      setVariants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
      console.error('Error fetching variants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const createVariant = useCallback(async (title: string, ean?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, ean }),
      });
      const data = await handleResponse(response);
      setVariants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create variant');
      console.error('Error creating variant:', err);
      throw err; // Re-throw for the UI to handle
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const updateVariant = useCallback(async (
    variantId: number, 
    data: { title?: string; ean?: string | null }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const updatedVariants = await handleResponse(response);
      setVariants(updatedVariants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update variant');
      console.error('Error updating variant:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const deleteVariant = useCallback(async (variantId: number) => {
    setIsLoading(true);
    setError(null);
    
    // Optimistic update
    const previousVariants = variants;
    setVariants(prev => prev.filter(v => v.id !== variantId));
    
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'DELETE',
      });
      const updatedVariants = await handleResponse(response);
      setVariants(updatedVariants);
    } catch (err) {
      // Revert on error
      setVariants(previousVariants);
      setError(err instanceof Error ? err.message : 'Failed to delete variant');
      console.error('Error deleting variant:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [productId, variants]);

  const reorderVariants = useCallback(async (
    reorderedVariants: Array<{ id: number; position: number }>
  ) => {
    setIsLoading(true);
    setError(null);
    
    // Store previous state for rollback
    const previousVariants = variants;
    
    // Optimistic update - immediately update UI
    const variantMap = new Map(variants.map(v => [v.id, v]));
    const optimisticVariants = reorderedVariants
      .map(({ id, position }) => {
        const variant = variantMap.get(id);
        if (variant) {
          return { ...variant, position };
        }
        return null;
      })
      .filter((v): v is ProductVariant & { position: number } => v !== null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    setVariants(optimisticVariants);
    
    try {
      const response = await fetch(`/api/products/${productId}/variants/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variants: reorderedVariants }),
      });
      const updatedVariants = await handleResponse(response);
      setVariants(updatedVariants);
    } catch (err) {
      // Rollback on error
      setVariants(previousVariants);
      setError(err instanceof Error ? err.message : 'Failed to reorder variants');
      console.error('Error reordering variants:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [productId, variants]);

  return {
    variants,
    isLoading,
    error,
    fetchVariants,
    createVariant,
    updateVariant,
    deleteVariant,
    reorderVariants,
    setVariants,
  };
}