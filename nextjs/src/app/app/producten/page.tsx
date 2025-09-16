"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Package, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

// Mock product data
const generateProducts = () => {
  const categories = ["Verwarming", "Verlichting", "Ventilatie", "Isolatie", "Sanitair"]
  const brands = ["QH", "Philips", "Bosch", "Siemens", "Honeywell"]
  const products = []

  for (let i = 1; i <= 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    const brand = brands[Math.floor(Math.random() * brands.length)]
    const avgPrice = Math.floor(Math.random() * 400) + 50
    const avgSales = Math.floor(Math.random() * 50) + 5

    products.push({
      id: i,
      title: `${brand} ${category} Product ${i.toString().padStart(3, "0")}`,
      ean: `87207260${i.toString().padStart(5, "0")}`,
      price: Math.floor(Math.random() * 500) + 20,
      category,
      brand,
      avgPrice, // Average selling price
      avgSales, // Average sales per month
      image: `/331777d9e2a04a46bf61b1f6082a8ddc.png`,
      inStock: Math.random() > 0.2,
      stock: Math.floor(Math.random() * 100),
    })
  }

  return products
}

const PRODUCTS_PER_PAGE = 25

export default function ProductsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [priceRangeFilter, setPriceRangeFilter] = useState("all")

  const allProducts = useMemo(() => generateProducts(), [])

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) || product.ean.includes(searchTerm)
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
      const matchesBrand = brandFilter === "all" || product.brand === brandFilter
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && product.inStock) ||
        (stockFilter === "out-of-stock" && !product.inStock)
      const matchesPriceRange =
        priceRangeFilter === "all" ||
        (priceRangeFilter === "0-100" && product.avgPrice <= 100) ||
        (priceRangeFilter === "100-250" && product.avgPrice > 100 && product.avgPrice <= 250) ||
        (priceRangeFilter === "250-500" && product.avgPrice > 250 && product.avgPrice <= 500) ||
        (priceRangeFilter === "500+" && product.avgPrice > 500)

      return matchesSearch && matchesCategory && matchesBrand && matchesStock && matchesPriceRange
    })
  }, [allProducts, searchTerm, categoryFilter, brandFilter, stockFilter, priceRangeFilter])

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE)

  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1)
    switch (filterType) {
      case "brand":
        setBrandFilter(value)
        break
      case "stock":
        setStockFilter(value)
        break
      case "priceRange":
        setPriceRangeFilter(value)
        break
    }
  }

  const brands = ["QH", "Philips", "Bosch", "Siemens", "Honeywell"]

  return (
    <div className="py-4 md:py-6 space-y-6">
      <div>
        <h1>Producten</h1>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
            <Input
              placeholder="Zoeken"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 bg-white"
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {filteredProducts.length} items • {currentPage} van {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={brandFilter} onValueChange={(value) => handleFilterChange("brand", value)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Merk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle merken</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchTerm ||
            categoryFilter !== "all" ||
            brandFilter !== "all" ||
            stockFilter !== "all" ||
            priceRangeFilter !== "all") && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setCategoryFilter("all")
                setBrandFilter("all")
                setStockFilter("all")
                setPriceRangeFilter("all")
                setCurrentPage(1)
              }}
              className="w-full sm:w-auto"
            >
              Wis filters
            </Button>
          )}
        </div>
      </div>

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
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="p-6">
                      <Link
                        href={`/app/producten/${product.id}`}
                        className="flex items-center gap-4 group"
                        aria-label={`Ga naar product ${product.title}`}
                      >
                        <img
                          src={product.image || "/331777d9e2a04a46bf61b1f6082a8ddc.png"}
                          alt={product.title}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0 shadow-sm"
                        />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {paginatedProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden shadow-sm">
            <CardContent className="p-4">
              <Link
                href={`/app/producten/${product.id}`}
                className="flex gap-4 group"
                aria-label={`Ga naar product ${product.title}`}
              >
                <img
                  src={product.image || "/331777d9e2a04a46bf61b1f6082a8ddc.png"}
                  alt={product.title}
                  className="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0 shadow-sm"
                />
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
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen producten gevonden</h3>
          <p className="mt-1 text-sm text-gray-500">Probeer je zoekopdracht of filters aan te passen.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredProducts.length} items • {currentPage} van {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
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
