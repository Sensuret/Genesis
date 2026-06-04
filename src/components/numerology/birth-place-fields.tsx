"use client";

import { useEffect, useId } from "react";
import { Label } from "@/components/ui/input";
import { BIRTH_COUNTRIES, citiesForCountry } from "@/lib/geo/birth-places";
import { cn } from "@/lib/utils";

const selectCls =
  "mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm text-fg outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

type Props = {
  country: string;
  city: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
  optional?: boolean;
  className?: string;
};

export function BirthPlaceFields({
  country,
  city,
  onCountryChange,
  onCityChange,
  optional,
  className
}: Props) {
  const countryId = useId();
  const cityId = useId();
  const cities = citiesForCountry(country);
  const cityDisabled = !country.trim();

  useEffect(() => {
    if (!country.trim()) {
      if (city) onCityChange("");
      return;
    }
    if (city && cities.length > 0 && !cities.includes(city)) {
      onCityChange("");
    }
  }, [country, city, cities, onCityChange]);

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div>
        <Label>
          Country of birth {optional && <span className="text-fg-subtle">(optional)</span>}
        </Label>
        <select
          id={countryId}
          className={selectCls}
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
        >
          <option value="">Select country…</option>
          {BIRTH_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>
          City / region {optional && <span className="text-fg-subtle">(optional)</span>}
        </Label>
        <select
          id={cityId}
          className={cn(selectCls, cityDisabled && "cursor-not-allowed opacity-60")}
          value={city}
          disabled={cityDisabled}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="">{cityDisabled ? "Select country first" : "Select city…"}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
