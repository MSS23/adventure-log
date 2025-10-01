'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  searchCountries,
  getPopularCountries,
  getCountryByCode,
  formatCountryDisplay,
  Country
} from '@/lib/countries'

interface CountrySearchProps {
  value?: string // Country code
  onChange: (countryCode: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
  showPopular?: boolean
  allowClear?: boolean
}

export function CountrySearch({
  value,
  onChange,
  placeholder = "Search countries...",
  disabled = false,
  error,
  className = "",
  showPopular = true,
  allowClear = true
}: CountrySearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Country[]>([])
  const [popularCountries] = useState(() => getPopularCountries())
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedCountry = value ? getCountryByCode(value) : undefined

  // Update search results when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchCountries(searchQuery, 8)
      setSearchResults(results)
      setHighlightedIndex(0)
    } else {
      setSearchResults([])
      setHighlightedIndex(-1)
    }
  }, [searchQuery])

  // Reset highlighted index when opening/closing
  useEffect(() => {
    if (open) {
      setHighlightedIndex(-1)
    }
  }, [open])

  const handleSelect = (country: Country) => {
    onChange(country.code)
    setOpen(false)
    setSearchQuery("")
    setHighlightedIndex(-1)
  }

  const handleClear = () => {
    onChange(undefined)
    setSearchQuery("")
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return

    const availableOptions = searchResults.length > 0 ? searchResults : (showPopular ? popularCountries : [])

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < availableOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : availableOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && availableOptions[highlightedIndex]) {
          handleSelect(availableOptions[highlightedIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        setSearchQuery("")
        break
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={`w-full justify-between ${error ? 'border-red-500' : ''}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedCountry ? (
                <>
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span className="truncate">{selectedCountry.name}</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{placeholder}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {selectedCountry && allowClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  aria-label="Clear selection"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Type to search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 p-2 shadow-none outline-none ring-0 focus-visible:ring-0"
                autoFocus
              />
            </div>
            <CommandList className="max-h-[300px]">
              {searchResults.length > 0 ? (
                <CommandGroup heading="Search Results">
                  {searchResults.map((country, index) => (
                    <CommandItem
                      key={country.code}
                      value={country.code}
                      onSelect={() => handleSelect(country)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                        highlightedIndex === index ? 'bg-accent' : ''
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-sm text-muted-foreground">{country.code}</span>
                      {selectedCountry?.code === country.code && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : searchQuery ? (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  No countries found for &quot;{searchQuery}&quot;
                </CommandEmpty>
              ) : showPopular ? (
                <CommandGroup heading="Popular Destinations">
                  {popularCountries.slice(0, 15).map((country, index) => (
                    <CommandItem
                      key={country.code}
                      value={country.code}
                      onSelect={() => handleSelect(country)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                        highlightedIndex === index ? 'bg-accent' : ''
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-sm text-muted-foreground">{country.code}</span>
                      {selectedCountry?.code === country.code && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  Start typing to search countries
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {selectedCountry && (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-sm">
            {formatCountryDisplay(selectedCountry)}
          </Badge>
        </div>
      )}
    </div>
  )
}