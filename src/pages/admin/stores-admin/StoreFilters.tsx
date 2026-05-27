import { Search } from 'lucide-react';
import type { Category } from '../../../types/cms';
import type { StoreStatusFilter } from './storeAdmin.types';

interface StoreFiltersProps {
  searchTerm: string;
  categoryFilter: string;
  statusFilter: StoreStatusFilter;
  floorFilter: string;
  categories: Category[];
  availableFloors: string[];
  onSearchTermChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onStatusFilterChange: (value: StoreStatusFilter) => void;
  onFloorFilterChange: (value: string) => void;
}

export default function StoreFilters({
  searchTerm,
  categoryFilter,
  statusFilter,
  floorFilter,
  categories,
  availableFloors,
  onSearchTermChange,
  onCategoryFilterChange,
  onStatusFilterChange,
  onFloorFilterChange,
}: StoreFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="relative md:col-span-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Buscar por nome ou slug"
          className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
        />
      </div>

      <select
        value={categoryFilter}
        onChange={(event) => onCategoryFilterChange(event.target.value)}
        className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
      >
        <option value="all">Todas categorias</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value as StoreStatusFilter)}
        className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
      >
        <option value="all">Todos status</option>
        <option value="published">Publicadas</option>
        <option value="unpublished">Rascunho</option>
      </select>

      <select
        value={floorFilter}
        onChange={(event) => onFloorFilterChange(event.target.value)}
        className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
      >
        <option value="all">Todos pisos</option>
        {availableFloors.map((floor) => (
          <option key={floor} value={floor}>
            {floor}
          </option>
        ))}
      </select>
    </div>
  );
}
