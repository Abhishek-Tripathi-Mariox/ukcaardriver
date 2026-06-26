import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchAddress, AddressHit } from '../services/api';

interface AddressAutocompleteProps {
  label: string;
  value: string;
  placeholder?: string;
  countryCodes?: string;
  onChangeText: (text: string) => void;
  onSelect: (hit: AddressHit) => void;
}

/**
 * Address input that calls /geo/autocomplete (Google Places via backend proxy)
 * after the user pauses typing. Tapping a suggestion fires `onSelect` with the
 * full hit (formatted address + lat/lng + parts) so the caller can store
 * structured data, not just the typed string.
 */
export function AddressAutocomplete({
  label,
  value,
  placeholder = 'Search your address',
  countryCodes = 'in',
  onChangeText,
  onSelect,
}: AddressAutocompleteProps) {
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when the user picks a suggestion. We use this to suppress the very
  // next debounce fire (which would otherwise re-search the address we just
  // wrote into the field).
  const justPickedRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    if (value.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAddress(value, countryCodes);
        setHits(results);
        setOpen(results.length > 0);
      } catch (err) {
        console.warn('[address-autocomplete] search failed:', err);
        setHits([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, countryCodes]);

  const handlePick = (hit: AddressHit) => {
    justPickedRef.current = true;
    onChangeText(hit.address);
    onSelect(hit);
    setHits([]);
    setOpen(false);
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-slate-800">{label}</Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#717182"
          onFocus={() => {
            if (hits.length > 0) setOpen(true);
          }}
          className="h-12 rounded-2xl bg-[#F3F3F5] px-3 text-base text-slate-900"
        />
        {loading && (
          <View className="absolute right-3 top-3.5">
            <ActivityIndicator size="small" color="#0097B3" />
          </View>
        )}
      </View>

      {open && hits.length > 0 && (
        <View className="mt-1 rounded-2xl border border-slate-200 bg-white">
          {hits.map((h, idx) => (
            <Pressable
              key={h.id}
              onPress={() => handlePick(h)}
              className={`px-3 py-3 ${
                idx < hits.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <Text className="text-sm text-slate-800" numberOfLines={2}>
                {h.address}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default AddressAutocomplete;
