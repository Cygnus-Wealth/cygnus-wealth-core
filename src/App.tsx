import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import Dashboard from './components/Dashboard'

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Dashboard />
    </ChakraProvider>
  )
}

export default App
