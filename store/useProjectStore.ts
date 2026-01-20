import { create } from 'zustand'
import { Place, Image } from '@/types'

interface ProjectState {
  // Selected place for map interaction
  selectedPlaceId: string | null
  setSelectedPlaceId: (id: string | null) => void

  // Places data
  places: Place[]
  setPlaces: (places: Place[]) => void
  addPlace: (place: Place) => void
  updatePlace: (id: string, updates: Partial<Place>) => void
  removePlace: (id: string) => void

  // Images data
  images: Image[]
  setImages: (images: Image[]) => void
  addImages: (images: Image[]) => void
  updateImage: (id: string, updates: Partial<Image>) => void

  // Processing state
  isProcessing: boolean
  setIsProcessing: (value: boolean) => void
  processingProgress: number
  setProcessingProgress: (value: number) => void

  // Filter state
  categoryFilter: string | null
  setCategoryFilter: (category: string | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedPlaceId: null,
  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),

  places: [],
  setPlaces: (places) => set({ places }),
  addPlace: (place) => set((state) => ({ places: [...state.places, place] })),
  updatePlace: (id, updates) =>
    set((state) => ({
      places: state.places.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removePlace: (id) =>
    set((state) => ({
      places: state.places.filter((p) => p.id !== id),
      selectedPlaceId: state.selectedPlaceId === id ? null : state.selectedPlaceId,
    })),

  images: [],
  setImages: (images) => set({ images }),
  addImages: (newImages) =>
    set((state) => ({ images: [...state.images, ...newImages] })),
  updateImage: (id, updates) =>
    set((state) => ({
      images: state.images.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  isProcessing: false,
  setIsProcessing: (value) => set({ isProcessing: value }),
  processingProgress: 0,
  setProcessingProgress: (value) => set({ processingProgress: value }),

  categoryFilter: null,
  setCategoryFilter: (category) => set({ categoryFilter: category }),
}))
