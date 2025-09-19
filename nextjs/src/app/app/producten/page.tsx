"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Package, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Product {
  id: number
  title: string | null;
  brand: string | null;
  image?: string
}

interface ApiResponse {
  products: Product[]
  totalCount: number
  brands: string[]
  pagination: {
    page: number
    limit: number
    totalPages: number
  }
}

const PRODUCTS_PER_PAGE = 25

// Skeleton component for table rows
function TableRowSkeleton() {
  return (
    <tr>
      <td className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <Skeleton className="h-5 w-48" />
        </div>
      </td>
      <td className="p-6">
        <Skeleton className="h-5 w-24" />
      </td>
    </tr>
  )
}

// Skeleton component for mobile cards
function CardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProductsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [brandFilter, setBrandFilter] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PRODUCTS_PER_PAGE.toString()
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      if (brandFilter !== 'all') {
        params.append('brand', brandFilter)
      }

      // Fetch from API with authentication
      const response = await fetch(`/api/products?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookie-based auth
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Je bent niet ingelogd. Log opnieuw in om door te gaan.')
        } else if (response.status === 403) {
          throw new Error('Je hebt geen toegang tot deze gegevens.')
        } else {
          throw new Error('Fout bij het ophalen van producten')
        }
      }

      const data: ApiResponse = await response.json()

      setProducts(data.products)
      setTotalCount(data.totalCount)
      setTotalPages(data.pagination.totalPages)
      setAvailableBrands(data.brands)

      if (initialLoad) {
        setInitialLoad(false)
      }

    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, brandFilter, initialLoad])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1)
    switch (filterType) {
      case "brand":
        setBrandFilter(value)
        break
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounce
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value)
      setCurrentPage(1)
    }, 300)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showClearButton = searchTerm || brandFilter !== "all"

  return (
    <div className="py-4 md:py-6 space-y-6">
      <div>
        <h1>Producten</h1>
      </div>

      {/* Search and filter section - always visible */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
            <Input
              placeholder="Zoeken"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-white"
              disabled={initialLoad && loading}
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {!initialLoad ? (
              <>
                <span>
                  {totalCount} items • {currentPage} van {totalPages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                    className="h-8 w-8 p-0 bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0 || loading}
                    className="h-8 w-8 p-0 bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-32" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {!initialLoad ? (
            <>
              <Select 
                value={brandFilter} 
                onValueChange={(value) => handleFilterChange("brand", value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="Merk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle merken</SelectItem>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showClearButton && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSearchInput("")
                    setBrandFilter("all")
                    setCurrentPage(1)
                  }}
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  Wis filters
                </Button>
              )}
            </>
          ) : (
            <Skeleton className="h-10 w-full sm:w-[180px]" />
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Fout bij laden</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Button onClick={() => fetchProducts()} className="mt-4" variant="outline">
            Probeer opnieuw
          </Button>
        </div>
      )}

      {/* Desktop table view */}
      {!error && (
        <div className="hidden md:block">
          <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-6 font-medium text-gray-900">Product</th>
                    <th className="text-left p-6 font-medium text-gray-900">Merk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    // Show skeleton rows when loading
                    Array.from({ length: 10 }).map((_, index) => (
                      <TableRowSkeleton key={`skeleton-${index}`} />
                    ))
                  ) : products.length > 0 ? (
                    // Show actual products
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="p-6">
                          <Link
                            href={`/app/producten/${product.id}`}
                            className="flex items-center gap-4 group"
                            aria-label={`Ga naar product ${product.title}`}
                          >
                            <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 shadow-sm overflow-hidden relative">
                              <Image
                                src={product.image || "/74e6e7e382d0ff5d7773ca9a87e6f6f8817a68a6.jpeg"}
                                alt={product.title || "Product afbeelding"}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                {product.title}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="p-6">
                          <span className="text-sm font-medium text-gray-900">{product.brand}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Empty state
                    <tr>
                      <td colSpan={2} className="p-12 text-center">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Geen producten gevonden</h3>
                        <p className="mt-1 text-sm text-gray-500">Probeer je zoekopdracht of filters aan te passen.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      {!error && (
        <div className="md:hidden space-y-4">
          {loading ? (
            // Show skeleton cards when loading
            Array.from({ length: 10 }).map((_, index) => (
              <CardSkeleton key={`card-skeleton-${index}`} />
            ))
          ) : products.length > 0 ? (
            // Show actual product cards
            products.map((product) => (
              <Card key={product.id} className="overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <Link
                    href={`/app/producten/${product.id}`}
                    className="flex gap-4 group"
                    aria-label={`Ga naar product ${product.title}`}
                  >
                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 shadow-sm overflow-hidden relative">
                      <Image
                        src={product.image || "/331777d9e2a04a46bf61b1f6082a8ddc.png"}
                        alt={product.title || "Product afbeelding"}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                        {product.title}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>
                          Merk: <span className="font-medium text-gray-900">{product.brand}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            // Empty state for mobile
            <div className="text-center py-12 bg-white rounded-lg border">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geen producten gevonden</h3>
              <p className="mt-1 text-sm text-gray-500">Probeer je zoekopdracht of filters aan te passen.</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom pagination - only show when not loading and has multiple pages */}
      {!loading && !error && totalPages > 1 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {totalCount} items • {currentPage} van {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 w-8 p-0 bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}