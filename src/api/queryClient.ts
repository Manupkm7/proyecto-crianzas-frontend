import { QueryClient } from '@tanstack/react-query'

// Instancia única del cliente de React Query para toda la app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los datos son sensibles pero cambian poco durante una sesión de trabajo;
      // evitamos refetch agresivo y dejamos que las mutations invaliden lo que corresponda.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
