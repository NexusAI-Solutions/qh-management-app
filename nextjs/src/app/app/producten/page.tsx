"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Package, ChevronLeft, ChevronRight } from "lucide-react"

// Mock product data
const generateProducts = () => {
  const categories = ["Verwarming", "Verlichting", "Ventilatie", "Isolatie", "Sanitair"]
  const brands = ["QH", "Philips", "Bosch", "Siemens", "Honeywell"]
  const products = []

  for (let i = 1; i <= 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    const brand = brands[Math.floor(Math.random() * brands.length)]

    products.push({
      id: i,
      title: `${brand} ${category} Product ${i.toString().padStart(3, "0")}`,
      ean: `87207260${i.toString().padStart(5, "0")}`,
      price: Math.floor(Math.random() * 500) + 20,
      category,
      brand,
      image: `/placeholder.svg?height=80&width=80&query=${category.toLowerCase()}+product`,
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

  const allProducts = useMemo(() => generateProducts(), [])

  // Filter products based on search and filters
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

      return matchesSearch && matchesCategory && matchesBrand && matchesStock
    })
  }, [allProducts, searchTerm, categoryFilter, brandFilter, stockFilter])

  // Paginate filtered products
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE)

  // Reset to page 1 when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1)
    switch (filterType) {
      case "category":
        setCategoryFilter(value)
        break
      case "brand":
        setBrandFilter(value)
        break
      case "stock":
        setStockFilter(value)
        break
    }
  }

  const categories = ["Verwarming", "Verlichting", "Ventilatie", "Isolatie", "Sanitair"]
  const brands = ["QH", "Philips", "Bosch", "Siemens", "Honeywell"]

  return (
    <div className="py-4 md:py-6 space-y-6">
      <div>
        <h1>Producten</h1>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
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

        {/* Expandable filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={categoryFilter} onValueChange={(value) => handleFilterChange("category", value)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle categorieën</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Select value={stockFilter} onValueChange={(value) => handleFilterChange("stock", value)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Voorraad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle producten</SelectItem>
              <SelectItem value="in-stock">Op voorraad</SelectItem>
              <SelectItem value="out-of-stock">Niet op voorraad</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || categoryFilter !== "all" || brandFilter !== "all" || stockFilter !== "all") && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setCategoryFilter("all")
                setBrandFilter("all")
                setStockFilter("all")
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
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b bg-white">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">Productcode</th>
                  <th className="text-left p-4 font-medium text-gray-900">Naam</th>
                  <th className="text-right p-4 font-medium text-gray-900">Prijs</th>
                  <th className="text-right p-4 font-medium text-gray-900">Voorraad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.title}
                          className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0"
                        />
                        <div className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                          {product.ean}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{product.title}</div>
                        {product.category === "Verwarming" && (
                          <Badge variant="secondary" className="text-xs">
                            Virtuele samenstelling
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">€ {product.price.toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{product.stock}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Products Grid - Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.title}
                  className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{product.title}</h3>
                      <p className="text-sm text-gray-500">{product.brand}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900">€ {product.price.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{product.ean}</code>
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={product.inStock ? "default" : "destructive"} className="text-xs">
                        {product.inStock ? "Op voorraad" : "Niet op voorraad"}
                      </Badge>
                      {product.inStock && <span className="text-xs text-gray-500">({product.stock} stuks)</span>}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
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
