import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import Dashboard from './components/Dashboard'
import { EvmProvider } from './providers/EvmProvider'

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <EvmProvider>
        <Dashboard />
      </EvmProvider>
    </ChakraProvider>
  )
}

export default App
